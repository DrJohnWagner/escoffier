// app/glossary/page.tsx

import type { Metadata } from "next"
import Glossary from "@/components/Glossary"
import DataLoadError from "@/components/DataLoadError"
import { getGlossary } from "@/functions/apiClient"

export const metadata: Metadata = {
    title: "Glossary | Escoffier's Digital Guide",
}

export default async function GlossaryPage() {
    const glossaryData = await getGlossary()

    if (!glossaryData) {
        return <DataLoadError resource="glossary" />
    }

    return (
        <main>
            <Glossary data={glossaryData} />
        </main>
    )
}
