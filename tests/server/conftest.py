"""Shared fixtures for the FastAPI API tests.

These tests hit the FastAPI app in-process via ``TestClient`` but do not mock
the database — they exercise the real Motor driver against whatever MongoDB
instance the server is configured to use. Run ``make start-db`` and
``make migrate-db`` before ``make test-server``.
"""

from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient
from pymongo import MongoClient
from pymongo.errors import PyMongoError

from app.db import build_mongo_uri
from app.main import app


def _db_is_ready() -> tuple[bool, str]:
    """Return (ready, reason). Ready means the database is reachable AND
    the migration has been applied (cookbook singleton present)."""
    uri = build_mongo_uri()
    db_name = os.environ.get("MONGO_DATABASE", "escoffier")
    try:
        client = MongoClient(uri, serverSelectionTimeoutMS=1500)
        try:
            client.admin.command("ping")
            doc = client[db_name].cookbook.find_one({"_id": "cookbook"})
        finally:
            client.close()
    except PyMongoError as exc:
        return False, f"MongoDB not reachable at {uri}: {exc!s}"
    if doc is None:
        return False, (
            f"MongoDB at {uri} has no cookbook document in database "
            f"{db_name!r} — run `make migrate-db` first"
        )
    return True, ""


@pytest.fixture(scope="session", autouse=True)
def _require_db() -> None:
    ready, reason = _db_is_ready()
    if not ready:
        pytest.skip(reason, allow_module_level=True)


@pytest.fixture(scope="session")
def client() -> TestClient:
    # ``with`` ensures the FastAPI lifespan (including Motor client shutdown)
    # runs when the test session ends.
    with TestClient(app) as test_client:
        yield test_client
