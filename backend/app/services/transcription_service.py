import asyncio
from app.config import get_settings

settings = get_settings()


async def transcribe_audio_video(file_path: str) -> dict:
    """
    Transcribe audio/video using Groq's Whisper API (free).
    Falls back to OpenAI Whisper API if OPENAI_API_KEY is set.
    """
    provider = settings.AI_PROVIDER.lower()

    if provider == "groq" and settings.GROQ_API_KEY:
        return await _transcribe_groq(file_path)
    elif settings.OPENAI_API_KEY:
        return await _transcribe_openai_api(file_path)
    else:
        raise RuntimeError(
            "No transcription API available. Set GROQ_API_KEY (free at console.groq.com) "
            "or OPENAI_API_KEY in your .env file."
        )


async def _transcribe_groq(file_path: str) -> dict:
    """Use Groq's free Whisper API — fast and free."""
    from groq import AsyncGroq
    client = AsyncGroq(api_key=settings.GROQ_API_KEY)

    with open(file_path, "rb") as f:
        response = await client.audio.transcriptions.create(
            model="whisper-large-v3-turbo",
            file=f,
            response_format="verbose_json",
            timestamp_granularities=["segment"],
        )

    segments = []
    if hasattr(response, "segments") and response.segments:
        for seg in response.segments:
            segments.append({
                "text": seg.text.strip() if hasattr(seg, "text") else str(seg),
                "start": round(float(seg.start), 2) if hasattr(seg, "start") else 0,
                "end": round(float(seg.end), 2) if hasattr(seg, "end") else 0,
            })

    text = response.text if hasattr(response, "text") else ""
    duration = segments[-1]["end"] if segments else None

    return {"text": text, "segments": segments, "duration": duration}


async def _transcribe_openai_api(file_path: str) -> dict:
    """Use OpenAI Whisper API."""
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    with open(file_path, "rb") as f:
        response = await client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            response_format="verbose_json",
            timestamp_granularities=["segment"],
        )

    segments = []
    if hasattr(response, "segments") and response.segments:
        for seg in response.segments:
            segments.append({
                "text": seg.text.strip(),
                "start": round(seg.start, 2),
                "end": round(seg.end, 2),
            })

    return {
        "text": response.text,
        "segments": segments,
        "duration": getattr(response, "duration", None),
    }


def format_timestamp(seconds: float) -> str:
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes:02d}:{secs:02d}"
