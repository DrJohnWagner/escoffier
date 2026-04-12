// app/chapters/[id]/page.tsx

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Chapter from "@/components/Chapter"
import { getContents, getChapter, getEntries } from "@/functions/apiClient"
import { InstructionalEntry } from "@/types/generated.ts/entry-schema"

type ChapterRouteParams = { id: string }

export async function generateStaticParams(): Promise<ChapterRouteParams[]> {
    const contents = await getContents()
    if (!contents) {
        if (process.env.NODE_ENV !== "production") {
            console.warn(
                "generateStaticParams: /api/contents returned null; " +
                    "no chapter routes will be statically generated"
            )
        }
        return []
    }
    return contents.flatMap((part) =>
        part.chapters.map((chapter) => ({ id: chapter.id }))
    )
}

export async function generateMetadata({
    params,
}: {
    params: Promise<ChapterRouteParams>
}): Promise<Metadata> {
    const { id } = await params
    const chapter = await getChapter(id)
    if (!chapter) {
        return {
            title: "Chapter not found | Escoffier's Digital Guide",
        }
    }
    return {
        title: `Chapter ${chapter.chapter}: ${chapter.title} | Escoffier's Digital Guide`,
    }
}

export default async function ChapterPage({
    params,
}: {
    params: Promise<ChapterRouteParams>
}) {
    const { id } = await params
    const [chapter, entriesArray] = await Promise.all([
        getChapter(id),
        getEntries(id),
    ])

    if (!chapter) {
        notFound()
    }

    const entries = new Map<string, InstructionalEntry>(
        (entriesArray ?? []).map((e) => [e._id, e])
    )

    return <Chapter data={chapter} entries={entries} />
}
