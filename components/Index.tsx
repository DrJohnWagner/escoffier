"use client"

import React, { useState } from "react"
import Link from "next/link"

// Define the shape of the data this component expects
interface TermEntry {
    term: string
    recipe_number?: string
}

interface CrossReferenceEntry {
    term: string
    see?: string
}

type IndexEntry = TermEntry | CrossReferenceEntry

interface IndexGroup {
    letter: string
    entries: IndexEntry[]
}

interface IndexProps {
    data: IndexGroup[]
}

const Index: React.FC<IndexProps> = ({ data }) => {
    const [selectedLetter, setSelectedLetter] = useState<string | null>(null)

    if (!data || data.length === 0) {
        return null
    }

    // The letters are already defined by the data structure!
    const sortedLetters = data.map((group) => group.letter).sort()
    const groupsToRender = selectedLetter
        ? data.filter((group) => group.letter === selectedLetter)
        : data

    // A key tracker for handling potential duplicate terms within a letter group
    const keyTracker: { [key: string]: number } = {}

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
                                        {/* Use a type guard to check which kind of entry it is */}
                                        {"see" in entry ? (
                                            <span className="text-lg text-gray-600">
                                                {entry.term}{" "}
                                                <em>See: {entry.see}</em>
                                            </span>
                                        ) : (
                                            <>
                                                <span className="text-lg text-gray-800">
                                                    {entry.term}
                                                </span>
                                                {/* We could make this a link in the future */}
                                                {"recipe_number" in entry && (
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
