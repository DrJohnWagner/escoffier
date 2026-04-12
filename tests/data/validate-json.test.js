/**
 * Schema validation and structural-invariant tests for the two canonical
 * data files: data/JSON/cookbook.json and data/JSON/entries.json.
 *
 * Each test uses the JSON schemas in data/schemas/ via AJV, then checks
 * cross-file consistency (e.g. every entryID in the chapter tree must
 * correspond to a real entry in entries.json).
 *
 * Run with:
 *   npm run test:data
 */

import { readFile, readdir } from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import Ajv from "ajv"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, "../..")
const schemasDir = path.join(projectRoot, "data", "schemas")
const dataDir = path.join(projectRoot, "data", "JSON")

async function readJson(filePath) {
    const content = await readFile(filePath, "utf8")
    return JSON.parse(content)
}

async function buildAjv() {
    const ajv = new Ajv({ allErrors: true, strict: false })
    const schemaFiles = (await readdir(schemasDir)).filter((f) =>
        f.endsWith(".json")
    )
    for (const file of schemaFiles) {
        const schema = await readJson(path.join(schemasDir, file))
        if (schema.$id && !ajv.getSchema(schema.$id)) {
            ajv.addSchema(schema)
        }
    }
    return ajv
}

/** Walk all sections (recursively) and collect every entryID. */
function collectEntryIDs(sections) {
    const ids = []
    for (const sec of sections) {
        ids.push(...(sec.entryIDs ?? []))
        ids.push(...collectEntryIDs(sec.sections ?? []))
    }
    return ids
}

// ---------------------------------------------------------------------------
// Shared fixtures — built once for the whole suite.
// ---------------------------------------------------------------------------

let ajv
let cookbook
let entries

beforeAll(async () => {
    ;[ajv, cookbook, entries] = await Promise.all([
        buildAjv(),
        readJson(path.join(dataDir, "cookbook.json")),
        readJson(path.join(dataDir, "entries.json")),
    ])
}, 60_000)

// ---------------------------------------------------------------------------
// cookbook.json — schema validity
// ---------------------------------------------------------------------------

describe("cookbook.json — schema validation", () => {
    test("validates against cookbook-schema.json", () => {
        const validate = ajv.getSchema(
            "https://example.com/schemas/cookbook-schema.json"
        )
        expect(validate).toBeDefined()

        const valid = validate(cookbook)
        if (!valid) {
            console.error(
                "First 5 errors:",
                JSON.stringify(validate.errors?.slice(0, 5), null, 2)
            )
        }
        expect(valid).toBe(true)
    })
})

// ---------------------------------------------------------------------------
// cookbook.json — structural invariants
// ---------------------------------------------------------------------------

describe("cookbook.json — structural invariants", () => {
    test("has exactly 23 chapters", () => {
        expect(Array.isArray(cookbook.chapters)).toBe(true)
        expect(cookbook.chapters).toHaveLength(23)
    })

    test("chapters are ordered I through XXIII", () => {
        const expected = [
            "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
            "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX",
            "XX", "XXI", "XXII", "XXIII",
        ]
        const actual = cookbook.chapters.map((ch) => ch.chapter)
        expect(actual).toEqual(expected)
    })

    test("every chapter has _id, chapter, title, introduction[], and sections[]", () => {
        for (const ch of cookbook.chapters) {
            expect(typeof ch._id).toBe("string")
            expect(typeof ch.chapter).toBe("string")
            expect(typeof ch.title).toBe("string")
            expect(Array.isArray(ch.introduction)).toBe(true)
            expect(Array.isArray(ch.sections)).toBe(true)
            expect(ch.sections.length).toBeGreaterThan(0)
        }
    })

    test("every section carries _id, title, introduction[], entryIDs[], and sections[]", () => {
        function checkSections(sections) {
            for (const sec of sections) {
                expect(typeof sec._id).toBe("string")
                expect(typeof sec.title).toBe("string")
                expect(Array.isArray(sec.introduction)).toBe(true)
                expect(Array.isArray(sec.entryIDs)).toBe(true)
                sec.entryIDs.forEach((id) => expect(typeof id).toBe("string"))
                expect(Array.isArray(sec.sections)).toBe(true)
                checkSections(sec.sections)
            }
        }
        for (const ch of cookbook.chapters) {
            checkSections(ch.sections)
        }
    })

    test("section _ids are prefixed with their chapter _id", () => {
        for (const ch of cookbook.chapters) {
            function check(sections) {
                for (const sec of sections) {
                    expect(sec._id.startsWith(ch._id + "/")).toBe(true)
                    check(sec.sections ?? [])
                }
            }
            check(ch.sections)
        }
    })

    test("glossary is a non-empty array and every entry has a string term", () => {
        expect(Array.isArray(cookbook.glossary)).toBe(true)
        expect(cookbook.glossary.length).toBeGreaterThan(0)
        for (const g of cookbook.glossary) {
            expect(typeof g.term).toBe("string")
        }
    })

    test("index has 26 or fewer letter groups, each with a single uppercase letter", () => {
        expect(Array.isArray(cookbook.index)).toBe(true)
        for (const group of cookbook.index) {
            expect(group.letter).toMatch(/^[A-Z]$/)
            expect(Array.isArray(group.entries)).toBe(true)
            expect(group.entries.length).toBeGreaterThan(0)
        }
    })

    test("index letter groups are in alphabetical order", () => {
        const letters = cookbook.index.map((g) => g.letter)
        expect(letters).toEqual([...letters].sort())
    })

    test("table of contents has exactly 2 parts (I and II)", () => {
        expect(cookbook.contents).toHaveLength(2)
        expect(cookbook.contents.map((p) => p.part)).toEqual(["I", "II"])
    })

    test("table of contents chapter count matches the chapters array", () => {
        const tocIds = cookbook.contents.flatMap((part) =>
            part.chapters.map((ch) => ch.id)
        )
        const chapterIds = cookbook.chapters.map((ch) => ch._id)
        expect(tocIds).toEqual(chapterIds)
    })
})

