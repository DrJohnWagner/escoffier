// app/chapters/[id]/entries/[number]/page.tsx

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import Entry from "@/components/Entry"
import EntryLink from "@/components/EntryLink"
import { ChapterSection } from "@/types/generated.ts/chapter-schema"
import { InstructionalEntry } from "@/types/generated.ts/entry-schema"
import {
    getChapter,
    getEntries,
    getEntry,
    getAllEntries,
} from "@/functions/apiClient"

type EntryRouteParams = { id: string; number: string }

interface OrderedChapterEntry {
    entryNumber: string
    title?: string
}

function flattenChapterEntries(
    sections: ChapterSection[],
    entriesById: Map<string, InstructionalEntry>
): OrderedChapterEntry[] {
    return sections.flatMap((section) => {
        const directEntries = (section.entryIDs ?? []).map((entryNumber) => ({
            entryNumber,
            title: entriesById.get(entryNumber)?.title,
        }))
        const nestedEntries = flattenChapterEntries(
            section.sections ?? [],
            entriesById
        )
        return [...directEntries, ...nestedEntries]
    })
}

export async function generateStaticParams(): Promise<EntryRouteParams[]> {
    const entries = await getAllEntries()
    if (!entries) {
        if (process.env.NODE_ENV !== "production") {
            console.warn(
                "generateStaticParams: /api/entries returned null; " +
                    "no entry routes will be statically generated"
            )
        }
        return []
    }
    return entries.map((e) => ({ id: e.chapter_id, number: e._id }))
}

export async function generateMetadata({
    params,
}: {
    params: Promise<EntryRouteParams>
}): Promise<Metadata> {
    const { number } = await params
    const entry = await getEntry(number)
    if (!entry) {
        return { title: "Entry not found | Escoffier's Digital Guide" }
    }
    return {
        title: `${entry._id} — ${entry.title} | Escoffier's Digital Guide`,
    }
}

export default async function EntryPage({
    params,
}: {
    params: Promise<EntryRouteParams>
}) {
    const { id, number } = await params
    const [entry, chapter, entriesArray] = await Promise.all([
        getEntry(number),
        getChapter(id),
        getEntries(id),
    ])

    if (!entry) {
        notFound()
    }

    const entriesById = new Map<string, InstructionalEntry>(
        (entriesArray ?? []).map((chapterEntry) => [
            chapterEntry._id,
            chapterEntry,
        ])
    )

    const orderedEntries = chapter
        ? flattenChapterEntries(chapter.sections, entriesById)
        : []
    const currentIndex = orderedEntries.findIndex(
        (orderedEntry) => orderedEntry.entryNumber === number
    )
    const previousEntry =
        currentIndex > 0 ? orderedEntries[currentIndex - 1] : undefined
    const nextEntry =
        currentIndex >= 0 ? orderedEntries[currentIndex + 1] : undefined

    return (
        <main className="entry-print-page max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <nav className="entry-print-breadcrumb mb-6 text-sm text-gray-500">
                <Link
                    href={`/chapters/${id}`}
                    className="text-blue-600 hover:underline font-medium"
                >
                    ← Back to chapter
                </Link>
                {entry.section_path && entry.section_path.length > 0 && (
                    <span className="ml-3">
                        {entry.section_path.join(" › ")}
                    </span>
                )}
            </nav>
            <Entry entry={entry} showPrintButton={true} />
            {(previousEntry || nextEntry) && (
                <nav className="mt-10 pt-6 border-t border-gray-200 flex flex-wrap gap-4 text-sm">
                    {previousEntry && (
                        <EntryLink
                            chapterId={id}
                            entryNumber={previousEntry.entryNumber}
                            title={previousEntry.title}
                            direction="previous"
                        />
                    )}
                    {nextEntry && (
                        <EntryLink
                            chapterId={id}
                            entryNumber={nextEntry.entryNumber}
                            title={nextEntry.title}
                            direction="next"
                        />
                    )}
                </nav>
            )}
        </main>
    )
}
