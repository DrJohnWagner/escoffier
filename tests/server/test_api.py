"""Integration tests for the Escoffier FastAPI server."""

from __future__ import annotations

import re

from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Meta
# ---------------------------------------------------------------------------


def test_root_health(client: TestClient) -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "escoffier-api"}


# ---------------------------------------------------------------------------
# GET /api/cookbook
# ---------------------------------------------------------------------------


def test_cookbook_shape(client: TestClient) -> None:
    response = client.get("/api/cookbook")
    assert response.status_code == 200
    body = response.json()

    assert body["_id"] == "cookbook"
    assert body["title"] == "A Digital Guide to Modern Cookery"


def test_cookbook_source_fields(client: TestClient) -> None:
    body = client.get("/api/cookbook").json()
    source = body["source"]

    assert source["title"] == "A Guide to Modern Cookery"
    assert "A. Escoffier" in source["authors"]
    assert source["year"] == 1907
    assert "publisher" in source
    assert "location" in source


def test_cookbook_front_matter(client: TestClient) -> None:
    body = client.get("/api/cookbook").json()

    assert isinstance(body.get("preface"), list)
    assert len(body["preface"]) > 0
    assert all(isinstance(p, str) for p in body["preface"])

    assert isinstance(body.get("press"), dict)
    assert isinstance(body["press"].get("quotes"), list)
    assert len(body["press"]["quotes"]) > 0
    for q in body["press"]["quotes"]:
        assert "text" in q and "source" in q


def test_cookbook_has_embedded_glossary_and_index(client: TestClient) -> None:
    body = client.get("/api/cookbook").json()

    assert isinstance(body.get("glossary"), list)
    assert len(body["glossary"]) > 0

    assert isinstance(body.get("index"), list)
    assert len(body["index"]) > 0


def test_cookbook_does_not_embed_chapters(client: TestClient) -> None:
    """The migration strips the chapters array to avoid duplicating the chapters
    collection in the cookbook document."""
    body = client.get("/api/cookbook").json()
    assert "chapters" not in body


# ---------------------------------------------------------------------------
# GET /api/contents
# ---------------------------------------------------------------------------


def test_contents_two_parts(client: TestClient) -> None:
    response = client.get("/api/contents")
    assert response.status_code == 200
    body = response.json()

    assert isinstance(body, list)
    assert [part["_id"] for part in body] == ["I", "II"]


def test_contents_chapter_fields(client: TestClient) -> None:
    body = client.get("/api/contents").json()

    for part in body:
        assert "title" in part
        assert isinstance(part["chapters"], list)
        assert len(part["chapters"]) > 0
        for chapter in part["chapters"]:
            assert set(chapter.keys()) >= {"chapter", "id", "title"}


def test_contents_total_chapter_count(client: TestClient) -> None:
    body = client.get("/api/contents").json()
    total = sum(len(part["chapters"]) for part in body)
    assert total == 23


# ---------------------------------------------------------------------------
# GET /api/glossary
# ---------------------------------------------------------------------------


def test_glossary_is_non_empty_and_sorted(client: TestClient) -> None:
    response = client.get("/api/glossary")
    assert response.status_code == 200
    body = response.json()

    assert isinstance(body, list)
    assert len(body) > 0

    terms = [entry["term"] for entry in body]
    assert terms == sorted(terms)


def test_glossary_objectids_serialized(client: TestClient) -> None:
    body = client.get("/api/glossary").json()
    for entry in body:
        assert isinstance(entry["_id"], str)
        assert entry["_id"]
        assert "term" in entry


def test_glossary_entry_shapes(client: TestClient) -> None:
    """Each glossary entry must have a term; definition or cross-ref is optional."""
    body = client.get("/api/glossary").json()
    for entry in body:
        assert isinstance(entry["term"], str)
        # At least one of these fields must be present.
        assert any(
            k in entry for k in ("definition", "see_recipe", "see_term", "sub_terms")
        )


