"use client"

import React, { useState, useCallback } from "react"
import {
    InstructionalEntry,
    BaseForAllEntries,
    Recipe,
} from "@/types/generated.ts/chapter-schema"
import CopyIcon from "./CopyIcon"

const isRecipe = (
    entry: InstructionalEntry
): entry is BaseForAllEntries & Recipe => entry.type === "recipe"

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
              : ""
        : ""

    const ingredients =
        isRecipe(entry) && entry.ingredients
            ? `\n${format === "markdown" ? "**Ingredients**" : "Ingredients"}\n${entry.ingredients.map((i) => `- ${i}`).join("\n")}`
            : ""
    const instructions =
        isRecipe(entry) && entry.instructions
            ? `\n${format === "markdown" ? "**Instructions**" : "Instructions"}\n${entry.instructions.map((i, idx) => `${idx + 1}. ${i}`).join("\n")}`
            : ""

    const notes = entry.notes
        ? `\n${format === "markdown" ? "> " : "Notes:\n"}${entry.notes.map((n) => `- ${n}`).join("\n")}`
        : ""

    return [title, intro, ingredients, instructions, notes]
        .filter(Boolean)
        .join("\n\n")
}

interface CopyButtonProps {
    entry: InstructionalEntry
    format: "text" | "markdown"
}

const CopyButton: React.FC<CopyButtonProps> = ({ entry, format }) => {
    const [isCopied, setIsCopied] = useState(false)

    const handleCopy = useCallback(async () => {
        const textToCopy = generateFormattedText(entry, format)
        await navigator.clipboard.writeText(textToCopy)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2500)
    }, [entry, format])

    const label = format === "markdown" ? "Copy as Markdown" : "Copy as Text"
    const buttonClassName =
        format === "markdown"
            ? "p-2 rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 hover:text-gray-900 transition-colors"
            : "p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"

    return (
        <button
            onClick={handleCopy}
            title={label}
            className={buttonClassName}
        >
            {isCopied ? (
                <span className="text-xs font-semibold">Copied!</span>
            ) : (
                <CopyIcon />
            )}
        </button>
    )
}

export default CopyButton
