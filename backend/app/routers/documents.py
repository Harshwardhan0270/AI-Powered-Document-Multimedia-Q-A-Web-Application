import asyncio
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.document import Document, ProcessingStatus
from app.schemas.document import DocumentRead, DocumentUploadResponse, DocumentStatus
from app.core.security import get_current_user
from app.core.rate_limit import rate_limit
from app.services.file_service import save_upload_file, detect_file_type, delete_file
from app.services.processing_service import process_document

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(rate_limit),
):
    file_type = detect_file_type(file.filename, file.content_type)
    stored_filename, file_path, file_size = await save_upload_file(file, current_user.id)

    doc = Document(
        owner_id=current_user.id,
        filename=stored_filename,
        original_filename=file.filename,
        file_type=file_type,
        file_size=file_size,
        file_path=file_path,
        status=ProcessingStatus.PENDING,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    background_tasks.add_task(process_document, doc.id)

    return DocumentUploadResponse(
        id=doc.id,
        original_filename=doc.original_filename,
        file_type=doc.file_type,
        status=doc.status,
        message="File uploaded successfully. Processing started.",
    )


@router.get("/", response_model=list[DocumentRead])
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document)
        .where(Document.owner_id == current_user.id)
        .order_by(Document.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{document_id}", response_model=DocumentRead)
async def get_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = await _get_user_document(document_id, current_user.id, db)
    return doc


@router.get("/{document_id}/status", response_model=DocumentStatus)
async def get_document_status(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = await _get_user_document(document_id, current_user.id, db)
    return DocumentStatus(
        id=doc.id,
        status=doc.status,
        summary=doc.summary,
        error_message=doc.error_message,
        transcript_segments=doc.transcript_segments,
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = await _get_user_document(document_id, current_user.id, db)
    delete_file(doc.file_path)
    from app.services.vector_service import delete_faiss_index
    delete_faiss_index(document_id)
    await db.delete(doc)
    await db.commit()


@router.get("/{document_id}/stream")
async def stream_media(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Serve audio/video file for playback."""
    doc = await _get_user_document(document_id, current_user.id, db)
    return FileResponse(doc.file_path, media_type="application/octet-stream")


async def _get_user_document(document_id: str, user_id: str, db: AsyncSession) -> Document:
    result = await db.execute(
        select(Document).where(Document.id == document_id, Document.owner_id == user_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc
