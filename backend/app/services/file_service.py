import os
import uuid
import aiofiles
from pathlib import Path
from fastapi import UploadFile, HTTPException, status
from app.config import get_settings
from app.models.document import FileType

settings = get_settings()

ALLOWED_EXTENSIONS = {
    FileType.PDF: {".pdf"},
    FileType.AUDIO: {".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac"},
    FileType.VIDEO: {".mp4", ".mov", ".avi", ".mkv", ".webm"},
}

MIME_TO_TYPE = {
    "application/pdf": FileType.PDF,
    "audio/mpeg": FileType.AUDIO,
    "audio/wav": FileType.AUDIO,
    "audio/x-wav": FileType.AUDIO,
    "audio/mp4": FileType.AUDIO,
    "audio/ogg": FileType.AUDIO,
    "audio/flac": FileType.AUDIO,
    "audio/aac": FileType.AUDIO,
    "video/mp4": FileType.VIDEO,
    "video/quicktime": FileType.VIDEO,
    "video/x-msvideo": FileType.VIDEO,
    "video/x-matroska": FileType.VIDEO,
    "video/webm": FileType.VIDEO,
}


def detect_file_type(filename: str, content_type: str) -> FileType:
    ext = Path(filename).suffix.lower()
    for ftype, exts in ALLOWED_EXTENSIONS.items():
        if ext in exts:
            return ftype
    if content_type in MIME_TO_TYPE:
        return MIME_TO_TYPE[content_type]
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Unsupported file type: {ext}",
    )


# Alias for test imports
chunk_text_helper = detect_file_type


async def save_upload_file(upload_file: UploadFile, user_id: str) -> tuple[str, str, int]:
    """Save uploaded file and return (stored_filename, file_path, file_size)."""
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    upload_dir = Path(settings.UPLOAD_DIR) / user_id
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(upload_file.filename).suffix.lower()
    stored_filename = f"{uuid.uuid4()}{ext}"
    file_path = upload_dir / stored_filename

    file_size = 0
    async with aiofiles.open(file_path, "wb") as f:
        while chunk := await upload_file.read(1024 * 1024):  # 1MB chunks
            file_size += len(chunk)
            if file_size > max_bytes:
                await f.close()
                os.remove(file_path)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File too large. Max size is {settings.MAX_FILE_SIZE_MB}MB",
                )
            await f.write(chunk)

    return stored_filename, str(file_path), file_size


def delete_file(file_path: str):
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
    except OSError:
        pass