# ---------------------------------------------------------------------------
# GET /api/index
# ---------------------------------------------------------------------------


def test_index_letter_groups(client: TestClient) -> None:
    response = client.get("/api/index")
    assert response.status_code == 200
    body = response.json()

    assert isinstance(body, list)
    assert len(body) > 0

    letters = [group["_id"] for group in body]
    assert all(re.fullmatch(r"[A-Z]", letter) for letter in letters)
    assert letters == sorted(letters)


def test_index_group_structure(client: TestClient) -> None:
    body = client.get("/api/index").json()
    for group in body:
        assert group["letter"] == group["_id"]
        assert isinstance(group["entries"], list)
        assert len(group["entries"]) > 0
        for entry in group["entries"]:
            assert "term" in entry


# ---------------------------------------------------------------------------
# GET /api/chapters  (list)
# ---------------------------------------------------------------------------


def test_chapters_list_order(client: TestClient) -> None:
    """chapter-ix must land after chapter-v in cookbook order, not lexically."""
    response = client.get("/api/chapters")
    assert response.status_code == 200
    body = response.json()

    ids = [chapter["_id"] for chapter in body]
    if "chapter-v" in ids and "chapter-ix" in ids:
        assert ids.index("chapter-v") < ids.index("chapter-ix")


def test_chapters_list_total_count(client: TestClient) -> None:
    body = client.get("/api/chapters").json()
    assert len(body) == 23


def test_chapters_list_fields(client: TestClient) -> None:
    body = client.get("/api/chapters").json()
    for summary in body:
        assert set(summary.keys()) >= {"_id", "chapter", "title"}
        # The list projection omits sections and introduction — good.
        assert "sections" not in summary
        assert "introduction" not in summary


# ---------------------------------------------------------------------------
# GET /api/chapters/{chapter_id}
# ---------------------------------------------------------------------------


def test_get_chapter_first(client: TestClient) -> None:
    response = client.get("/api/chapters/chapter-i")
    assert response.status_code == 200
    body = response.json()

    assert body["_id"] == "chapter-i"
    assert body["chapter"] == "I"
    assert body["title"] == "FONDS DE CUISINE"
    assert isinstance(body.get("introduction"), list)
    assert len(body["introduction"]) > 0


def test_get_chapter_section_structure(client: TestClient) -> None:
    body = client.get("/api/chapters/chapter-i").json()

    assert isinstance(body.get("sections"), list)
    assert len(body["sections"]) > 0

    section = body["sections"][0]
    assert "title" in section
    assert isinstance(section.get("entryIDs"), list)
    assert len(section["entryIDs"]) > 0
    for entry_id in section["entryIDs"]:
        assert isinstance(entry_id, str)


def test_get_chapter_last(client: TestClient) -> None:
    """All 23 chapters must be fetchable, including the last."""
    response = client.get("/api/chapters/chapter-xxiii")
    assert response.status_code == 200
    body = response.json()
    assert body["_id"] == "chapter-xxiii"
    assert body["chapter"] == "XXIII"


def test_get_missing_chapter_is_404(client: TestClient) -> None:
    response = client.get("/api/chapters/chapter-does-not-exist")
    assert response.status_code == 404
    assert response.json()["detail"] == "chapter 'chapter-does-not-exist' not found"


# ---------------------------------------------------------------------------
# GET /api/entries  (list)
# ---------------------------------------------------------------------------


def test_entries_list_all(client: TestClient) -> None:
    response = client.get("/api/entries")
    assert response.status_code == 200
    body = response.json()

    assert isinstance(body, list)
    assert len(body) > 2000

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


def test_entries_list_combined_filter(client: TestClient) -> None:
    """Both filters applied simultaneously must AND together."""
    response = client.get(
        "/api/entries?chapter_id=chapter-i&section_id=chapter-i/section-1"
    )
    assert response.status_code == 200
    body = response.json()

    assert isinstance(body, list)
    assert len(body) > 0
    assert all(
        e["chapter_id"] == "chapter-i" and e["section_id"] == "chapter-i/section-1"
        for e in body
    )


