"use client"

import React, { useState, useCallback } from "react"
import {
    InstructionalEntry,
    Recipe,
    ContentBlock,
} from "@/types/generated.ts/entry-schema"
import { entryToMarkdown } from "@/functions/entryToMarkdown"
import CopyIcon from "./CopyIcon"

const isRecipe = (entry: InstructionalEntry): entry is Recipe =>
    entry.type === "recipe"

const blockToText = (block: ContentBlock): string => {
    if (typeof block === "string") return block
    return `${block.title}\n${block.content.join("\n")}`
}

const generateText = (entry: InstructionalEntry): string => {
    const title = `${entry._id} — ${entry.title}`
    const intro = entry.introduction
        ? entry.introduction.map(blockToText).join("\n\n")
        : ""

    const ingredients =
        isRecipe(entry) && entry.ingredients
            ? `\nIngredients\n${entry.ingredients.map((i: ContentBlock) => `- ${blockToText(i)}`).join("\n")}`
            : ""
    const instructions =
        isRecipe(entry) && entry.instructions
            ? `\nInstructions\n${entry.instructions.map((i: ContentBlock, idx: number) => `${idx + 1}. ${blockToText(i)}`).join("\n")}`
            : ""

    const notes = entry.notes
        ? `\nNotes:\n${entry.notes.map((n: ContentBlock) => `- ${blockToText(n)}`).join("\n")}`
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
        const textToCopy =
            format === "markdown" ? entryToMarkdown(entry) : generateText(entry)
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
