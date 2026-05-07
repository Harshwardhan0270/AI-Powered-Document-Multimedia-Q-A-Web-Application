import io
from pathlib import Path
import pypdf


def extract_text_from_pdf(file_path: str) -> str:
    """Extract all text from a PDF file."""
    text_parts = []
    with open(file_path, "rb") as f:
        reader = pypdf.PdfReader(f)
        for page_num, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                text_parts.append(f"[Page {page_num + 1}]\n{text}")
    return "\n\n".join(text_parts)


def get_pdf_metadata(file_path: str) -> dict:
    """Extract metadata from a PDF file."""
    with open(file_path, "rb") as f:
        reader = pypdf.PdfReader(f)
        meta = reader.metadata or {}
        return {
            "num_pages": len(reader.pages),
            "title": meta.get("/Title", ""),
            "author": meta.get("/Author", ""),
        }