def test_entries_filter_unknown_chapter_returns_empty(client: TestClient) -> None:
    response = client.get("/api/entries?chapter_id=chapter-does-not-exist")
    assert response.status_code == 200
    assert response.json() == []


# ---------------------------------------------------------------------------
# GET /api/entries/{entry_id}
# ---------------------------------------------------------------------------


def test_get_recipe_entry(client: TestClient) -> None:
    response = client.get("/api/entries/1")
    assert response.status_code == 200
    body = response.json()

    assert body["_id"] == "1"
    assert body["type"] == "recipe"
    assert "title" in body
    assert isinstance(body.get("ingredients"), list)
    assert isinstance(body.get("instructions"), list)
    assert body["chapter_id"] == "chapter-i"


def test_get_principle_entry(client: TestClient) -> None:
    """Entry 6 is a principle — no ingredients or instructions."""
    response = client.get("/api/entries/6")
    assert response.status_code == 200
    body = response.json()

    assert body["_id"] == "6"
    assert body["type"] == "principle"
    assert "ingredients" not in body
    assert "instructions" not in body


def test_entry_section_path_field(client: TestClient) -> None:
    body = client.get("/api/entries/1").json()

    assert isinstance(body.get("section_path"), list)
    assert len(body["section_path"]) > 0
    assert all(isinstance(s, str) for s in body["section_path"])


def test_get_missing_entry_is_404(client: TestClient) -> None:
    response = client.get("/api/entries/99999999")
    assert response.status_code == 404
    assert "99999999" in response.json()["detail"]


# ---------------------------------------------------------------------------
# PATCH /api/entries/{entry_id}
# ---------------------------------------------------------------------------


def test_patch_entry_string_field(client: TestClient) -> None:
    original = client.get("/api/entries/1").json()
    original_title = original["title"]

    response = client.patch("/api/entries/1", json={"title": "UPDATED CONSOMMÉ"})
    assert response.status_code == 200
    assert response.json()["title"] == "UPDATED CONSOMMÉ"

    # Verify persistence.
    assert client.get("/api/entries/1").json()["title"] == "UPDATED CONSOMMÉ"

    # Restore.
    client.patch("/api/entries/1", json={"title": original_title})


def test_patch_entry_array_field(client: TestClient) -> None:
    """PATCH can update array fields such as notes."""
    original = client.get("/api/entries/1").json()
    original_notes = original.get("notes", [])

    new_notes = [{"title": "Test Note", "content": ["A test paragraph."]}]
    response = client.patch("/api/entries/1", json={"notes": new_notes})
    assert response.status_code == 200
    assert response.json()["notes"] == new_notes

    # Restore.
    client.patch("/api/entries/1", json={"notes": original_notes})


def test_patch_entry_cannot_change_id(client: TestClient) -> None:
    response = client.patch("/api/entries/1", json={"_id": "999", "title": "X"})
    assert response.status_code == 200
    assert response.json()["_id"] == "1"


def test_patch_entry_response_contains_all_fields(client: TestClient) -> None:
    """The PATCH response is the full updated document, not just changed fields."""
    original_title = client.get("/api/entries/1").json()["title"]

    response = client.patch("/api/entries/1", json={"title": "FULL DOC CHECK"})
    assert response.status_code == 200
    body = response.json()

    assert "_id" in body
    assert "title" in body
    assert "type" in body
    assert "chapter_id" in body
    assert body["title"] == "FULL DOC CHECK"

    # Restore.
    client.patch("/api/entries/1", json={"title": original_title})


def test_patch_entry_nonexistent_is_404(client: TestClient) -> None:
    response = client.patch("/api/entries/99999999", json={"title": "X"})
    assert response.status_code == 404
    assert "99999999" in response.json()["detail"]
