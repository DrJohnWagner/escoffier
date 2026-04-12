#!/usr/bin/env node

// Validate the two canonical data files against their JSON schemas.
//
// Validates:
//   data/JSON/cookbook.json  against  data/schemas/cookbook-schema.json
//   data/JSON/entries.json   against  data/schemas/entries-schema.json
//
// Exit codes:
//   0  all files valid
//   1  unexpected error
//   2  one or more files invalid
//   3  schema loading failed

import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import Ajv from "ajv"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, "..")
const schemasDir = path.join(projectRoot, "data", "schemas")
const dataDir = path.join(projectRoot, "data", "JSON")

async function readJson(filePath) {
    const content = await fs.readFile(filePath, "utf8")
    return JSON.parse(content)
}

async function buildAjv() {
    const ajv = new Ajv({ allErrors: true, strict: false })
    const schemaFiles = (await fs.readdir(schemasDir)).filter((f) =>
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

async function validateFile(ajv, schemaId, dataPath) {
    const label = path.relative(projectRoot, dataPath)
    process.stdout.write(`Validating ${label} ... `)

    const data = await readJson(dataPath)
    const validateFn = ajv.getSchema(schemaId)
    if (!validateFn) {
        console.log("ERROR")
        console.error(`  Schema '${schemaId}' not found in registry`)
        return false
    }

    const valid = validateFn(data)
    if (valid) {
        console.log("VALID")
        return true
    }

    console.log("INVALID")
    const errors = validateFn.errors ?? []
    const shown = errors.slice(0, 5)
    shown.forEach((e) => {
        console.error(`  ${e.instancePath || "/"} — ${e.message}`)
    })
    if (errors.length > 5) {
        console.error(`  ... and ${errors.length - 5} more error(s)`)
    }
    return false
}

async function main() {
    let ajv
    try {
        ajv = await buildAjv()
    } catch (err) {
        console.error("Failed to load schemas:", err.message)
        process.exit(3)
    }

    const checks = [
        [
            "https://example.com/schemas/cookbook-schema.json",
            path.join(dataDir, "cookbook.json"),
        ],
        [
            "https://example.com/schemas/entries-schema.json",
            path.join(dataDir, "entries.json"),
        ],
    ]

    let allValid = true
    for (const [schemaId, dataPath] of checks) {
        const ok = await validateFile(ajv, schemaId, dataPath)
        if (!ok) allValid = false
    }

    process.exit(allValid ? 0 : 2)
}

main().catch((err) => {
    console.error("Unexpected error:", err.message)
    process.exit(1)
})
