FROM python:3.12-slim

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Python deps (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir --timeout=300 --retries=5 -r requirements.txt

# App code
COPY app/ ./app/

RUN mkdir -p /app/uploads /app/faiss_indexes

RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# PORT env var is set by Railway/Render automatically
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
