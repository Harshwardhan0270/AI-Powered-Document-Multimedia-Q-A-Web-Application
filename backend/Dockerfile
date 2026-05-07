FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --timeout=300 --retries=5 -r requirements.txt

COPY app/ ./app/

RUN mkdir -p /tmp/uploads /tmp/faiss_indexes

RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app && \
    chmod -R 777 /tmp/uploads /tmp/faiss_indexes

USER appuser

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
