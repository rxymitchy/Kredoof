"""Vercel FastAPI entrypoint. Local run still uses `uvicorn kredoof.api:app`."""

from kredoof.api import app

__all__ = ["app"]
