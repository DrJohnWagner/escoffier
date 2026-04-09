/**
 * Data validation tests for chapter JSON files.
 *
 * Validates that all chapter-*.json files conform to the JSON schemas
 * defined in data/schemas/.
 */

const { readdirSync, readFileSync } = require("fs")
const { join, dirname } = require("path")
const Ajv = require("ajv")

// Path constants
const DATA_DIR = join(__dirname, "../../data")
const CHAPTERS_DIR = join(DATA_DIR, "chapters")
const SCHEMAS_DIR = join(DATA_DIR, "schemas")

describe("Chapter JSON validation", () => {
    let ajv
    let chapterSchema

    beforeAll(() => {
        // Initialize AJV with all errors and non-strict mode
        ajv = new Ajv({
            allErrors: true,
            strict: false,
            loadSchema: (uri) => {
                // Handle relative references by loading from filesystem
                if (uri.startsWith('./')) {
                    const schemaPath = join(SCHEMAS_DIR, uri.substring(2))
                    if (require('fs').existsSync(schemaPath)) {
                        const schema = JSON.parse(readFileSync(schemaPath, "utf-8"))
                        return Promise.resolve(schema)
                    }
                }
                return Promise.reject(new Error(`Cannot load schema: ${uri}`))
            }
        })

        // Load all schemas except chapter-schema.json and fix relative references
        const schemaFiles = readdirSync(SCHEMAS_DIR).filter(file =>
            file.endsWith(".json") && file !== "chapter-schema.json"
        )

        for (const schemaFile of schemaFiles) {
            const schemaPath = join(SCHEMAS_DIR, schemaFile)
            let schema = JSON.parse(readFileSync(schemaPath, "utf-8"))

            // Fix relative references to use full $id URLs
            const schemaString = JSON.stringify(schema)
            const fixedSchemaString = schemaString
                .replace(/"\.\/content-block-schema\.json"/g, '"https://example.com/schemas/content-block.json"')
                .replace(/"\.\/recipe-schema\.json"/g, '"https://example.com/schemas/recipe.json"')
                .replace(/"\.\/contents-schema\.json"/g, '"https://example.com/schemas/contents.json"')
                .replace(/"\.\/menus-schema\.json"/g, '"https://example.com/schemas/menus.json"')
                .replace(/"\.\/glossary-schema\.json"/g, '"https://example.com/schemas/glossary.json"')
                .replace(/"\.\/index-schema\.json"/g, '"https://example.com/schemas/index.json"')
            schema = JSON.parse(fixedSchemaString)

            ajv.addSchema(schema)
        }

        // Load the chapter schema and fix relative references
        chapterSchema = JSON.parse(
            readFileSync(join(SCHEMAS_DIR, "chapter-schema.json"), "utf-8")
        )

        // Fix relative references to use full $id URLs
        const schemaString = JSON.stringify(chapterSchema)
        const fixedSchemaString = schemaString
            .replace(/"\.\/content-block-schema\.json"/g, '"https://example.com/schemas/content-block.json"')
            .replace(/"\.\/recipe-schema\.json"/g, '"https://example.com/schemas/recipe.json"')
        chapterSchema = JSON.parse(fixedSchemaString)
    })

    test("all chapter-*.json files exist and are valid JSON", () => {
        const chapterFiles = readdirSync(CHAPTERS_DIR).filter(file =>
            file.startsWith("chapter-") && file.endsWith(".json")
        )

        expect(chapterFiles.length).toBeGreaterThan(0)

        for (const chapterFile of chapterFiles) {
            const chapterPath = join(CHAPTERS_DIR, chapterFile)

            // Test that file can be parsed as JSON
            expect(() => {
                JSON.parse(readFileSync(chapterPath, "utf-8"))
            }).not.toThrow()
        }
    })

    test("all chapter-*.json files conform to chapter-schema.json", () => {
        const chapterFiles = readdirSync(CHAPTERS_DIR).filter(file =>
            file.startsWith("chapter-") && file.endsWith(".json")
        )

        // Compile the chapter schema directly
        const validate = ajv.compile(chapterSchema)

        for (const chapterFile of chapterFiles) {
            const chapterPath = join(CHAPTERS_DIR, chapterFile)
            const chapterData = JSON.parse(readFileSync(chapterPath, "utf-8"))

            const valid = validate(chapterData)

            if (!valid) {
                console.error(`Validation errors for ${chapterFile}:`)
                console.error(validate.errors)
            }

            expect(valid).toBe(true)
        }
    })

    test("chapter files have required top-level properties", () => {
        const chapterFiles = readdirSync(CHAPTERS_DIR).filter(file =>
            file.startsWith("chapter-") && file.endsWith(".json")
        )

        for (const chapterFile of chapterFiles) {
            const chapterPath = join(CHAPTERS_DIR, chapterFile)
            const chapterData = JSON.parse(readFileSync(chapterPath, "utf-8"))

            // Check required properties from chapter-schema.json
            expect(chapterData).toHaveProperty("chapter")
            expect(chapterData).toHaveProperty("id")
            expect(chapterData).toHaveProperty("title")
            expect(typeof chapterData.chapter).toBe("string")
            expect(typeof chapterData.id).toBe("string")
            expect(typeof chapterData.title).toBe("string")

            // Check that id matches filename pattern
            const expectedId = chapterFile.replace(".json", "")
            expect(chapterData.id).toBe(expectedId)
        }
    })

    test("chapter entries have valid types", () => {
        const chapterFiles = readdirSync(CHAPTERS_DIR).filter(file =>
            file.startsWith("chapter-") && file.endsWith(".json")
        )

        const validTypes = ["recipe", "principle", "technique", "definition"]

        for (const chapterFile of chapterFiles) {
            const chapterPath = join(CHAPTERS_DIR, chapterFile)
            const chapterData = JSON.parse(readFileSync(chapterPath, "utf-8"))

            // Recursively check all entries in sections
            function checkEntries(sections) {
                for (const section of sections) {
                    if (section.entries) {
                        for (const entry of section.entries) {
                            expect(entry).toHaveProperty("type")
                            expect(validTypes).toContain(entry.type)
                            expect(entry).toHaveProperty("number")
                            expect(entry).toHaveProperty("title")
                        }
                    }
                    if (section.sections) {
                        checkEntries(section.sections)
                    }
                }
            }

            if (chapterData.sections) {
                checkEntries(chapterData.sections)
            }
        }
    })
})