// ---------------------------------------------------------------------------
// entries.json — schema validity
// ---------------------------------------------------------------------------

describe("entries.json — schema validation", () => {
    test(
        "validates against entries-schema.json",
        () => {
            const validate = ajv.getSchema(
                "https://example.com/schemas/entries-schema.json"
            )
            expect(validate).toBeDefined()

            const valid = validate(entries)
            if (!valid) {
                console.error(
                    "First 5 errors:",
                    JSON.stringify(validate.errors?.slice(0, 5), null, 2)
                )
            }
            expect(valid).toBe(true)
        },
        60_000
    )
})

// ---------------------------------------------------------------------------
// entries.json — structural invariants
// ---------------------------------------------------------------------------

describe("entries.json — structural invariants", () => {
    test("contains more than 2000 entries", () => {
        expect(entries.length).toBeGreaterThan(2000)
    })

    test("all entry _ids are unique strings", () => {
        const ids = entries.map((e) => e._id)
        const unique = new Set(ids)
        expect(unique.size).toBe(ids.length)
        ids.forEach((id) => expect(typeof id).toBe("string"))
    })

    test("every entry has required base fields", () => {
        for (const entry of entries) {
            expect(typeof entry._id).toBe("string")
            expect(typeof entry.title).toBe("string")
            expect(["recipe", "principle", "technique", "definition"]).toContain(
                entry.type
            )
            expect(typeof entry.chapter_id).toBe("string")
            expect(typeof entry.section_id).toBe("string")
            expect(Array.isArray(entry.section_path)).toBe(true)
            expect(entry.section_path.length).toBeGreaterThan(0)
            entry.section_path.forEach((s) => expect(typeof s).toBe("string"))
        }
    })

    test("recipe entries have ingredients and instructions arrays", () => {
        const recipes = entries.filter((e) => e.type === "recipe")
        expect(recipes.length).toBeGreaterThan(0)
        for (const r of recipes) {
            expect(Array.isArray(r.ingredients)).toBe(true)
            expect(Array.isArray(r.instructions)).toBe(true)
        }
    })

    test("there are entries of all four types", () => {
        const types = new Set(entries.map((e) => e.type))
        expect(types.has("recipe")).toBe(true)
        expect(types.has("technique")).toBe(true)
        expect(types.has("principle")).toBe(true)
        expect(types.has("definition")).toBe(true)
    })

    test("all chapter_ids match the pattern chapter-[roman]", () => {
        const pattern = /^chapter-[ivxlcdm]+$/
        for (const entry of entries) {
            expect(entry.chapter_id).toMatch(pattern)
        }
    })

    test("all section_ids are prefixed with their chapter_id", () => {
        for (const entry of entries) {
            expect(entry.section_id.startsWith(entry.chapter_id + "/")).toBe(true)
        }
    })
})

// ---------------------------------------------------------------------------
// Cross-file consistency
// ---------------------------------------------------------------------------

describe("cross-file consistency", () => {
    test("every entryID in the chapter tree exists in entries.json", () => {
        const entrySet = new Set(entries.map((e) => e._id))
        for (const ch of cookbook.chapters) {
            const ids = collectEntryIDs(ch.sections)
            for (const id of ids) {
                expect(entrySet.has(id)).toBe(true)
            }
        }
    })

    test("every entry's chapter_id corresponds to a real chapter", () => {
        const chapterSet = new Set(cookbook.chapters.map((ch) => ch._id))
        for (const entry of entries) {
            expect(chapterSet.has(entry.chapter_id)).toBe(true)
        }
    })

    test("every entry's section_id corresponds to a real section", () => {
        const sectionSet = new Set()
        function collectSections(sections) {
            for (const sec of sections) {
                sectionSet.add(sec._id)
                collectSections(sec.sections ?? [])
            }
        }
        for (const ch of cookbook.chapters) {
            collectSections(ch.sections)
        }
        for (const entry of entries) {
            expect(sectionSet.has(entry.section_id)).toBe(true)
        }
    })

    test("the total number of entryIDs across all chapters equals the entries array length", () => {
        let total = 0
        for (const ch of cookbook.chapters) {
            total += collectEntryIDs(ch.sections).length
        }
        expect(total).toBe(entries.length)
    })
})
