#!/usr/bin/env node

// 1. USE IMPORTS INSTEAD OF REQUIRES
import fs from "fs/promises" // Use the promises-based API
import path from "path"
import Ajv from "ajv"

// --- MAIN ASYNC FUNCTION ---
// We wrap the logic in an async function to use top-level await.
async function main() {
    /**
     * Asynchronously reads and parses a JSON file.
     * @param {string} p Path to the JSON file.
     * @returns {Promise<any>} The parsed JSON object.
     */
    async function readJson(p) {
        const fileContent = await fs.readFile(p, "utf8")
        return JSON.parse(fileContent)
    }

    // --- SETUP AND SCHEMA LOADING (NOW ASYNC) ---
    const projectRoot = process.cwd()
    const schemaDir = path.join(projectRoot, "data", "schemas")

    const ajv = new Ajv({ allErrors: true, strict: false })

    // Asynchronously read schema files and add them to Ajv
    try {
        const schemaFiles = (await fs.readdir(schemaDir)).filter((f) =>
            f.endsWith(".json")
        )

        for (const file of schemaFiles) {
            const fullPath = path.join(schemaDir, file)
            const schema = await readJson(fullPath)

            const key = schema.$id || `file://${fullPath}`
            if (!ajv.getSchema(key)) {
                ajv.addSchema(schema, key)
            }

            // Best-effort alternate key registration
            const altKey = `https://example.com/schemas/${file}`
            if (!ajv.getSchema(altKey)) {
                try {
                    ajv.addSchema(schema, altKey)
                } catch (err) {
                    // Ignore if this fails
                }
            }
        }
    } catch (err) {
        console.error("Error loading schemas:", err.message)
        process.exit(3)
    }

    // --- COMPILE THE MAIN VALIDATION SCHEMA ---
    let validate
    try {
        const chapterSchemaPath = path.join(schemaDir, "chapter-schema.json")
        const chapterSchema = await readJson(chapterSchemaPath)

        const schemaKey = chapterSchema.$id || `file://${chapterSchemaPath}`
        const existing = ajv.getSchema(schemaKey)
        validate = existing || ajv.compile(chapterSchema)
    } catch (err) {
        console.error("Failed to compile main chapter schema:", err.message)
        process.exit(4)
    }

    // --- 2. READ DATA FROM STDIN ---
    let data
    try {
        let stdinContent = ""
        // Use modern `for await...of` to read the stdin stream
        for await (const chunk of process.stdin) {
            stdinContent += chunk
        }
        data = JSON.parse(stdinContent)
    } catch (err) {
        console.error(
            "Error: Failed to read or parse JSON from stdin.",
            err.message
        )
        process.exit(5)
    }

    // --- PERFORM VALIDATION ---
    const valid = validate(data)
    if (valid) {
        console.log(
            "VALID: The provided JSON data is valid according to the schema."
        )
        process.exit(0)
    } else {
        console.error("INVALID: The provided JSON data failed validation.")
        console.error(JSON.stringify(validate.errors, null, 2))
        process.exit(2)
    }
}

// --- EXECUTE THE SCRIPT ---
// Call the main function and add a top-level catch for any unexpected errors.
main().catch((error) => {
    console.error("An unexpected error occurred:", error.message)
    process.exit(1)
})
