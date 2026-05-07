from fastapi import HTTPException, Request, status
from app.core.redis import get_redis
from app.config import get_settings

settings = get_settings()


async def rate_limit(request: Request):
    """Rate limit by IP address using Redis sliding window."""
    redis = await get_redis()
    client_ip = request.client.host if request.client else "unknown"
    key = f"rate_limit:{client_ip}"

    try:
        current = await redis.incr(key)
        if current == 1:
            await redis.expire(key, settings.RATE_LIMIT_WINDOW)
        if current > settings.RATE_LIMIT_REQUESTS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Max {settings.RATE_LIMIT_REQUESTS} requests per {settings.RATE_LIMIT_WINDOW}s.",
            )
    except HTTPException:
        raise
    except Exception:
        # If Redis is unavailable, allow the request
        pass
