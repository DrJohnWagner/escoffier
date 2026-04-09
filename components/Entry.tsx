// components/Entry.tsx

"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
    InstructionalEntry,
    ContentBlock,
    Recipe,
} from "@/types/generated.ts/chapter-schema"
import ContentBlockList from "./ContentBlockList"
import EntryText from "@/components/EntryText"
import CopyIcon from "@/components/CopyIcon"
import { useShoppingList } from "@/app/contexts/ShoppingListContext"
import { updateEntry } from "@/functions/apiClient"

// Type guard to check if an entry is a Recipe
const isRecipe = (
    entry: InstructionalEntry
): entry is BaseForAllEntries & Recipe => {
    return entry.type === "recipe"
}

// A simple plus icon for the "Add to List" button
const PlusIcon = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        className={className}
    >
        <path d="M5 12h14M12 5v14" />
    </svg>
)

const PencilIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
    >
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        <path d="m15 5 4 4" />
    </svg>
)

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

/** Flatten a ContentBlock[] to newline-separated string for editing. */
function blocksToText(blocks: ContentBlock[] | undefined): string {
    if (!blocks) return ""
    return blocks
        .map((block) => {
            if (typeof block === "string") return block
            if (Array.isArray(block)) return block.join("\n")
            if (typeof block === "object" && block !== null) {
                return Object.entries(block)
                    .map(
                        ([key, values]) =>
                            `${key}:\n${(values as string[]).join("\n")}`
                    )
                    .join("\n\n")
            }
            return ""
        })
        .join("\n")
}

/** Convert a single ContentBlock (introduction) to editable text. */
function introToText(intro: ContentBlock | undefined): string {
    if (!intro) return ""
    if (typeof intro === "string") return intro
    if (Array.isArray(intro)) return intro.join("\n")
    if (typeof intro === "object" && intro !== null) {
        return Object.entries(intro)
            .map(
                ([key, values]) =>
                    `${key}:\n${(values as string[]).join("\n")}`
            )
            .join("\n\n")
    }
    return ""
}

/** Convert newline-separated text back to a string array ContentBlock[]. */
function textToBlocks(text: string): string[] {
    if (!text.trim()) return []
    return text.split("\n").filter((line) => line.trim() !== "")
}

/** Convert text to a ContentBlock for introduction (string or string[]). */
function textToIntro(text: string): ContentBlock | undefined {
    if (!text.trim()) return undefined
    const lines = text.split("\n").filter((line) => line.trim() !== "")
    if (lines.length === 1) return lines[0]
    return lines
}

interface EntryProps {
    entry: InstructionalEntry
    chapterId: string
}

interface EditFormState {
    title: string
    type: string
    introduction: string
    yield: string
    ingredients: string
    instructions: string
    notes: string
}

function findEntryInChapter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chapter: Record<string, any>,
    entryNumber: number
): InstructionalEntry | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function walk(sections: any[]): InstructionalEntry | null {
        for (const section of sections) {
            for (const entry of section.entries ?? []) {
                if (entry.number === entryNumber) return entry
            }
            const found = walk(section.sections ?? [])
            if (found) return found
        }
        return null
    }
    return walk(chapter.sections ?? [])
}

