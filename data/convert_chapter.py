#!/usr/bin/env python3
"""
Transform old embedded chapter JSON into:

1. a cookbook/chapter structure document whose sections contain entryIDs
2. a flat list of entry documents

This script assumes each source chapter file still has embedded `entries`
inside recursive `sections`.
"""

from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from typing import Any


SOURCE_DIR = Path("./JSON-OLD")
OUTPUT_DIR = Path("JSON")

CHAPTER_IDS = [
      "i",   "ii",   "iii",  "iv",  "v", 
     "vi",  "vii",  "viii",  "ix",  "x",
     "xi",  "xii",  "xiii", "xiv", "xv",
    "xvi", "xvii", "xviii", "xix", "xx",
    "xxi", "xxii", "xxiii",
]

CHAPTER_FILES = [
    f"chapter-{id}.json" for id in CHAPTER_IDS
]


ENTRY_TYPES = {
    "recipe", "principle", "technique", "definition",
}

CONTENT_FIELDS = {
    "introduction", "notes", "ingredients", "instructions",
}


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
        f.write("\n")


def normalise_content(value: Any) -> list[Any]:
    """
    Normalise content into the canonical recursive form:

        Content = list[ContentNode]

        ContentNode =
            - str
            - {"title": str, "content": Content}

    Rules:
        - bare string -> [string]
        - list -> recursively normalised list
        - {"Some Title": ...} -> [{"title": "Some Title", "content": ...}]
        - {"title": ..., "content": ...} -> normalised titled block
    """
    if value is None:
        return []

    if isinstance(value, str):
        return [value]

    if isinstance(value, list):
        result = []
        for item in value:
            result.extend(_normalise_content_node(item))
        return result

    if isinstance(value, dict):
        return _normalise_content_node(value)

    raise TypeError(f"Unsupported content type: {type(value).__name__}")


def _normalise_content_node(node: Any) -> list[Any]:
    if node is None:
        return []

    if isinstance(node, str):
        return [node]

    if isinstance(node, list):
        result = []
        for item in node:
            result.extend(_normalise_content_node(item))
        return result

    if isinstance(node, dict):
        if set(node.keys()) == {"title", "content"}:
            return [{
                "title": node["title"],
                "content": normalise_content(node["content"]),
            }]

        result = []
        for title, content in node.items():
            result.append({
                "title": title,
                "content": normalise_content(content),
            })
        return result

    raise TypeError(f"Unsupported content node type: {type(node).__name__}")


def visit_entry(
    entry: dict[str, Any],
    *,
    chapter_id: str | None = None,
    section_id: str | None = None,
    section_path: list[str] | None = None,
) -> dict[str, Any]:
    """
    Transform one embedded entry into a flat entry document.

    Output:
        - `_id` is always a string
        - `number` is removed
        - content fields are normalised
        - provenance fields are added if provided
    """
    entry = deepcopy(entry)

    if "number" not in entry:
        raise KeyError("Entry is missing required field 'number'")

    entry_id = str(entry["number"]).strip()
    if not entry_id:
        raise ValueError("Entry 'number' normalised to an empty string")

    new_entry = {
        "_id": entry_id,
    }

    for key, value in entry.items():
        if key == "number":
            continue

        if key in CONTENT_FIELDS:
            new_entry[key] = normalise_content(value)
        else:
            new_entry[key] = deepcopy(value)

    if chapter_id is not None:
        new_entry["chapter_id"] = chapter_id

    if section_id is not None:
        new_entry["section_id"] = section_id

    if section_path is not None:
        new_entry["section_path"] = list(section_path)

    return new_entry


