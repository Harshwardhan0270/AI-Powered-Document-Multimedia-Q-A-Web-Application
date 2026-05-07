import pytest
import json
import tempfile
import os
from unittest.mock import AsyncMock, MagicMock, patch, mock_open
from app.services.pdf_service import extract_text_from_pdf, get_pdf_metadata
from app.services.file_service import detect_file_type, chunk_text_helper
from app.services.transcription_service import format_timestamp, format_transcript_for_llm
from app.services.vector_service import chunk_text
from app.models.document import FileType


# --- PDF Service Tests ---

def test_extract_text_from_pdf_success():
    mock_page = MagicMock()
    mock_page.extract_text.return_value = "Hello world"
    mock_reader = MagicMock()
    mock_reader.pages = [mock_page, mock_page]

    with patch("app.services.pdf_service.pypdf.PdfReader", return_value=mock_reader), \
         patch("builtins.open", mock_open(read_data=b"fake pdf")):
        result = extract_text_from_pdf("/fake/path.pdf")

    assert "Hello world" in result
    assert "[Page 1]" in result
    assert "[Page 2]" in result


def test_extract_text_from_pdf_empty_pages():
    mock_page = MagicMock()
    mock_page.extract_text.return_value = ""
    mock_reader = MagicMock()
    mock_reader.pages = [mock_page]

    with patch("app.services.pdf_service.pypdf.PdfReader", return_value=mock_reader), \
         patch("builtins.open", mock_open(read_data=b"fake pdf")):
        result = extract_text_from_pdf("/fake/path.pdf")

    assert result == ""


def test_get_pdf_metadata():
    mock_reader = MagicMock()
    mock_reader.pages = [MagicMock(), MagicMock()]
    mock_reader.metadata = {"/Title": "Test Doc", "/Author": "Test Author"}

    with patch("app.services.pdf_service.pypdf.PdfReader", return_value=mock_reader), \
         patch("builtins.open", mock_open(read_data=b"fake pdf")):
        meta = get_pdf_metadata("/fake/path.pdf")

    assert meta["num_pages"] == 2
    assert meta["title"] == "Test Doc"
    assert meta["author"] == "Test Author"


# --- File Service Tests ---

def test_detect_file_type_pdf():
    ft = detect_file_type("document.pdf", "application/pdf")
    assert ft == FileType.PDF


def test_detect_file_type_audio_mp3():
    ft = detect_file_type("audio.mp3", "audio/mpeg")
    assert ft == FileType.AUDIO


def test_detect_file_type_audio_wav():
    ft = detect_file_type("audio.wav", "audio/wav")
    assert ft == FileType.AUDIO


def test_detect_file_type_video_mp4():
    ft = detect_file_type("video.mp4", "video/mp4")
    assert ft == FileType.VIDEO


def test_detect_file_type_unsupported():
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        detect_file_type("file.exe", "application/octet-stream")
    assert exc_info.value.status_code == 400


# --- Transcription Service Tests ---

def test_format_timestamp_seconds():
    assert format_timestamp(0) == "00:00"
    assert format_timestamp(60) == "01:00"
    assert format_timestamp(90) == "01:30"
    assert format_timestamp(3661) == "61:01"


def test_format_transcript_for_llm():
    segments = [
        {"text": "Hello world", "start": 0.0, "end": 5.0},
        {"text": "How are you", "start": 5.0, "end": 10.0},
    ]
    result = format_transcript_for_llm(segments)
    assert "[00:00 - 00:05] Hello world" in result
    assert "[00:05 - 00:10] How are you" in result


def test_format_transcript_empty():
    result = format_transcript_for_llm([])
    assert result == ""


# --- Vector Service Tests ---

def test_chunk_text_basic():
    text = " ".join([f"word{i}" for i in range(100)])
    chunks = chunk_text(text, chunk_size=20, overlap=5)
    assert len(chunks) > 1
    assert all(isinstance(c, str) for c in chunks)


def test_chunk_text_short():
    text = "short text"
    chunks = chunk_text(text, chunk_size=100)
    assert len(chunks) == 1
    assert chunks[0] == "short text"


def test_chunk_text_empty():
    chunks = chunk_text("", chunk_size=100)
    assert chunks == []


def test_chunk_text_overlap():
    words = [f"w{i}" for i in range(30)]
    text = " ".join(words)
    chunks = chunk_text(text, chunk_size=10, overlap=3)
    # Verify overlap: last words of chunk N should appear in chunk N+1
    chunk0_words = set(chunks[0].split())
    chunk1_words = set(chunks[1].split())
    assert len(chunk0_words & chunk1_words) > 0


@pytest.mark.asyncio
async def test_get_embeddings():
    mock_embedding = [0.1] * 1536
    mock_response = MagicMock()
    mock_response.data = [MagicMock(embedding=mock_embedding)]

    with patch("app.services.vector_service.AsyncOpenAI") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client_cls.return_value = mock_client
        mock_client.embeddings.create = AsyncMock(return_value=mock_response)

        from app.services.vector_service import get_embeddings
        result = await get_embeddings(["test text"])

    assert len(result) == 1
    assert len(result[0]) == 1536


@pytest.mark.asyncio
async def test_generate_summary():
    mock_response = MagicMock()
    mock_response.choices = [MagicMock(message=MagicMock(content="This is a summary."))]

    with patch("app.services.llm_service.AsyncOpenAI") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client_cls.return_value = mock_client
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

        from app.services.llm_service import generate_summary
        result = await generate_summary("Long document text here...", "pdf")

    assert result == "This is a summary."


@pytest.mark.asyncio
async def test_generate_answer():
    mock_response = MagicMock()
    mock_response.choices = [MagicMock(message=MagicMock(content="The answer is 42."))]

    with patch("app.services.llm_service.search_faiss_index", new_callable=AsyncMock) as mock_search, \
         patch("app.services.llm_service.AsyncOpenAI") as mock_client_cls:
        mock_search.return_value = [{"text": "context chunk", "score": 0.9}]
        mock_client = AsyncMock()
        mock_client_cls.return_value = mock_client
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

        from app.services.llm_service import generate_answer
        result = await generate_answer("What is the answer?", "doc-id", [])

    assert result["content"] == "The answer is 42."
    assert "sources" in result
