#!/usr/bin/env node

// Migrate the cookbook's JSON data files into MongoDB.
//
// Reads:
//   data/JSON/cookbook.json  — master document (metadata + contents + glossary + index + chapters)
//   data/JSON/entries.json   — flat list of all instructional entries
//
// Writes to the collections: cookbook, contents, glossary, index, chapters, entries.
// Each collection is emptied and re-populated so the script is idempotent.
//
// Environment variables:
//   MONGO_URI            Full connection URI (overrides the pieces below)
//   MONGO_HOST           Default: localhost
//   MONGO_PORT           Default: 27018  (host port published by compose.yaml)
//   MONGO_ROOT_USERNAME  Default: root
//   MONGO_ROOT_PASSWORD  Default: example
//   MONGO_DATABASE       Default: escoffier

import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import { MongoClient } from "mongodb"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, "..")
const dataDir = path.join(projectRoot, "data", "JSON")

function buildMongoUri() {
    if (process.env.MONGO_URI) return process.env.MONGO_URI
    const host = process.env.MONGO_HOST || "localhost"
    const port = process.env.MONGO_PORT || "27018"
    const user = encodeURIComponent(process.env.MONGO_ROOT_USERNAME || "root")
    const pass = encodeURIComponent(process.env.MONGO_ROOT_PASSWORD || "example")
    return `mongodb://${user}:${pass}@${host}:${port}/?authSource=admin`
}

async function readJson(filePath) {
    const content = await fs.readFile(filePath, "utf8")
    return JSON.parse(content)
}

// Reads cookbook.json and returns all derived sources in one pass so the
// large file is only parsed once.
async function loadSources() {
    const cookbook = await readJson(path.join(dataDir, "cookbook.json"))
    const entries = await readJson(path.join(dataDir, "entries.json"))
    return { cookbook, entries }
}

// The cookbook document stored in Mongo omits `chapters` (kept in its own
// collection) but retains all other top-level fields: contents, glossary,
// index, menus, press, preface, source, etc.
function extractCookbookDoc(cookbook) {
    const { chapters: _chapters, ...rest } = cookbook
    return rest
}

function extractContents(cookbook) {
    const contents = cookbook.contents
    if (!Array.isArray(contents)) {
        throw new Error("cookbook.json: 'contents' must be an array of parts")
    }
    return contents.map((part) => ({ _id: part.part, ...part }))
}

function extractGlossary(cookbook) {
    const glossary = cookbook.glossary
    if (!Array.isArray(glossary)) {
        throw new Error("cookbook.json: 'glossary' must be an array of entries")
    }
    // Terms are not unique (e.g. "Anglaise" appears multiple times) so we let
    // MongoDB assign its own _id and leave the original term/definition intact.
    return glossary
}

function extractIndex(cookbook) {
    const index = cookbook.index
    if (!Array.isArray(index)) {
        throw new Error("cookbook.json: 'index' must be an array of letter groups")
    }
    return index.map((group) => ({ _id: group.letter, ...group }))
}

function extractChapters(cookbook) {
    const chapters = cookbook.chapters
    if (!Array.isArray(chapters)) {
        throw new Error("cookbook.json: 'chapters' must be an array")
    }
    // Each chapter already carries its own _id (e.g. "chapter-i").
    return chapters
}

function prepareEntries(entries) {
    if (!Array.isArray(entries)) {
        throw new Error("entries.json must be an array of entries")
    }
    // Each entry already carries its own _id (the entry number as a string).
    return entries
}

async function replaceCollection(db, name, docs) {
    const collection = db.collection(name)
    await collection.deleteMany({})
    if (docs.length === 0) {
        console.log(`  ${name}: no documents to insert`)
        return 0
    }
    const result = await collection.insertMany(docs, { ordered: true })
    console.log(`  ${name}: ${result.insertedCount} document(s) inserted`)
    return result.insertedCount
}

async function main() {
    const uri = buildMongoUri()
    const dbName = process.env.MONGO_DATABASE || "escoffier"

    console.log(`Connecting to ${uri.replace(/:[^:@]*@/, ":***@")}`)
    const client = new MongoClient(uri)

    try {
        await client.connect()
        const db = client.db(dbName)
        console.log(`Using database "${dbName}"`)

        console.log("Loading JSON sources...")
        const { cookbook, entries } = await loadSources()

        console.log("Writing collections...")
        await replaceCollection(db, "cookbook", [extractCookbookDoc(cookbook)])
        await replaceCollection(db, "contents", extractContents(cookbook))
        await replaceCollection(db, "glossary", extractGlossary(cookbook))
        await replaceCollection(db, "index", extractIndex(cookbook))
        await replaceCollection(db, "chapters", extractChapters(cookbook))
        await replaceCollection(db, "entries", prepareEntries(entries))

        console.log("Migration complete.")
    } finally {
        await client.close()
    }
}

main().catch((err) => {
    console.error("Migration failed:", err)
    process.exit(1)
})
