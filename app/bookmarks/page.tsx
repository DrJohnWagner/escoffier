"use client"

import Link from "next/link"
import { useBookmarks } from "@/app/contexts/BookmarksContext"

export default function BookmarksPage() {
    const { bookmarks } = useBookmarks()

    return (
        <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <header className="mb-8 text-center">
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">
                    Bookmarks
                </h1>
            </header>

            {bookmarks.length === 0 ? (
                <p className="text-center text-gray-600">
                    You have no bookmarks yet.
                </p>
            ) : (
                <ul className="space-y-3">
                    {bookmarks.map((bookmark) => (
                        <li
                            key={`${bookmark.chapterId}:${bookmark.entryNumber}`}
                            className="bg-white border border-gray-200 rounded-md p-4"
                        >
                            <Link
                                href={`/chapters/${bookmark.chapterId}/entries/${bookmark.entryNumber}`}
                                className="text-blue-600 hover:underline font-medium"
                            >
                                {bookmark.title}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </main>
    )
}