def visit_section(
    section: dict[str, Any],
    *,
    chapter_id: str,
    path_indices: list[int],
    flat_entries: list[dict[str, Any]],
    ancestor_titles: list[str] | None = None,
) -> dict[str, Any]:
    """
    Transform a section node by:
        - assigning a deterministic section _id like chapter-i/s1/s2
        - normalising section introduction
        - extracting embedded entries into flat_entries
        - replacing embedded entries with entryIDs
        - recursively transforming child sections
    """
    section = deepcopy(section)
    ancestor_titles = list(ancestor_titles or [])

    section_id = chapter_id + "".join(f"/section-{i}" for i in path_indices)

    title = section.get("title")
    if not title:
        raise ValueError(f"Section {section_id} is missing required field 'title'")

    current_section_path = ancestor_titles + [title]

    new_section: dict[str, Any] = {
        "_id": section_id,
        "title": title,
    }

    new_section["introduction"] = normalise_content(section.get("introduction"))

    entry_ids: list[str] = []
    for entry in section.get("entries", []):
        new_entry = visit_entry(
            entry,
            chapter_id=chapter_id,
            section_id=section_id,
            section_path=current_section_path,
        )
        flat_entries.append(new_entry)
        entry_ids.append(new_entry["_id"])

    new_section["entryIDs"] = entry_ids

    child_sections = []
    for i, child in enumerate(section.get("sections", []), start=1):
        child_sections.append(
            visit_section(
                child,
                chapter_id=chapter_id,
                path_indices=path_indices + [i],
                flat_entries=flat_entries,
                ancestor_titles=current_section_path,
            )
        )

    new_section["sections"] = child_sections

    return new_section


def visit_chapter(chapter: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """
    Transform one source chapter into:
        1. a structure-only chapter document
        2. a flat list of extracted entries
    """
    chapter = deepcopy(chapter)

    chapter_id = chapter.get("id")
    if not chapter_id:
        raise ValueError("Chapter is missing required field 'id'")

    if "title" not in chapter:
        raise ValueError(f"Chapter {chapter_id} is missing required field 'title'")

    if "chapter" not in chapter:
        raise ValueError(f"Chapter {chapter_id} is missing required field 'chapter'")

    flat_entries: list[dict[str, Any]] = []

    new_chapter: dict[str, Any] = {
        "_id": chapter_id,
        "chapter": chapter["chapter"],
        "title": chapter["title"],
    }

    if "introduction" in chapter:
        new_chapter["introduction"] = normalise_content(chapter["introduction"])

    new_sections = []
    for i, section in enumerate(chapter.get("sections", []), start=1):
        new_sections.append(
            visit_section(
                section,
                chapter_id=chapter_id,
                path_indices=[i],
                flat_entries=flat_entries,
                ancestor_titles=[],
            )
        )

    new_chapter["sections"] = new_sections

    return new_chapter, flat_entries


def validate_entries(entries: list[dict[str, Any]]) -> None:
    seen: set[str] = set()

    for entry in entries:
        entry_id = entry["_id"]
        if entry_id in seen:
            raise ValueError(f"Duplicate entry _id found: {entry_id}")
        seen.add(entry_id)


def collect_referenced_entry_ids(section: dict[str, Any]) -> list[str]:
    result = list(section.get("entryIDs", []))
    for child in section.get("sections", []):
        result.extend(collect_referenced_entry_ids(child))
    return result


def validate_chapter_structure(
    chapter: dict[str, Any],
    entries: list[dict[str, Any]],
) -> None:
    valid_ids = {entry["_id"] for entry in entries}
    referenced_ids: list[str] = []

    for section in chapter.get("sections", []):
        referenced_ids.extend(collect_referenced_entry_ids(section))

    missing = [entry_id for entry_id in referenced_ids if entry_id not in valid_ids]
    if missing:
        raise ValueError(
            f"Chapter {chapter['_id']} references unknown entryIDs: {sorted(set(missing))}"
        )


def main() -> None:
    all_entries: list[dict[str, Any]] = []
    cookbook_sections: list[dict[str, Any]] = []

    for chapter_filename in CHAPTER_FILES:
        input_path = SOURCE_DIR / chapter_filename
        if not input_path.is_file():
            raise FileNotFoundError(f"Input file not found: {input_path}")

        chapter = load_json(input_path)
        new_chapter, chapter_entries = visit_chapter(chapter)

        validate_entries(chapter_entries)
        validate_chapter_structure(new_chapter, chapter_entries)

        cookbook_sections.append(new_chapter)
        all_entries.extend(chapter_entries)

        save_json(OUTPUT_DIR / "chapters" / chapter_filename, new_chapter)
        save_json(
            OUTPUT_DIR / "entries" / f"{input_path.stem}-entries.json",
            chapter_entries,
        )

    validate_entries(all_entries)

    save_json(OUTPUT_DIR / "sections.json", cookbook_sections)
    cookbook = load_json(SOURCE_DIR / "cookbook.json")
    cookbook["_id"] = "cookbook"
    cookbook["chapters"] = cookbook_sections

    save_json(OUTPUT_DIR / "cookbook.json", cookbook)
    save_json(OUTPUT_DIR / "entries.json", all_entries)


if __name__ == "__main__":
    main()