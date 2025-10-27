"use client"

import React, { useState } from "react"

// 1. Import the generated types from the .d.ts file
import {
    CookbookGlossary,
    GlossaryEntry,
} from "@/types/generated.ts/glossary-schema"

// 2. The manual interfaces are now removed.

// 3. Update the props to use the imported 'CookbookGlossary' type.
//    (CookbookGlossary is an alias for GlossaryEntry[])
interface GlossaryProps {
    data: CookbookGlossary
}

const Glossary: React.FC<GlossaryProps> = ({ data }) => {
    const [selectedLetter, setSelectedLetter] = useState<string | null>(null)

    if (!data || data.length === 0) {
        return null
    }

    // This logic works perfectly with the imported types.
    const groupedEntries: { [letter: string]: GlossaryEntry[] } = data.reduce(
        (acc, entry) => {
            const baseLetter = entry.term
                .charAt(0)
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toUpperCase()
            if (!acc[baseLetter]) {
                acc[baseLetter] = []
            }
            acc[baseLetter].push(entry)
            return acc
        },
        {} as { [letter: string]: GlossaryEntry[] }
    )

    Object.keys(groupedEntries).forEach((letter) => {
        groupedEntries[letter].sort((a, b) =>
            a.term.localeCompare(b.term, "en", { sensitivity: "base" })
        )
    })

    const sortedLetters = Object.keys(groupedEntries).sort()
    const lettersToRender = selectedLetter ? [selectedLetter] : sortedLetters

    return (
        <article className="glossary max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <header
                className="
                    sticky top-0 z-10 
                    py-4
                    bg-gray-50/95
                    backdrop-blur-sm
                    border-b border-gray-200
                "
            >
                <div className="text-center">
                    <h1 className="text-3xl font-extrabold text-gray-900">
                        Glossary
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
                {lettersToRender.map((letter) => {
                    const keyTracker: { [key: string]: number } = {}

                    return (
                        <section key={letter} className="mb-12">
                            <h2 className="text-4xl font-bold text-gray-800 border-b pb-4 mb-8">
                                {letter}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                {groupedEntries[letter].map((entry) => {
                                    keyTracker[entry.term] =
                                        (keyTracker[entry.term] || 0) + 1
                                    const uniqueKey = `${entry.term}-${keyTracker[entry.term]}`

                                    return (
                                        <div
                                            key={uniqueKey}
                                            className="glossary-entry"
                                        >
                                            <h3 className="text-xl font-semibold text-gray-700">
                                                {entry.term}
                                            </h3>
                                            <div className="mt-1 text-gray-600">
                                                {entry.definition && (
                                                    <p>{entry.definition}</p>
                                                )}
                                                {entry.see_recipe && (
                                                    <p>
                                                        <em>
                                                            See Recipe No.{" "}
                                                            {entry.see_recipe}
                                                        </em>
                                                    </p>
                                                )}
                                                {entry.see_term && (
                                                    <p>
                                                        <em>
                                                            See:{" "}
                                                            {entry.see_term}
                                                        </em>
                                                    </p>
                                                )}
                                                {entry.sub_terms && (
                                                    <ul className="list-disc list-inside mt-2">
                                                        {entry.sub_terms.map(
                                                            (sub) => (
                                                                <li key={sub}>
                                                                    {sub}
                                                                </li>
                                                            )
                                                        )}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </section>
                    )
                })}
            </main>
        </article>
    )
}

export default Glossary
