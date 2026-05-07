import logging
from sqlalchemy import select
from app.models.document import Document, FileType, ProcessingStatus
from app.services.pdf_service import extract_text_from_pdf
from app.services.transcription_service import transcribe_audio_video
from app.services.vector_service import build_faiss_index
from app.services.llm_service import generate_summary
from app.database import AsyncSessionLocal

logger = logging.getLogger(__name__)


async def process_document(document_id: str):
    """Background task: extract text/transcribe, build FAISS index, generate summary."""
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(select(Document).where(Document.id == document_id))
            doc = result.scalar_one_or_none()
            if not doc:
                logger.error(f"Document {document_id} not found")
                return

            doc.status = ProcessingStatus.PROCESSING
            await db.commit()

            extracted_text = ""
            segments = None
            duration = None

            if doc.file_type == FileType.PDF:
                extracted_text = extract_text_from_pdf(doc.file_path)

            elif doc.file_type in (FileType.AUDIO, FileType.VIDEO):
                transcription = await transcribe_audio_video(doc.file_path)
                extracted_text = transcription.get("text", "")
                segments = transcription.get("segments")
                duration = transcription.get("duration")

            # Build FAISS vector index
            if extracted_text.strip():
                await build_faiss_index(document_id, extracted_text, segments)

            # Generate AI summary
            summary = await generate_summary(extracted_text, doc.file_type.value)

            doc.extracted_text = extracted_text
            doc.summary = summary
            doc.transcript_segments = segments
            doc.duration_seconds = duration
            doc.status = ProcessingStatus.COMPLETED
            doc.error_message = None
            await db.commit()
            logger.info(f"Document {document_id} processed successfully")

        except Exception as e:
            logger.exception(f"Error processing document {document_id}: {e}")
            # Fresh session to avoid dirty state
            async with AsyncSessionLocal() as err_db:
                result = await err_db.execute(select(Document).where(Document.id == document_id))
                failed_doc = result.scalar_one_or_none()
                if failed_doc:
                    failed_doc.status = ProcessingStatus.FAILED
                    err_str = str(e)
                    if "quota" in err_str.lower() or "429" in err_str:
                        failed_doc.error_message = "AI quota exceeded. Check your Groq API key at console.groq.com."
                    elif "invalid_api_key" in err_str.lower() or "401" in err_str:
                        failed_doc.error_message = "Invalid API key. Update GROQ_API_KEY in .env."
                    elif "No module named" in err_str:
                        failed_doc.error_message = f"Missing dependency: {err_str}"
                    else:
                        failed_doc.error_message = err_str[:500]
                    await err_db.commit()
