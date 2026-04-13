// app/chapters/[id]/page.tsx

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Chapter from "@/components/Chapter"
import { getContents, getChapter, getEntries } from "@/functions/apiClient"
import { CookbookTableOfContents } from "@/types/generated.ts/contents-schema"
import { InstructionalEntry } from "@/types/generated.ts/entry-schema"

type ChapterRouteParams = { id: string }

interface AdjacentChapter {
    id: string
    title: string
}

function flattenContentsChapters(
    contents: CookbookTableOfContents | []
): AdjacentChapter[] {
    return contents.flatMap((part) =>
        part.chapters.map((chapter) => ({
            id: chapter.id,
            title: chapter.title,
        }))
    )
}

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
    return flattenContentsChapters(contents).map((chapter) => ({
        id: chapter.id,
    }))
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
    const [chapter, contents, entriesArray] = await Promise.all([
        getChapter(id),
        getContents(),
        getEntries(id),
    ])

    if (!chapter) {
        notFound()
    }

    const entries = new Map<string, InstructionalEntry>(
        (entriesArray ?? []).map((e) => [e._id, e])
    )

    const chapterSequence = contents ? flattenContentsChapters(contents) : []
    const currentChapterIndex = chapterSequence.findIndex(
        (sequenceChapter) => sequenceChapter.id === id
    )
    const prevChapter =
        currentChapterIndex > 0
            ? chapterSequence[currentChapterIndex - 1]
            : undefined
    const nextChapter =
        currentChapterIndex >= 0
            ? chapterSequence[currentChapterIndex + 1]
            : undefined

    return (
        <Chapter
            data={chapter}
            entries={entries}
            prevChapter={prevChapter}
            nextChapter={nextChapter}
        />
    )
}
