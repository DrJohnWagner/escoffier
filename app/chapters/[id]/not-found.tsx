// app/chapters/[id]/not-found.tsx

import Link from "next/link"

export default function ChapterNotFound() {
    return (
        <main className="max-w-2xl mx-auto py-16 px-4 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 mb-4">
                Chapter not found
            </h1>
            <p className="text-gray-600 mb-8">
                We couldn&rsquo;t find the chapter you were looking for. It may
                not have been migrated into the database yet, or the link may be
                stale.
            </p>
            <Link
                href="/"
                className="inline-block px-5 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors"
            >
                Return to the table of contents
            </Link>
        </main>
    )
}
