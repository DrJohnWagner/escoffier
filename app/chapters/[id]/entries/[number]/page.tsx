// app/chapters/[id]/entries/[number]/page.tsx

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import Entry from "@/components/Entry"
import PrintButton from "@/components/buttons/PrintButton"
import { getEntry, getAllEntries } from "@/functions/apiClient"

type EntryRouteParams = { id: string; number: string }

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
    const entry = await getEntry(number)

    if (!entry) {
        notFound()
    }

    return (
        <main className="entry-print-shell max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="mb-4 print:hidden flex justify-end">
                <PrintButton />
            </div>
            <nav className="mb-6 text-sm text-gray-500 print:hidden">
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
            <div className="print-recipe-card">
                <Entry entry={entry} />
            </div>

            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }

                    .print-recipe-card,
                    .print-recipe-card * {
                        visibility: visible;
                    }

                    .print-recipe-card {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                    }
                }
            `}</style>
        </main>
    )
}
