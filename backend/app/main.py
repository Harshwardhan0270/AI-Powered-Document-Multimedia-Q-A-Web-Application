import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from app.config import get_settings
from app.database import init_db
from app.core.redis import get_redis, close_redis
from app.routers import auth, documents, chat

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — verify DB and Redis are reachable
    await init_db()
    try:
        redis = await get_redis()
        await redis.ping()
        logging.info("Redis connection OK")
    except Exception as e:
        logging.warning(f"Redis not available: {e} — rate limiting disabled")
    yield
    # Shutdown
    await close_redis()


app = FastAPI(
    title="DocuMind AI API",
    description="AI-Powered Document & Multimedia Q&A Application",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(auth.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(chat.router, prefix="/api")


@app.get("/health")
async def health_check():
    """Health check — verifies DB and Redis connectivity."""
    from app.database import engine
    from sqlalchemy import text
    health: dict = {"status": "healthy", "version": "1.0.0", "db": "ok", "redis": "ok"}

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as e:
        health["db"] = f"error: {e}"
        health["status"] = "degraded"

    try:
        redis = await get_redis()
        await redis.ping()
    except Exception as e:
        health["redis"] = f"error: {e}"
        health["status"] = "degraded"

    return health
