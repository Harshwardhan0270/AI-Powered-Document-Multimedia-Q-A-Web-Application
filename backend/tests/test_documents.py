import io
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient


def make_pdf_bytes():
    """Minimal valid PDF bytes for testing."""
    return b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\n0 1\n0000000000 65535 f \ntrailer\n<< /Size 1 /Root 1 0 R >>\nstartxref\n9\n%%EOF"


@pytest.mark.asyncio
async def test_upload_pdf(client: AsyncClient, auth_headers):
    with patch("app.routers.documents.save_upload_file", new_callable=AsyncMock) as mock_save, \
         patch("app.routers.documents.process_document") as mock_process:
        mock_save.return_value = ("test.pdf", "/app/uploads/test.pdf", 1024)
        mock_process.return_value = None

        response = await client.post(
            "/api/documents/upload",
            headers=auth_headers,
            files={"file": ("test.pdf", make_pdf_bytes(), "application/pdf")},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["original_filename"] == "test.pdf"
        assert data["file_type"] == "pdf"
        assert data["status"] == "pending"


@pytest.mark.asyncio
async def test_upload_audio(client: AsyncClient, auth_headers):
    with patch("app.routers.documents.save_upload_file", new_callable=AsyncMock) as mock_save, \
         patch("app.routers.documents.process_document"):
        mock_save.return_value = ("audio.mp3", "/app/uploads/audio.mp3", 2048)

        response = await client.post(
            "/api/documents/upload",
            headers=auth_headers,
            files={"file": ("audio.mp3", b"fake audio data", "audio/mpeg")},
        )
        assert response.status_code == 201
        assert response.json()["file_type"] == "audio"


@pytest.mark.asyncio
async def test_upload_video(client: AsyncClient, auth_headers):
    with patch("app.routers.documents.save_upload_file", new_callable=AsyncMock) as mock_save, \
         patch("app.routers.documents.process_document"):
        mock_save.return_value = ("video.mp4", "/app/uploads/video.mp4", 4096)

        response = await client.post(
            "/api/documents/upload",
            headers=auth_headers,
            files={"file": ("video.mp4", b"fake video data", "video/mp4")},
        )
        assert response.status_code == 201
        assert response.json()["file_type"] == "video"


@pytest.mark.asyncio
async def test_upload_unsupported_type(client: AsyncClient, auth_headers):
    response = await client.post(
        "/api/documents/upload",
        headers=auth_headers,
        files={"file": ("file.exe", b"binary data", "application/octet-stream")},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_upload_unauthorized(client: AsyncClient):
    response = await client.post(
        "/api/documents/upload",
        files={"file": ("test.pdf", make_pdf_bytes(), "application/pdf")},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_documents_empty(client: AsyncClient, auth_headers):
    response = await client.get("/api/documents/", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_list_documents_after_upload(client: AsyncClient, auth_headers):
    with patch("app.routers.documents.save_upload_file", new_callable=AsyncMock) as mock_save, \
         patch("app.routers.documents.process_document"):
        mock_save.return_value = ("test.pdf", "/app/uploads/test.pdf", 1024)

        await client.post(
            "/api/documents/upload",
            headers=auth_headers,
            files={"file": ("test.pdf", make_pdf_bytes(), "application/pdf")},
        )

    response = await client.get("/api/documents/", headers=auth_headers)
    assert response.status_code == 200
    assert len(response.json()) == 1


@pytest.mark.asyncio
async def test_get_document_not_found(client: AsyncClient, auth_headers):
    response = await client.get("/api/documents/nonexistent-id", headers=auth_headers)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_document_status(client: AsyncClient, auth_headers):
    with patch("app.routers.documents.save_upload_file", new_callable=AsyncMock) as mock_save, \
         patch("app.routers.documents.process_document"):
        mock_save.return_value = ("test.pdf", "/app/uploads/test.pdf", 1024)

        upload_resp = await client.post(
            "/api/documents/upload",
            headers=auth_headers,
            files={"file": ("test.pdf", make_pdf_bytes(), "application/pdf")},
        )
        doc_id = upload_resp.json()["id"]

    response = await client.get(f"/api/documents/{doc_id}/status", headers=auth_headers)
    assert response.status_code == 200
    assert "status" in response.json()


@pytest.mark.asyncio
async def test_delete_document(client: AsyncClient, auth_headers):
    with patch("app.routers.documents.save_upload_file", new_callable=AsyncMock) as mock_save, \
         patch("app.routers.documents.process_document"), \
         patch("app.routers.documents.delete_file"), \
         patch("app.routers.documents.delete_faiss_index"):
        mock_save.return_value = ("test.pdf", "/app/uploads/test.pdf", 1024)

        upload_resp = await client.post(
            "/api/documents/upload",
            headers=auth_headers,
            files={"file": ("test.pdf", make_pdf_bytes(), "application/pdf")},
        )
        doc_id = upload_resp.json()["id"]

    response = await client.delete(f"/api/documents/{doc_id}", headers=auth_headers)
    assert response.status_code == 204
