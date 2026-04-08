"""MongoDB connection helpers for the Escoffier FastAPI server."""

from __future__ import annotations

import os
from urllib.parse import quote_plus

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase


def build_mongo_uri() -> str:
    """Build a MongoDB URI from env vars.

    ``MONGO_URI`` takes precedence when set, otherwise the URI is assembled
    from ``MONGO_HOST`` / ``MONGO_PORT`` / ``MONGO_ROOT_USERNAME`` /
    ``MONGO_ROOT_PASSWORD``, matching the variables used by ``compose.yaml``.
    """
    uri = os.environ.get("MONGO_URI")
    if uri:
        return uri

    host = os.environ.get("MONGO_HOST", "localhost")
    port = os.environ.get("MONGO_PORT", "27018")
    user = quote_plus(os.environ.get("MONGO_ROOT_USERNAME", "root"))
    password = quote_plus(os.environ.get("MONGO_ROOT_PASSWORD", "example"))
    return f"mongodb://{user}:{password}@{host}:{port}/?authSource=admin"


_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    """Return a lazily-created process-wide Motor client."""
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(build_mongo_uri())
    return _client


def get_database() -> AsyncIOMotorDatabase:
    """Return the configured database handle."""
    return get_client()[os.environ.get("MONGO_DATABASE", "escoffier")]


async def close_client() -> None:
    """Close the Motor client if one was created."""
    global _client
    if _client is not None:
        _client.close()
        _client = None
