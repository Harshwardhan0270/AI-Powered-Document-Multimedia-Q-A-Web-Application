import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.document import Document, FileType, ProcessingStatus


async def create_completed_document(db: AsyncSession, user_id: str) -> str:
    """Helper to insert a completed document directly into DB."""
    doc = Document(
        owner_id=user_id,
        filename="test.pdf",
        original_filename="test.pdf",
        file_type=FileType.PDF,
        file_size=1024,
        file_path="/app/uploads/test.pdf",
        status=ProcessingStatus.COMPLETED,
        extracted_text="This is test content about machine learning.",
        summary="A document about machine learning.",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc.id


@pytest.mark.asyncio
async def test_create_session_no_document(client: AsyncClient, auth_headers):
    response = await client.post("/api/chat/sessions", json={}, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["title"] == "New Chat"


@pytest.mark.asyncio
async def test_create_session_with_document(client: AsyncClient, auth_headers, test_db):
    # Get user id from token
    me_resp = await client.get("/api/auth/me", headers=auth_headers)
    user_id = me_resp.json()["id"]

    doc_id = await create_completed_document(test_db, user_id)

    response = await client.post(
        "/api/chat/sessions",
        json={"document_id": doc_id, "title": "Test Session"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["document_id"] == doc_id


@pytest.mark.asyncio
async def test_create_session_nonexistent_document(client: AsyncClient, auth_headers):
    response = await client.post(
        "/api/chat/sessions",
        json={"document_id": "nonexistent-id"},
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_sessions_empty(client: AsyncClient, auth_headers):
    response = await client.get("/api/chat/sessions", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_list_sessions(client: AsyncClient, auth_headers):
    await client.post("/api/chat/sessions", json={"title": "Session 1"}, headers=auth_headers)
    await client.post("/api/chat/sessions", json={"title": "Session 2"}, headers=auth_headers)

    response = await client.get("/api/chat/sessions", headers=auth_headers)
    assert response.status_code == 200
    assert len(response.json()) == 2


@pytest.mark.asyncio
async def test_get_session(client: AsyncClient, auth_headers):
    create_resp = await client.post("/api/chat/sessions", json={}, headers=auth_headers)
    session_id = create_resp.json()["id"]

    response = await client.get(f"/api/chat/sessions/{session_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["id"] == session_id


@pytest.mark.asyncio
async def test_get_session_not_found(client: AsyncClient, auth_headers):
    response = await client.get("/api/chat/sessions/nonexistent", headers=auth_headers)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_ask_question(client: AsyncClient, auth_headers, test_db):
    me_resp = await client.get("/api/auth/me", headers=auth_headers)
    user_id = me_resp.json()["id"]
    doc_id = await create_completed_document(test_db, user_id)

    session_resp = await client.post(
        "/api/chat/sessions",
        json={"document_id": doc_id},
        headers=auth_headers,
    )
    session_id = session_resp.json()["id"]

    with patch("app.routers.chat.generate_answer", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = {
            "content": "Machine learning is a subset of AI.",
            "timestamp_refs": [],
            "sources": [{"text": "test content", "score": 0.9}],
        }

        response = await client.post(
            "/api/chat/ask",
            json={"session_id": session_id, "message": "What is machine learning?"},
            headers=auth_headers,
        )

    assert response.status_code == 200
    data = response.json()
    assert "content" in data
    assert data["content"] == "Machine learning is a subset of AI."
    assert "message_id" in data


@pytest.mark.asyncio
async def test_ask_question_invalid_session(client: AsyncClient, auth_headers):
    response = await client.post(
        "/api/chat/ask",
        json={"session_id": "nonexistent", "message": "Hello"},
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_session(client: AsyncClient, auth_headers):
    create_resp = await client.post("/api/chat/sessions", json={}, headers=auth_headers)
    session_id = create_resp.json()["id"]

    response = await client.delete(f"/api/chat/sessions/{session_id}", headers=auth_headers)
    assert response.status_code == 204

    get_resp = await client.get(f"/api/chat/sessions/{session_id}", headers=auth_headers)
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_unauthorized_access(client: AsyncClient):
    response = await client.get("/api/chat/sessions")
    assert response.status_code == 401
