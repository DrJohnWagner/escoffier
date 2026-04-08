// app/index/page.tsx

import type { Metadata } from "next"
import Index from "@/components/Index"
import DataLoadError from "@/components/DataLoadError"
import { getIndexData } from "@/functions/apiClient"

export const metadata: Metadata = {
    title: "Index | Escoffier's Digital Guide",
}

export default async function IndexPage() {
    const indexData = await getIndexData()

    if (!indexData) {
        return <DataLoadError resource="index" />
    }

    return (
        <main>
            <Index data={indexData} />
        </main>
    )
}