const Entry: React.FC<EntryProps> = ({ entry, chapterId }) => {
    const [entryData, setEntryData] = useState<InstructionalEntry>(entry)
    const [copiedType, setCopiedType] = useState<"text" | "markdown" | null>(
        null
    )
    const [isClient, setIsClient] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const { addItem, isItemInList } = useShoppingList()

    useEffect(() => {
        setIsClient(true)
    }, [])

    useEffect(() => {
        setEntryData(entry)
    }, [entry])

    const alreadyInList = isClient ? isItemInList(entryData.number) : false

    const handleAddItem = () => {
        if (isRecipe(entryData)) {
            addItem({
                number: entryData.number,
                title: entryData.title,
                ingredients: entryData.ingredients,
            })
        }
    }

    const handleCopy = (format: "text" | "markdown") => {
        const textToCopy = generateFormattedText(entryData, format)
        navigator.clipboard.writeText(textToCopy)
        setCopiedType(format)
        setTimeout(() => setCopiedType(null), 2500)
    }

    const buildFormState = useCallback((): EditFormState => {
        return {
            title: entryData.title,
            type: entryData.type,
            introduction: introToText(entryData.introduction),
            yield: isRecipe(entryData) ? (entryData.yield ?? "") : "",
            ingredients: isRecipe(entryData)
                ? blocksToText(entryData.ingredients)
                : "",
            instructions: isRecipe(entryData)
                ? blocksToText(entryData.instructions)
                : "",
            notes: blocksToText(entryData.notes),
        }
    }, [entryData])

    const [formState, setFormState] = useState<EditFormState>(buildFormState)

    const handleOpenEdit = () => {
        setFormState(buildFormState())
        setSaveError(null)
        setIsEditing(true)
    }

    const handleCancel = () => {
        setIsEditing(false)
        setSaveError(null)
    }

    const handleSave = async () => {
        setIsSaving(true)
        setSaveError(null)
        try {
            const payload: Record<string, unknown> = {
                title: formState.title,
                type: formState.type,
            }

            const intro = textToIntro(formState.introduction)
            if (intro !== undefined) {
                payload.introduction = intro
            }

            if (formState.notes.trim()) {
                payload.notes = textToBlocks(formState.notes)
            }

            if (formState.type === "recipe") {
                if (formState.yield.trim()) {
                    payload.yield = formState.yield
                }
                payload.ingredients = textToBlocks(formState.ingredients)
                payload.instructions = textToBlocks(formState.instructions)
            }

            const updatedChapter = await updateEntry(
                chapterId,
                entryData.number,
                payload
            )
            const updatedEntry = findEntryInChapter(
                updatedChapter as unknown as Record<string, unknown>,
                entryData.number
            )
            if (updatedEntry) {
                setEntryData(updatedEntry)
            }
            setIsEditing(false)
        } catch (err) {
            setSaveError(
                err instanceof Error ? err.message : "Failed to save"
            )
        } finally {
            setIsSaving(false)
        }
    }

    const handleFormChange = (
        field: keyof EditFormState,
        value: string
    ) => {
        setFormState((prev) => ({ ...prev, [field]: value }))
    }

    return (
        <div
            id={`entry-${entryData.number}`}
            className="entry bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-8"
        >
            <header className="flex justify-between items-start mb-4">
                {/* Left Side: Title */}
                <h4 className="text-2xl font-semibold text-gray-800 pr-4">
                    <span className="text-gray-400 mr-2">
                        {entryData.number}
                    </span>
                    —
                    <span className="entry-title">{entryData.title}</span>
                </h4>

                {/* Right Side: Action Buttons */}
                <div className="flex items-center space-x-1 shrink-0">
                    {isClient && (
                        <button
                            onClick={handleOpenEdit}
                            title="Edit Entry"
                            className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                        >
                            <PencilIcon />
                        </button>
                    )}
                    {isRecipe(entryData) && (
                        <button
                            onClick={handleAddItem}
                            disabled={alreadyInList}
                            title={
                                alreadyInList
                                    ? "Already in Shopping List"
                                    : "Add to Shopping List"
                            }
                            className="p-2 rounded-md transition-colors text-gray-500 enabled:hover:bg-gray-100 enabled:hover:text-gray-800 disabled:text-gray-300 disabled:cursor-not-allowed"
                        >
                            <PlusIcon />
                        </button>
                    )}
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

            {entryData.introduction && (
                <div className="entry-introduction prose prose-gray max-w-none mb-4">
                    {typeof entryData.introduction === "string" ? (
                        <p>
                            <EntryText text={entryData.introduction} />
                        </p>
                    ) : Array.isArray(entryData.introduction) ? (
                        entryData.introduction.map((paragraph, index) => (
                            <p key={index}>
                                <EntryText text={paragraph} />
                            </p>
                        ))
                    ) : (
                        <ContentBlockList items={[entryData.introduction]} />
                    )}
                </div>
            )}

            {entryData.type === "recipe" && (
                <div className="recipe-details space-y-4">
                    {entryData.yield && (
                        <p className="recipe-yield text-gray-600 italic">
                            <strong>Yield:</strong> {entryData.yield}
                        </p>
                    )}
                    <ContentBlockList
                        title="Ingredients"
                        items={entryData.ingredients}
                    />
                    <ContentBlockList
                        title="Instructions"
                        items={entryData.instructions}
                        isOrdered={true}
                    />
                </div>
            )}

            {entryData.notes && (
                <aside className="entry-notes mt-6 p-4 bg-gray-50 rounded-md border-l-4 border-gray-300">
                    <ContentBlockList title="Notes" items={entryData.notes} />
                </aside>
            )}

            {/* Edit Modal */}
            {isEditing && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) handleCancel()
                    }}
                >
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4 p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">
                            Edit Entry {entryData.number}
                        </h3>

                        {saveError && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                                {saveError}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={formState.title}
                                    onChange={(e) =>
                                        handleFormChange(
                                            "title",
                                            e.target.value
                                        )
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Type
                                </label>
                                <select
                                    value={formState.type}
                                    onChange={(e) =>
                                        handleFormChange(
                                            "type",
                                            e.target.value
                                        )
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="recipe">Recipe</option>
                                    <option value="technique">Technique</option>
                                    <option value="principle">Principle</option>
                                    <option value="definition">
                                        Definition
                                    </option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Introduction
                                </label>
                                <textarea
                                    value={formState.introduction}
                                    onChange={(e) =>
                                        handleFormChange(
                                            "introduction",
                                            e.target.value
                                        )
                                    }
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="One line per paragraph"
                                />
                            </div>

                            {formState.type === "recipe" && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Yield
                                        </label>
                                        <input
                                            type="text"
                                            value={formState.yield}
                                            onChange={(e) =>
                                                handleFormChange(
                                                    "yield",
                                                    e.target.value
                                                )
                                            }
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Ingredients
                                        </label>
                                        <textarea
                                            value={formState.ingredients}
                                            onChange={(e) =>
                                                handleFormChange(
                                                    "ingredients",
                                                    e.target.value
                                                )
                                            }
                                            rows={6}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="One ingredient per line"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Instructions
                                        </label>
                                        <textarea
                                            value={formState.instructions}
                                            onChange={(e) =>
                                                handleFormChange(
                                                    "instructions",
                                                    e.target.value
                                                )
                                            }
                                            rows={6}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="One step per line"
                                        />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Notes
                                </label>
                                <textarea
                                    value={formState.notes}
                                    onChange={(e) =>
                                        handleFormChange(
                                            "notes",
                                            e.target.value
                                        )
                                    }
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="One note per line"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                            <button
                                onClick={handleCancel}
                                disabled={isSaving}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isSaving ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
export default Entry
