import path from "path"
import fs from "fs/promises"

type JsonValue = string | number | boolean | null | JsonObject | JsonArray
interface JsonObject {
    [key: string]: JsonValue
}
type JsonArray = Array<JsonValue>

type GenericJson = JsonObject | JsonArray

export default async function getData(
    relativePath: string[]
): Promise<GenericJson | null> {
    const absolutePath = [process.cwd(), "data", ...relativePath]
    const filePath = path.join(...absolutePath)
    try {
        const jsonData = await fs.readFile(filePath, "utf-8")
        return JSON.parse(jsonData)
    } catch (error) {
        console.error(`Error: Failed to read "${filePath}":`, error)
        return null
    }
}
