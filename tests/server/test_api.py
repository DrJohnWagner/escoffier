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
    # Front-matter fields present in the new format
    assert isinstance(body.get("preface"), list)
    assert len(body["preface"]) > 0
    assert isinstance(body.get("press"), dict)
    assert isinstance(body["press"].get("quotes"), list)
    # Glossary and index are embedded in the cookbook document
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
        assert set(summary.keys()) >= {"_id", "chapter", "title"}

    ids = [chapter["_id"] for chapter in body]

    # Chapters should come back in the cookbook's logical order (as dictated
    # by contents), not lexicographically. In particular, chapter-ix is the
    # 9th chapter in part I and must land AFTER chapter-v, even though "ix"
    # sorts before "v" as a string.
    if "chapter-v" in ids and "chapter-ix" in ids:
        assert ids.index("chapter-v") < ids.index("chapter-ix")


def test_get_single_chapter(client: TestClient) -> None:
    response = client.get("/api/chapters/chapter-i")
    assert response.status_code == 200
    body = response.json()

    assert body["_id"] == "chapter-i"
    assert body["chapter"] == "I"
    assert body["title"]
    assert isinstance(body.get("introduction"), list)
    assert isinstance(body.get("sections"), list)
    assert len(body["sections"]) > 0

    section = body["sections"][0]
    assert "title" in section
    assert isinstance(section.get("entryIDs"), list)


def test_get_missing_chapter_is_404(client: TestClient) -> None:
    response = client.get("/api/chapters/chapter-does-not-exist")
    assert response.status_code == 404
    assert response.json()["detail"] == "chapter 'chapter-does-not-exist' not found"


# ---- GET /api/entries ----


def test_entries_list_all(client: TestClient) -> None:
    response = client.get("/api/entries")
    assert response.status_code == 200
    body = response.json()

    assert isinstance(body, list)
    assert len(body) > 0

    entry = body[0]
    assert set(entry.keys()) >= {"_id", "title", "type", "chapter_id", "section_id"}
    assert entry["type"] in {"recipe", "principle", "technique", "definition"}


def test_entries_list_filtered_by_chapter(client: TestClient) -> None:
    response = client.get("/api/entries?chapter_id=chapter-i")
    assert response.status_code == 200
    body = response.json()

    assert isinstance(body, list)
    assert len(body) > 0
    assert all(e["chapter_id"] == "chapter-i" for e in body)


def test_entries_list_filtered_by_section(client: TestClient) -> None:
    response = client.get("/api/entries?section_id=chapter-i/section-1")
    assert response.status_code == 200
    body = response.json()

    assert isinstance(body, list)
    assert len(body) > 0
    assert all(e["section_id"] == "chapter-i/section-1" for e in body)


# ---- GET /api/entries/{entry_id} ----


def test_get_single_entry(client: TestClient) -> None:
    response = client.get("/api/entries/1")
    assert response.status_code == 200
    body = response.json()

    assert body["_id"] == "1"
    assert body["type"] == "recipe"
    assert "title" in body
    assert isinstance(body.get("ingredients"), list)
    assert isinstance(body.get("instructions"), list)
    assert body["chapter_id"] == "chapter-i"


def test_get_missing_entry_is_404(client: TestClient) -> None:
    response = client.get("/api/entries/99999999")
    assert response.status_code == 404
    assert "99999999" in response.json()["detail"]


# ---- PATCH /api/entries/{entry_id} ----


def test_patch_entry_updates_and_persists(client: TestClient) -> None:
    original = client.get("/api/entries/1").json()
    original_title = original["title"]

    # PATCH with a new title.
    response = client.patch("/api/entries/1", json={"title": "UPDATED CONSOMMÉ"})
    assert response.status_code == 200
    assert response.json()["title"] == "UPDATED CONSOMMÉ"

    # Verify persistence via a fresh GET.
    refetched = client.get("/api/entries/1").json()
    assert refetched["title"] == "UPDATED CONSOMMÉ"

    # Restore the original title.
    client.patch("/api/entries/1", json={"title": original_title})


def test_patch_entry_cannot_change_id(client: TestClient) -> None:
    response = client.patch("/api/entries/1", json={"_id": "999", "title": "X"})
    assert response.status_code == 200
    assert response.json()["_id"] == "1"


def test_patch_entry_nonexistent_is_404(client: TestClient) -> None:
    response = client.patch("/api/entries/99999999", json={"title": "X"})
    assert response.status_code == 404
    assert "99999999" in response.json()["detail"]
