// components/Entry.tsx

"use client"

import React, { useState } from "react"
import {
    InstructionalEntry,
    ContentBlock,
    Recipe,
} from "@/types/generated.ts/chapter-schema"
import ContentBlockList from "./ContentBlockList"
import EntryText from "@/components/EntryText" // This is already imported, which is great.
import CopyIcon from "@/components/CopyIcon"

// Type guard to check if an entry is a Recipe
const isRecipe = (
    entry: InstructionalEntry
): entry is BaseForAllEntries & Recipe => {
    return entry.type === "recipe"
}

// Helper type for BaseForAllEntries & Recipe
type BaseForAllEntries = {
    number: number
    title: string
    type: string
    introduction?: ContentBlock
    notes?: ContentBlock[]
}

/**
 * Recursively processes content blocks into a string format (text or markdown).
 */
const processBlocks = (
    items: ContentBlock[],
    format: "text" | "markdown",
    isOrdered: boolean = false
): string => {
    return items
        .map((item, index) => {
            if (typeof item === "string") {
                const prefix = isOrdered
                    ? `${index + 1}. `
                    : format === "markdown"
                      ? "- "
                      : "  - "
                return prefix + item
            }
            if (Array.isArray(item)) {
                return item
                    .map((subItem, i) => {
                        const prefix = isOrdered
                            ? `${i + 1}. `
                            : format === "markdown"
                              ? "- "
                              : "  - "
                        return prefix + subItem
                    })
                    .join("\n")
            }
            // Object type { [key: string]: string[] }
            if (typeof item === "object" && item !== null) {
                return Object.entries(item)
                    .map(([key, values]) => {
                        const header =
                            format === "markdown" ? `**${key}**` : `${key}:`
                        const listItems = (values as string[])
                            .map((v, i) => {
                                const prefix = isOrdered
                                    ? `${i + 1}. `
                                    : format === "markdown"
                                      ? "- "
                                      : "  - "
                                return prefix + v
                            })
                            .join("\n")
                        return `${header}\n${listItems}`
                    })
                    .join("\n\n")
            }
            return ""
        })
        .join("\n")
}

const generateFormattedText = (
    entry: InstructionalEntry,
    format: "text" | "markdown"
): string => {
    const title = `${format === "markdown" ? "####" : ""} ${entry.number} — ${
        entry.title
    }`
    const intro = entry.introduction
        ? Array.isArray(entry.introduction)
            ? entry.introduction.join("\n\n")
            : typeof entry.introduction === "string"
              ? entry.introduction
              : processBlocks([entry.introduction], format)
        : ""

    // Use type guard to safely access recipe-specific fields
    const ingredients =
        isRecipe(entry) && entry.ingredients
            ? `\n${format === "markdown" ? "**Ingredients**" : "Ingredients"}\n${processBlocks(entry.ingredients, format, false)}`
            : ""
    const instructions =
        isRecipe(entry) && entry.instructions
            ? `\n${format === "markdown" ? "**Instructions**" : "Instructions"}\n${processBlocks(entry.instructions, format, true)}`
            : ""

    const notes = entry.notes
        ? `\n${format === "markdown" ? "> " : "Notes:\n"}${processBlocks(entry.notes, format).replace(/\n/g, format === "markdown" ? "\n> " : "\n")}`
        : ""

    return [title, intro, ingredients, instructions, notes]
        .filter(Boolean)
        .join("\n\n")
}

const Entry: React.FC<{ entry: InstructionalEntry }> = ({ entry }) => {
    const [copiedType, setCopiedType] = useState<"text" | "markdown" | null>(
        null
    )

    const handleCopy = (format: "text" | "markdown") => {
        const textToCopy = generateFormattedText(entry, format)
        navigator.clipboard.writeText(textToCopy)
        setCopiedType(format)
        setTimeout(() => setCopiedType(null), 2500) // Reset after 2.5 seconds
    }

    return (
        <div
            id={`entry-${entry.number}`}
            className="entry bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-8"
        >
            <header className="flex justify-between items-start mb-4">
                {/* Left Side: Title */}
                <h4 className="text-2xl font-semibold text-gray-800 pr-4">
                    <span className="text-gray-400 mr-2">{entry.number}</span>—
                    <span className="entry-title">{entry.title}</span>
                </h4>

                {/* Right Side: Action Buttons */}
                <div className="flex items-center space-x-2 shrink-0">
                    <button
                        onClick={() => handleCopy("text")}
                        title="Copy as Text"
                        className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                    >
                        {copiedType === "text" ? (
                            <span className="text-xs font-semibold">
                                Copied!
                            </span>
                        ) : (
                            <CopyIcon />
                        )}
                    </button>
                    <button
                        onClick={() => handleCopy("markdown")}
                        title="Copy as Markdown"
                        className="p-2 rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 hover:text-gray-900 transition-colors"
                    >
                        {copiedType === "markdown" ? (
                            <span className="text-xs font-semibold">
                                Copied!
                            </span>
                        ) : (
                            <CopyIcon />
                        )}
                    </button>
                </div>
            </header>

            {/* --- THIS IS THE UPDATED LOGIC FOR THE INTRODUCTION --- */}
            {entry.introduction && (
                <div className="entry-introduction prose prose-gray max-w-none mb-4">
                    {/* Case 1: Simple string */}
                    {typeof entry.introduction === "string" ? (
                        <p>
                            <EntryText text={entry.introduction} />
                        </p>
                    ) : /* Case 2: Array of strings for paragraphs (THE NEW LOGIC) */
                    Array.isArray(entry.introduction) ? (
                        entry.introduction.map((paragraph, index) => (
                            <p key={index}>
                                <EntryText text={paragraph} />
                            </p>
                        ))
                    ) : (
                        /* Case 3: Object type, rendered by ContentBlockList */
                        <ContentBlockList items={[entry.introduction]} />
                    )}
                </div>
            )}
            {/* --- END OF UPDATED LOGIC --- */}

            {entry.type === "recipe" && (
                <div className="recipe-details space-y-4">
                    {entry.yield && (
                        <p className="recipe-yield text-gray-600 italic">
                            <strong>Yield:</strong> {entry.yield}
                        </p>
                    )}
                    <ContentBlockList
                        title="Ingredients"
                        items={entry.ingredients}
                    />
                    <ContentBlockList
                        title="Instructions"
                        items={entry.instructions}
                        isOrdered={true}
                    />
                </div>
            )}

            {entry.notes && (
                <aside className="entry-notes mt-6 p-4 bg-gray-50 rounded-md border-l-4 border-gray-300">
                    <ContentBlockList title="Notes" items={entry.notes} />
                </aside>
            )}
        </div>
    )
}
export default Entry
