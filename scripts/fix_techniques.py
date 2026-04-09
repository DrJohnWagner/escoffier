#!/usr/bin/env python3
"""
Fix technique entries in chapter JSON files.

For entries with type='technique':
1. If the entry has an 'instructions' section but no 'notes' section,
   rename the 'instructions' section to 'notes'.
2. If the entry has both 'instructions' and 'notes' sections,
   combine both into the 'notes' section and delete 'instructions'.
"""

import json
import glob
import sys
from pathlib import Path


def fix_technique_entries(data: dict) -> dict:
    """
    Process chapter data and fix technique entries in place.

    Returns a dict with keys: 'total_entries', 'fixed_entries', 'changes'
    """
    total_entries = 0
    fixed_entries = 0
    changes = []

    def process_entries(entries_list):
        """Recursively process entries in sections."""
        nonlocal total_entries, fixed_entries
        if not isinstance(entries_list, list):
            return

        for entry in entries_list:
            if not isinstance(entry, dict):
                continue

            total_entries += 1
            entry_num = entry.get("number", "?")
            entry_type = entry.get("type")

            if entry_type == "technique":
                has_instructions = "instructions" in entry
                has_notes = "notes" in entry

                if has_instructions and not has_notes:
                    # Case 1: has instructions but no notes
                    # Move instructions to notes
                    entry["notes"] = [entry.pop("instructions")]
                    fixed_entries += 1
                    changes.append(
                        f"  Entry {entry_num}: Moved 'instructions' to 'notes'"
                    )

                elif has_instructions and has_notes:
                    # Case 2: has both instructions and notes
                    # Combine both into notes
                    intro = entry.pop("instructions")
                    if not isinstance(intro, list):
                        intro = [intro]

                    # Ensure notes is a list
                    if not isinstance(entry["notes"], list):
                        entry["notes"] = [entry["notes"]]

                    # Prepend instructions to notes
                    entry["notes"] = intro + entry["notes"]
                    fixed_entries += 1
                    changes.append(
                        f"  Entry {entry_num}: Combined 'instructions' and 'notes' into 'notes'"
                    )

    def walk_sections(sections):
        """Recursively walk through sections and their entries."""
        if not isinstance(sections, list):
            return

        for section in sections:
            if not isinstance(section, dict):
                continue

            # Process entries in this section
            if "entries" in section:
                process_entries(section["entries"])

            # Recursively process nested sections
            if "sections" in section:
                walk_sections(section["sections"])

    # Process top-level entries (if any)
    if "entries" in data:
        process_entries(data["entries"])

    # Process sections
    if "sections" in data:
        walk_sections(data["sections"])

    return {
        "total_entries": total_entries,
        "fixed_entries": fixed_entries,
        "changes": changes,
    }


def write_fixed_file(file_path: str, data: dict) -> None:
    """Write the modified JSON back to the file with proper formatting."""
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)


def main():
    # Find all chapter-*.json files
    data_dir = Path(__file__).parent.parent / "data" / "chapters"
    chapter_files = sorted(data_dir.glob("chapter-*.json"))

    if not chapter_files:
        print(f"No chapter files found in {data_dir}")
        sys.exit(1)

    print(f"Processing {len(chapter_files)} chapter files...\n")

    total_processed = 0
    total_fixed = 0

    for chapter_file in chapter_files:
        with open(chapter_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        result = fix_technique_entries(data)

        if result["fixed_entries"] > 0:
            print(f"{chapter_file.name}:")
            print(f"  Total entries: {result['total_entries']}")
            print(f"  Fixed entries: {result['fixed_entries']}")
            for change in result["changes"]:
                print(change)

            # Write the fixed data back
            with open(chapter_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4, ensure_ascii=False)

            total_processed += 1
            total_fixed += result["fixed_entries"]
            print()

    if total_processed == 0:
        print("No technique entries found that needed fixing.")
    else:
        print(f"\nSummary:")
        print(f"  Files processed: {total_processed}")
        print(f"  Total entries fixed: {total_fixed}")


if __name__ == "__main__":
    main()
