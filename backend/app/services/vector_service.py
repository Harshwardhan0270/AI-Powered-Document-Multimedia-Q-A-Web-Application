import json
from pathlib import Path
from typing import Optional
import numpy as np
import faiss
from app.config import get_settings

settings = get_settings()
CHUNK_SIZE = 500
CHUNK_OVERLAP = 50


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunks.append(" ".join(words[start:end]))
        start += chunk_size - overlap
    return chunks


async def get_embeddings(texts: list[str]) -> list[list[float]]:
    """
    Get embeddings using OpenAI (if key set) or a pure-numpy BM25-style
    TF-IDF fallback that requires NO extra packages beyond numpy.
    """
    if settings.OPENAI_API_KEY:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        response = await client.embeddings.create(
            model="text-embedding-3-small", input=texts
        )
        return [item.embedding for item in response.data]

    return _numpy_tfidf_embeddings(texts)


def _numpy_tfidf_embeddings(texts: list[str], max_features: int = 512) -> list[list[float]]:
    """
    Pure-numpy TF-IDF embeddings — no sklearn, no scipy, no extra deps.
    Works offline, zero API cost.
    """
    # Tokenize
    tokenized = [t.lower().split() for t in texts]

    # Build vocabulary (top max_features by document frequency)
    from collections import Counter
    df_counter: Counter = Counter()
    for tokens in tokenized:
        df_counter.update(set(tokens))

    vocab_words = [w for w, _ in df_counter.most_common(max_features)]
    vocab = {w: i for i, w in enumerate(vocab_words)}
    V = len(vocab)
    N = len(texts)

    if V == 0 or N == 0:
        return [[0.0] * max_features for _ in texts]

    # TF matrix
    tf = np.zeros((N, V), dtype=np.float32)
    for i, tokens in enumerate(tokenized):
        cnt = Counter(tokens)
        total = max(len(tokens), 1)
        for w, c in cnt.items():
            if w in vocab:
                tf[i, vocab[w]] = c / total

    # IDF vector
    df_arr = np.array([df_counter.get(w, 0) for w in vocab_words], dtype=np.float32)
    idf = np.log((N + 1) / (df_arr + 1)) + 1.0  # smooth IDF

    # TF-IDF
    tfidf = tf * idf

    # L2 normalize
    norms = np.linalg.norm(tfidf, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    tfidf = tfidf / norms

    # Pad to max_features if vocab < max_features
    if V < max_features:
        pad = np.zeros((N, max_features - V), dtype=np.float32)
        tfidf = np.concatenate([tfidf, pad], axis=1)

    return tfidf.tolist()


async def build_faiss_index(document_id: str, text: str, segments: Optional[list[dict]] = None):
    """Build and persist a FAISS index for a document."""
    index_dir = Path(settings.FAISS_INDEX_DIR) / document_id
    index_dir.mkdir(parents=True, exist_ok=True)

    chunks = chunk_text(text)
    if not chunks:
        return

    embeddings = await get_embeddings(chunks)
    dim = len(embeddings[0])
    index = faiss.IndexFlatIP(dim)

    vectors = np.array(embeddings, dtype=np.float32)
    faiss.normalize_L2(vectors)
    index.add(vectors)

    faiss.write_index(index, str(index_dir / "index.faiss"))
    with open(index_dir / "chunks.json", "w") as f:
        json.dump({"chunks": chunks, "segments": segments or []}, f)


async def search_faiss_index(document_id: Optional[str], query: str, top_k: int = 5) -> list[dict]:
    """Search FAISS index and return top-k relevant chunks."""
    if not document_id:
        return []

    index_dir = Path(settings.FAISS_INDEX_DIR) / document_id
    index_path = index_dir / "index.faiss"
    chunks_path = index_dir / "chunks.json"

    if not index_path.exists():
        return []

    try:
        index = faiss.read_index(str(index_path))
        with open(chunks_path) as f:
            data = json.load(f)
    except Exception:
        return []

    chunks = data["chunks"]
    segments = data.get("segments", [])

    query_embedding = await get_embeddings([query])
    query_vec = np.array(query_embedding, dtype=np.float32)
    faiss.normalize_L2(query_vec)

    scores, indices = index.search(query_vec, min(top_k, len(chunks)))

    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx < 0:
            continue
        chunk_text_val = chunks[idx]
        result = {"text": chunk_text_val, "score": float(score)}

        if segments:
            for seg in segments:
                if any(word in seg["text"] for word in chunk_text_val.split()[:5]):
                    result["timestamp_start"] = seg["start"]
                    result["timestamp_end"] = seg["end"]
                    break

        results.append(result)

    return results


def delete_faiss_index(document_id: str):
    import shutil
    index_dir = Path(settings.FAISS_INDEX_DIR) / document_id
    if index_dir.exists():
        shutil.rmtree(index_dir)
