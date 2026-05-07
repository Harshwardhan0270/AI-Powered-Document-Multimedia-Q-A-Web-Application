import json
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from jose import JWTError, jwt
from app.database import get_db
from app.models.user import User
from app.models.document import Document, ProcessingStatus
from app.models.chat import ChatSession, ChatMessage
from app.schemas.chat import (
    ChatSessionCreate, ChatSessionRead, ChatMessageRead, ChatRequest, ChatResponse
)
from app.core.security import get_current_user
from app.core.rate_limit import rate_limit
from app.services.llm_service import generate_answer
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/chat", tags=["chat"])


# ── SSE auth: token via query param (EventSource can't send headers) ────────
async def get_user_from_token_param(
    token: str = Query(..., min_length=10),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise credentials_exception
    return user


# ── Sessions ─────────────────────────────────────────────────────────────────

@router.post("/sessions", response_model=ChatSessionRead, status_code=status.HTTP_201_CREATED)
async def create_session(
    session_data: ChatSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if session_data.document_id:
        result = await db.execute(
            select(Document).where(
                Document.id == session_data.document_id,
                Document.owner_id == current_user.id,
            )
        )
        doc = result.scalar_one_or_none()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        if doc.status != ProcessingStatus.COMPLETED:
            raise HTTPException(status_code=400, detail="Document is still being processed")

    session = ChatSession(
        user_id=current_user.id,
        document_id=session_data.document_id,
        title=(session_data.title or "New Chat")[:100],
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return ChatSessionRead(
        id=session.id,
        document_id=session.document_id,
        title=session.title,
        created_at=session.created_at,
        messages=[],
    )


@router.get("/sessions", response_model=list[ChatSessionRead])
async def list_sessions(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.created_at.desc())
        .limit(limit)
    )
    sessions = result.scalars().all()
    return [
        ChatSessionRead(
            id=s.id,
            document_id=s.document_id,
            title=s.title,
            created_at=s.created_at,
            messages=[],
        )
        for s in sessions
    ]


@router.get("/sessions/{session_id}", response_model=ChatSessionRead)
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ChatSession)
        .options(selectinload(ChatSession.messages))
        .where(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


# ── Chat ──────────────────────────────────────────────────────────────────────

@router.post("/ask", response_model=ChatResponse)
async def ask_question(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(rate_limit),
):
    session = await _get_user_session(request.session_id, current_user.id, db)

    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at)
        .limit(20)  # cap history to last 20 messages
    )
    history = [{"role": m.role, "content": m.content} for m in history_result.scalars().all()]

    user_msg = ChatMessage(session_id=session.id, role="user", content=request.message)
    db.add(user_msg)
    await db.commit()

    result = await generate_answer(
        question=request.message,
        document_id=session.document_id,
        chat_history=history,
    )

    ts_refs = result.get("timestamp_refs", [])
    assistant_msg = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=result["content"],
        timestamp_start=ts_refs[0]["start"] if ts_refs else None,
        timestamp_end=ts_refs[0]["end"] if ts_refs else None,
        sources=result.get("sources"),
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)

    return ChatResponse(
        message_id=assistant_msg.id,
        content=result["content"],
        timestamp_refs=ts_refs or None,
        sources=result.get("sources"),
    )


@router.get("/ask/stream")
async def ask_question_stream(
    session_id: str = Query(...),
    message: str = Query(..., max_length=4000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_user_from_token_param),
    _: None = Depends(rate_limit),
):
    """SSE streaming endpoint. Auth via ?token= query param (EventSource limitation)."""
    if not message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    session = await _get_user_session(session_id, current_user.id, db)

    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at)
        .limit(20)
    )
    history = [{"role": m.role, "content": m.content} for m in history_result.scalars().all()]

    user_msg = ChatMessage(session_id=session.id, role="user", content=message.strip())
    db.add(user_msg)
    await db.commit()

    async def event_generator():
        full_content: list[str] = []
        try:
            stream = await generate_answer(
                question=message.strip(),
                document_id=session.document_id,
                chat_history=history,
                stream=True,
            )
            async for chunk in stream:
                full_content.append(chunk)
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"

            save_msg = ChatMessage(
                session_id=session.id,
                role="assistant",
                content="".join(full_content),
            )
            db.add(save_msg)
            await db.commit()
            yield f"data: {json.dumps({'done': True})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = await _get_user_session(session_id, current_user.id, db)
    await db.delete(session)
    await db.commit()


async def _get_user_session(session_id: str, user_id: str, db: AsyncSession) -> ChatSession:
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == user_id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return session
