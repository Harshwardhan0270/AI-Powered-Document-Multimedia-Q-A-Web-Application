from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Any
from app.models.document import FileType, ProcessingStatus


class TranscriptSegment(BaseModel):
    text: str
    start: float
    end: float


class DocumentRead(BaseModel):
    id: str
    filename: str
    original_filename: str
    file_type: FileType
    file_size: int
    status: ProcessingStatus
    summary: Optional[str] = None
    duration_seconds: Optional[float] = None
    transcript_segments: Optional[list[dict]] = None
    error_message: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentUploadResponse(BaseModel):
    id: str
    original_filename: str
    file_type: FileType
    status: ProcessingStatus
    message: str


class DocumentStatus(BaseModel):
    id: str
    status: ProcessingStatus
    summary: Optional[str] = None
    error_message: Optional[str] = None
    transcript_segments: Optional[list[dict]] = None
