from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional, Any


class ChatSessionCreate(BaseModel):
    document_id: Optional[str] = None
    title: Optional[str] = "New Chat"


class ChatMessageRead(BaseModel):
    id: str
    role: str
    content: str
    timestamp_start: Optional[float] = None
    timestamp_end: Optional[float] = None
    sources: Optional[Any] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatSessionRead(BaseModel):
    id: str
    document_id: Optional[str] = None
    title: str
    created_at: datetime
    messages: list[ChatMessageRead] = []

    model_config = {"from_attributes": True}


class ChatRequest(BaseModel):
    session_id: str
    message: str

    @field_validator("message")
    @classmethod
    def message_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Message cannot be empty")
        if len(v) > 4000:
            raise ValueError("Message too long (max 4000 characters)")
        return v


class TimestampRef(BaseModel):
    start: float
    end: float
    text: str


class ChatResponse(BaseModel):
    message_id: str
    content: str
    timestamp_refs: Optional[list[TimestampRef]] = None
    sources: Optional[Any] = None
