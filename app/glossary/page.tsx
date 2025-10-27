import path from "path"
import fs from "fs/promises"
import Glossary from "@/components/Glossary" // Import our new component

// Helper function to fetch the glossary data
async function getGlossaryData() {
    const filePath = path.join(process.cwd(), "data", "glossary.json")
    try {
        const jsonData = await fs.readFile(filePath, "utf-8")
        return JSON.parse(jsonData)
    } catch (error) {
        console.error("Failed to read glossary.json:", error)
        return null
    }
}

// This is the page component for the /glossary route
export default async function GlossaryPage() {
    const glossaryData = await getGlossaryData()

    if (!glossaryData) {
        return (
            <main className="text-center p-12">
                <h1>Error: Glossary data could not be loaded.</h1>
            </main>
        )
    }

    return (
        <main>
            <Glossary data={glossaryData} />
        </main>
    )
}
