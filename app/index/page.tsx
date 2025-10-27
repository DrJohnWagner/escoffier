import path from "path"
import fs from "fs/promises"
import Index from "@/components/Index"

async function getIndexData() {
    const filePath = path.join(process.cwd(), "data", "index.json")
    try {
        const jsonData = await fs.readFile(filePath, "utf-8")
        return JSON.parse(jsonData)
    } catch (error) {
        console.error("Failed to read index.json:", error)
        return null
    }
}

export default async function IndexPage() {
    const indexData = await getIndexData()

    if (!indexData) {
        return (
            <main className="text-center p-12">
                <h1>Error: Index data could not be loaded.</h1>
            </main>
        )
    }

    return (
        <main>
            <Index data={indexData} />
        </main>
    )
}
