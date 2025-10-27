// scripts/validate-data.js

const fs = require("fs/promises")
const path = require("path")
const Ajv = require("ajv") // A popular JSON Schema validator library
const addFormats = require("ajv-formats")

async function validateCookbook() {
    const ajv = new Ajv({ allErrors: true })
    addFormats(ajv) // Adds support for formats like "uri"

    try {
        console.log("--- Starting Full Cookbook Validation ---")

        // --- Step 1: Load all schemas ---
        console.log("Loading schemas...")
        const cookbookSchema = JSON.parse(
            await fs.readFile(
                path.join(
                    __dirname,
                    "..",
                    "data",
                    "schemas",
                    "cookbook-schema.json"
                ),
                "utf-8"
            )
        )
        const chapterSchema = JSON.parse(
            await fs.readFile(
                path.join(
                    __dirname,
                    "..",
                    "data",
                    "schemas",
                    "chapter-schema.json"
                ),
                "utf-8"
            )
        )
        // ... load all other schemas needed for validation
        const contentsSchema = JSON.parse(
            await fs.readFile(
                path.join(
                    __dirname,
                    "..",
                    "data",
                    "schemas",
                    "contents-schema.json"
                ),
                "utf-8"
            )
        )
        const contentBlockSchema = JSON.parse(
            await fs.readFile(
                path.join(
                    __dirname,
                    "..",
                    "data",
                    "schemas",
                    "content-block-schema.json"
                ),
                "utf-8"
            )
        )
        const recipeSchema = JSON.parse(
            await fs.readFile(
                path.join(
                    __dirname,
                    "..",
                    "data",
                    "schemas",
                    "recipe-schema.json"
                ),
                "utf-8"
            )
        )

        // Add all schemas to the validator instance so it can resolve $refs
        ajv.addSchema(contentsSchema)
        ajv.addSchema(contentBlockSchema)
        ajv.addSchema(recipeSchema)
        ajv.addSchema(chapterSchema)

        // --- Step 2: Validate the main cookbook.json file ---
        console.log("Validating main cookbook.json...")
        const cookbookData = JSON.parse(
            await fs.readFile(
                path.join(__dirname, "..", "data", "cookbook.json"),
                "utf-8"
            )
        )
        const isCookbookValid = ajv.validate(cookbookSchema, cookbookData)

        if (!isCookbookValid) {
            console.error("Validation failed for cookbook.json:", ajv.errors)
            throw new Error("Main cookbook file is invalid.")
        }
        console.log("✅ cookbook.json is valid.")

        // --- Step 3: Extract chapter IDs and validate each chapter file ---
        const chapterIds = cookbookData.contents.flatMap((part) =>
            part.chapters.map((chapter) => chapter.id)
        )
        console.log(`Found ${chapterIds.length} chapters to validate...`)

        for (const id of chapterIds) {
            const chapterFilename = `${id}.json`
            const chapterFilePath = path.join(
                __dirname,
                "..",
                "data",
                "chapters",
                chapterFilename
            )

            // 3a: Existence Check
            try {
                await fs.access(chapterFilePath)
            } catch {
                throw new Error(`Missing chapter file: ${chapterFilename}`)
            }

            // 3b: Content Validation
            const chapterData = JSON.parse(
                await fs.readFile(chapterFilePath, "utf-8")
            )
            const isChapterValid = ajv.validate(chapterSchema, chapterData)
            if (!isChapterValid) {
                console.error(
                    `Validation failed for ${chapterFilename}:`,
                    ajv.errors
                )
                throw new Error(`Invalid content in ${chapterFilename}`)
            }
            console.log(`✅ ${chapterFilename} is valid.`)
        }

        console.log("\n--- 🎉 All data validated successfully! ---")
    } catch (error) {
        console.error("\n--- ❌ Validation Process Failed ---")
        console.error(error.message)
        process.exit(1) // Exit with a failure code
    }
}

validateCookbook()
