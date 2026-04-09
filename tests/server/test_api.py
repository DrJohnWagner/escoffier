"""Integration tests for the Escoffier FastAPI server."""

from __future__ import annotations

import re

from fastapi.testclient import TestClient


def test_root_health(client: TestClient) -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "escoffier-api"}


def test_cookbook(client: TestClient) -> None:
    response = client.get("/api/cookbook")
    assert response.status_code == 200
    body = response.json()

    assert body["_id"] == "cookbook"
    assert body["title"] == "A Digital Guide to Modern Cookery"
    assert body["source"]["year"] == 1907
    assert isinstance(body.get("glossary"), list)
    assert len(body["glossary"]) > 0


def test_contents(client: TestClient) -> None:
    response = client.get("/api/contents")
    assert response.status_code == 200
    body = response.json()

    assert isinstance(body, list)
    assert [part["_id"] for part in body] == ["I", "II"]
    for part in body:
        assert "title" in part
        assert isinstance(part["chapters"], list)
        assert len(part["chapters"]) > 0
        for chapter in part["chapters"]:
            assert set(chapter.keys()) >= {"chapter", "id", "title"}


def test_glossary_sorted_and_serialized(client: TestClient) -> None:
    response = client.get("/api/glossary")
    assert response.status_code == 200
    body = response.json()

    assert isinstance(body, list)
    assert len(body) > 0

    # Sorted alphabetically by term (the handler applies sort({term: 1})).
    terms = [entry["term"] for entry in body]
    assert terms == sorted(terms)

    # ObjectId values must have been serialized to strings so the response is
    # round-trippable JSON.
    for entry in body:
        assert isinstance(entry["_id"], str)
        assert entry["_id"]  # non-empty
        assert "term" in entry


def test_index(client: TestClient) -> None:
    response = client.get("/api/index")
    assert response.status_code == 200
    body = response.json()

    assert isinstance(body, list)
    assert len(body) > 0

    letters = [group["_id"] for group in body]
    assert all(re.fullmatch(r"[A-Z]", letter) for letter in letters)
    # Lexicographically sorted (sort({_id: 1}) in the handler).
    assert letters == sorted(letters)

    for group in body:
        assert group["letter"] == group["_id"]
        assert isinstance(group["entries"], list)
        assert len(group["entries"]) > 0


def test_chapters_list_order_and_fields(client: TestClient) -> None:
    response = client.get("/api/chapters")
    assert response.status_code == 200
    body = response.json()

    assert isinstance(body, list)
    assert len(body) > 0

    for summary in body:
        assert set(summary.keys()) >= {"_id", "id", "chapter", "title"}

    ids = [chapter["_id"] for chapter in body]

    # Chapters should come back in the cookbook's logical order (as dictated
    # by contents.json), not lexicographically. In particular, chapter-ix is
    # the 9th chapter in part I and must land AFTER chapter-v, even though
    # "ix" sorts before "v" as a string.
    if "chapter-v" in ids and "chapter-ix" in ids:
        assert ids.index("chapter-v") < ids.index("chapter-ix")


def test_get_single_chapter(client: TestClient) -> None:
    response = client.get("/api/chapters/chapter-i")
    assert response.status_code == 200
    body = response.json()

    assert body["_id"] == "chapter-i"
    assert body["id"] == "chapter-i"
    assert body["chapter"] == "I"
    assert body["title"]
    assert isinstance(body.get("sections"), list)
    assert len(body["sections"]) > 0
    assert "title" in body["sections"][0]


def test_get_missing_chapter_is_404(client: TestClient) -> None:
    response = client.get("/api/chapters/chapter-does-not-exist")
    assert response.status_code == 404
    assert response.json()["detail"] == "chapter 'chapter-does-not-exist' not found"


# ---- PATCH /api/chapters/{chapter_id}/entries/{entry_number} ----


def _find_entry(chapter: dict, number: int | float) -> dict | None:
    """Walk the chapter's nested sections to locate an entry by number."""
    for section in chapter.get("sections", []):
        for entry in section.get("entries", []):
            if entry.get("number") == number:
                return entry
        found = _find_entry({"sections": section.get("sections", [])}, number)
        if found is not None:
            return found
    return None


def test_patch_entry_updates_and_persists(client: TestClient) -> None:
    # Capture the original title so we can restore it later.
    original = client.get("/api/chapters/chapter-i").json()
    entry = _find_entry(original, 1)
    assert entry is not None
    original_title = entry["title"]

    # PATCH the entry with a new title.
    response = client.patch(
        "/api/chapters/chapter-i/entries/1",
        json={"title": "UPDATED CONSOMMÉ"},
    )
    assert response.status_code == 200
    patched_entry = _find_entry(response.json(), 1)
    assert patched_entry is not None
    assert patched_entry["title"] == "UPDATED CONSOMMÉ"

    # Verify persistence via a fresh GET.
    refetched = client.get("/api/chapters/chapter-i").json()
    assert _find_entry(refetched, 1)["title"] == "UPDATED CONSOMMÉ"

    # Restore the original title.
    client.patch(
        "/api/chapters/chapter-i/entries/1",
        json={"title": original_title},
    )


def test_patch_entry_nonexistent_chapter_is_404(client: TestClient) -> None:
    response = client.patch(
        "/api/chapters/chapter-nonexistent/entries/1",
        json={"title": "X"},
    )
    assert response.status_code == 404
    assert "chapter-nonexistent" in response.json()["detail"]


def test_patch_entry_nonexistent_entry_is_404(client: TestClient) -> None:
    response = client.patch(
        "/api/chapters/chapter-i/entries/99999",
        json={"title": "X"},
    )
    assert response.status_code == 404
    assert "99999" in response.json()["detail"]
