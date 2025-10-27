"use client"

import React, { useState } from "react"

// 1. Import the generated types from the .d.ts file
import {
    CookbookIndex,
    IndexEntry,
    IndexCrossReference,
} from "@/types/generated.ts/index-schema"

// 2. The manual interfaces are now removed.

// 3. Update the props to use the imported 'CookbookIndex' type
interface IndexProps {
    data: CookbookIndex
}

const Index: React.FC<IndexProps> = ({ data }) => {
    const [selectedLetter, setSelectedLetter] = useState<string | null>(null)

    if (!data || data.length === 0) {
        return null
    }

    const sortedLetters = data.map((group) => group.letter).sort()
    const groupsToRender = selectedLetter
        ? data.filter((group) => group.letter === selectedLetter)
        : data

    const keyTracker: { [key: string]: number } = {}

    // A helper function to act as a type guard
    const isCrossReference = (
        entry: IndexEntry
    ): entry is IndexCrossReference => {
        return "see" in entry
    }

    return (
        <article className="index max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <header className="sticky top-0 z-10 py-4 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200">
                <div className="text-center">
                    <h1 className="text-3xl font-extrabold text-gray-900">
                        Index
                    </h1>
                </div>

                <nav className="filter-nav flex flex-wrap justify-center gap-2 mt-4">
                    <button
                        onClick={() => setSelectedLetter(null)}
                        className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
                            selectedLetter === null
                                ? "bg-gray-800 text-white shadow"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                    >
                        All
                    </button>
                    {sortedLetters.map((letter) => (
                        <button
                            key={letter}
                            onClick={() => setSelectedLetter(letter)}
                            className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
                                selectedLetter === letter
                                    ? "bg-gray-800 text-white shadow"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                        >
                            {letter}
                        </button>
                    ))}
                </nav>
            </header>

            <main className="pt-12">
                {groupsToRender.map((group) => (
                    <section key={group.letter} className="mb-12">
                        <h2 className="text-4xl font-bold text-gray-800 border-b pb-4 mb-8">
                            {group.letter}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                            {group.entries.map((entry) => {
                                keyTracker[entry.term] =
                                    (keyTracker[entry.term] || 0) + 1
                                const uniqueKey = `${entry.term}-${keyTracker[entry.term]}`

                                return (
                                    <div
                                        key={uniqueKey}
                                        className="index-entry flex justify-between items-baseline"
                                    >
                                        {/* 4. Use the type guard. This helps TypeScript understand the object's shape. */}
                                        {isCrossReference(entry) ? (
                                            <span className="text-lg text-gray-600">
                                                {entry.term}{" "}
                                                <em>See: {entry.see}</em>
                                            </span>
                                        ) : (
                                            <>
                                                <span className="text-lg text-gray-800">
                                                    {entry.term}
                                                </span>
                                                {/* In this block, TS now knows `entry` is an `IndexTerm`. */}
                                                {entry.recipe_number && (
                                                    <span className="text-md font-mono text-gray-500">
                                                        {entry.recipe_number}
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                ))}
            </main>
        </article>
    )
}

export default Index
