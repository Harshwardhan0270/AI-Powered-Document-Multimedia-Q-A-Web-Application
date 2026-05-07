from typing import AsyncGenerator, Optional
from fastapi import HTTPException, status
from app.config import get_settings
from app.services.vector_service import search_faiss_index

settings = get_settings()

SYSTEM_PROMPT = """You are a helpful AI assistant that answers questions based on uploaded documents, audio, and video files.
When answering:
- Be concise and accurate
- Reference specific parts of the content when relevant
- If the content includes timestamps, mention them when relevant
- If you cannot find the answer in the provided context, say so clearly
"""

# Timeout for LLM calls (seconds)
LLM_TIMEOUT = 60


def _get_client():
    """Return (client, model) for the configured AI provider."""
    provider = settings.AI_PROVIDER.lower()

    if provider == "groq":
        if not settings.GROQ_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Groq API key not set. Get a free key at https://console.groq.com",
            )
        from groq import AsyncGroq
        return AsyncGroq(api_key=settings.GROQ_API_KEY), settings.GROQ_MODEL

    elif provider == "openai":
        if not settings.OPENAI_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OpenAI API key not set. Add OPENAI_API_KEY to .env.",
            )
        from openai import AsyncOpenAI
        return AsyncOpenAI(api_key=settings.OPENAI_API_KEY), settings.OPENAI_MODEL

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=f"Unknown AI_PROVIDER '{provider}'. Use 'groq' or 'openai'.",
    )


def _handle_ai_error(e: Exception):
    err = str(e).lower()
    if "429" in str(e) or "rate_limit" in err or "quota" in err:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="AI quota exceeded. Check https://console.groq.com for usage.",
        )
    if "401" in str(e) or "invalid_api_key" in err or "authentication" in err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key. Check GROQ_API_KEY in .env.",
        )
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=f"AI service error: {str(e)[:200]}",
    )


async def generate_answer(
    question: str,
    document_id: Optional[str],
    chat_history: list[dict],
    stream: bool = False,
) -> "dict | AsyncGenerator":
    client, model = _get_client()

    # Retrieve relevant context from FAISS
    context_chunks = await search_faiss_index(document_id, question, top_k=5)
    context_text = "\n\n---\n\n".join([c["text"] for c in context_chunks])

    # Extract timestamp references from matched chunks
    timestamp_refs = []
    for chunk in context_chunks:
        if "timestamp_start" in chunk:
            timestamp_refs.append({
                "start": chunk["timestamp_start"],
                "end": chunk["timestamp_end"],
                "text": chunk["text"][:100],
            })

    # Build message list
    messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]
    if context_text:
        messages.append({
            "role": "system",
            "content": f"Relevant context from the document:\n\n{context_text}",
        })
    for msg in chat_history[-10:]:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": question})

    if stream:
        return _stream_response(client, model, messages, timestamp_refs)

    try:
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.3,
            max_tokens=1500,
            timeout=LLM_TIMEOUT,
        )
    except Exception as e:
        _handle_ai_error(e)

    return {
        "content": response.choices[0].message.content,
        "timestamp_refs": timestamp_refs,
        "sources": [{"text": c["text"][:200], "score": c.get("score")} for c in context_chunks],
    }


async def _stream_response(client, model: str, messages: list, timestamp_refs: list) -> AsyncGenerator:
    try:
        stream = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.3,
            max_tokens=1500,
            stream=True,
            timeout=LLM_TIMEOUT,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                yield delta.content
    except Exception as e:
        _handle_ai_error(e)


async def generate_summary(text: str, file_type: str) -> str:
    if not text.strip():
        return "No content to summarize."
    try:
        client, model = _get_client()
    except HTTPException as e:
        return f"Summary unavailable: {e.detail}"

    prompt = f"""Provide a comprehensive summary of the following {file_type} content.
Include:
- Main topics covered
- Key points and insights
- Important details

Content:
{text[:8000]}"""

    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are an expert summarizer. Be thorough but concise."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=800,
            timeout=LLM_TIMEOUT,
        )
        return response.choices[0].message.content
    except Exception as e:
        err = str(e).lower()
        if "429" in str(e) or "quota" in err or "rate_limit" in err:
            return "Summary unavailable: API quota exceeded."
        return f"Summary unavailable: {str(e)[:200]}"
