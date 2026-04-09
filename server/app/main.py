"""FastAPI server exposing the Escoffier cookbook data from MongoDB."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any

from bson import ObjectId
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .db import close_client, get_database


def _serialize(value: Any) -> Any:
    """Recursively convert BSON-specific types (e.g. ObjectId) into JSON-safe ones."""
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, list):
        return [_serialize(v) for v in value]
    if isinstance(value, dict):
        return {k: _serialize(v) for k, v in value.items()}
    return value


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        yield
    finally:
        await close_client()


app = FastAPI(
    title="Escoffier Cookbook API",
    description=(
        "Read-only JSON API serving cookbook, contents, glossary, index, and "
        "chapter data from MongoDB."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# Allow the Next.js dev server (and any other local tools) to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "PATCH"],
    allow_headers=["*"],
)


@app.get("/", tags=["meta"])
async def root() -> dict[str, str]:
    return {"status": "ok", "service": "escoffier-api"}


@app.get("/api/cookbook", tags=["cookbook"])
async def get_cookbook() -> dict[str, Any]:
    db = get_database()
    doc = await db.cookbook.find_one({"_id": "cookbook"})
    if doc is None:
        raise HTTPException(status_code=404, detail="cookbook not found")
    return _serialize(doc)


@app.get("/api/contents", tags=["contents"])
async def get_contents() -> list[dict[str, Any]]:
    db = get_database()
    docs = await db.contents.find({}).sort("_id", 1).to_list(length=None)
    return _serialize(docs)


@app.get("/api/glossary", tags=["glossary"])
async def get_glossary() -> list[dict[str, Any]]:
    db = get_database()
    docs = await db.glossary.find({}).sort("term", 1).to_list(length=None)
    return _serialize(docs)


@app.get("/api/index", tags=["index"])
async def get_index() -> list[dict[str, Any]]:
    db = get_database()
    # `index` is a reserved attribute on the Database object, so access the
    # collection via getitem to avoid the AttributeError.
    docs = await db["index"].find({}).sort("_id", 1).to_list(length=None)
    return _serialize(docs)


@app.get("/api/chapters", tags=["chapters"])
async def list_chapters() -> list[dict[str, Any]]:
    """Return chapter summaries (id, chapter numeral, title)."""
    db = get_database()
    projection = {"_id": 1, "id": 1, "chapter": 1, "title": 1}
    docs = await db.chapters.find({}, projection).to_list(length=None)
    # Sort in the order the cookbook lists them (contents), not by _id which
    # is a string that sorts lexically (chapter-i, chapter-ii, chapter-iv, chapter-ix, ...).
    contents_doc = await db.contents.find({}).sort("_id", 1).to_list(length=None)
    ordering: list[str] = []
    for part in contents_doc:
        for ch in part.get("chapters", []):
            ordering.append(ch["id"])
    position = {cid: i for i, cid in enumerate(ordering)}
    docs.sort(key=lambda d: position.get(d.get("id", d["_id"]), 10**6))
    return _serialize(docs)


@app.get("/api/chapters/{chapter_id}", tags=["chapters"])
async def get_chapter(chapter_id: str) -> dict[str, Any]:
    db = get_database()
    doc = await db.chapters.find_one({"_id": chapter_id})
    if doc is None:
        raise HTTPException(
            status_code=404, detail=f"chapter {chapter_id!r} not found"
        )
    return _serialize(doc)


def _update_entry_in_sections(
    sections: list[dict[str, Any]], entry_number: int | float, payload: dict[str, Any]
) -> bool:
    """Recursively find an entry by number in nested sections and update it.

    Returns ``True`` if the entry was found and updated, ``False`` otherwise.
    """
    for section in sections:
        for entry in section.get("entries", []):
            if entry.get("number") == entry_number:
                for key, value in payload.items():
                    if key == "number":
                        continue  # prevent renumbering
                    entry[key] = value
                return True
        if _update_entry_in_sections(
            section.get("sections", []), entry_number, payload
        ):
            return True
    return False


@app.patch("/api/chapters/{chapter_id}/entries/{entry_number}", tags=["chapters"])
async def update_entry(
    chapter_id: str,
    entry_number: int | float,
    payload: dict[str, Any],
) -> dict[str, Any]:
    """Update a single entry within a chapter document."""
    db = get_database()

    chapter = await db.chapters.find_one({"_id": chapter_id})
    if chapter is None:
        raise HTTPException(
            status_code=404, detail=f"chapter {chapter_id!r} not found"
        )

    if not _update_entry_in_sections(
        chapter["sections"], entry_number, payload
    ):
        raise HTTPException(
            status_code=404,
            detail=f"entry {entry_number} not found in chapter {chapter_id!r}",
        )

    await db.chapters.update_one(
        {"_id": chapter_id},
        {"$set": {"sections": chapter["sections"]}},
    )

    doc = await db.chapters.find_one({"_id": chapter_id})
    return _serialize(doc)
