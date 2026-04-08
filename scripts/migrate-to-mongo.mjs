#!/usr/bin/env node

// Migrate the cookbook's JSON data files into MongoDB.
//
// Reads:
//   data/cookbook.json
//   data/contents.json
//   data/glossary.json
//   data/index.json
//   data/chapters/chapter-*.json
//
// Writes to the collections: cookbook, contents, glossary, index, chapters.
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
const dataDir = path.join(projectRoot, "data")
const chaptersDir = path.join(dataDir, "chapters")

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

async function loadCookbook() {
    const cookbook = await readJson(path.join(dataDir, "cookbook.json"))
    return { ...cookbook, _id: "cookbook" }
}

async function loadContents() {
    const contents = await readJson(path.join(dataDir, "contents.json"))
    if (!Array.isArray(contents)) {
        throw new Error("contents.json must be an array of parts")
    }
    return contents.map((part) => ({ _id: part.part, ...part }))
}

async function loadGlossary() {
    const glossary = await readJson(path.join(dataDir, "glossary.json"))
    if (!Array.isArray(glossary)) {
        throw new Error("glossary.json must be an array of entries")
    }
    // Terms are not unique (e.g. "Anglaise" appears multiple times) so we let
    // MongoDB assign its own _id and leave the original term/definition intact.
    return glossary
}

async function loadIndex() {
    const index = await readJson(path.join(dataDir, "index.json"))
    if (!Array.isArray(index)) {
        throw new Error("index.json must be an array of letter groups")
    }
    return index.map((group) => ({ _id: group.letter, ...group }))
}

async function loadChapters() {
    const entries = await fs.readdir(chaptersDir)
    const chapterFiles = entries
        .filter((name) => /^chapter-[^.]+\.json$/i.test(name))
        .sort()

    const chapters = []
    for (const name of chapterFiles) {
        const chapter = await readJson(path.join(chaptersDir, name))
        if (!chapter.id) {
            throw new Error(`${name} is missing required "id" field`)
        }
        chapters.push({ _id: chapter.id, ...chapter })
    }
    return chapters
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
        const [cookbook, contents, glossary, indexDocs, chapters] =
            await Promise.all([
                loadCookbook(),
                loadContents(),
                loadGlossary(),
                loadIndex(),
                loadChapters(),
            ])

        console.log("Writing collections...")
        await replaceCollection(db, "cookbook", [cookbook])
        await replaceCollection(db, "contents", contents)
        await replaceCollection(db, "glossary", glossary)
        await replaceCollection(db, "index", indexDocs)
        await replaceCollection(db, "chapters", chapters)

        console.log("Migration complete.")
    } finally {
        await client.close()
    }
}

main().catch((err) => {
    console.error("Migration failed:", err)
    process.exit(1)
})
