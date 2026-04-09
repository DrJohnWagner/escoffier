// components/EditEntryModal.tsx

"use client"

import React, { useState, useCallback } from "react"
import { InstructionalEntry, BaseForAllEntries, Recipe, ContentBlock } from "@/types/generated.ts/chapter-schema"
import { updateEntry } from "@/functions/apiClient"

// Type guard to check if an entry is a Recipe
const isRecipe = (
    entry: InstructionalEntry
): entry is BaseForAllEntries & Recipe => {
    return entry.type === "recipe"
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

interface EditEntryModalProps {
    entry: InstructionalEntry
    chapterId: string
    isOpen: boolean
    onClose: () => void
    onSave: (updatedEntry: InstructionalEntry) => void
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

/**
 * Recursively processes content blocks into a string format.
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

const blocksToText = (blocks?: ContentBlock[]): string => {
    if (!blocks || blocks.length === 0) return ""
    return processBlocks(blocks, "text")
}

const textToBlocks = (text: string): ContentBlock[] => {
    if (!text.trim()) return []
    return text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
}

const introToText = (intro?: ContentBlock): string => {
    if (!intro) return ""
    if (typeof intro === "string") return intro
    if (Array.isArray(intro)) return intro.join("\n\n")
    return blocksToText([intro])
}

const textToIntro = (text: string): ContentBlock | undefined => {
    if (!text.trim()) return undefined
    const lines = text.split("\n").filter((line) => line.trim())
    if (lines.length === 1) return lines[0]
    return lines
}

const EditEntryModal: React.FC<EditEntryModalProps> = ({
    entry,
    chapterId,
    isOpen,
    onClose,
    onSave,
}) => {
    const buildFormState = useCallback((): EditFormState => {
        return {
            title: entry.title,
            type: entry.type,
            introduction: introToText(entry.introduction),
            yield: isRecipe(entry) ? (entry.yield ?? "") : "",
            ingredients: isRecipe(entry)
                ? blocksToText(entry.ingredients)
                : "",
            instructions: isRecipe(entry)
                ? blocksToText(entry.instructions)
                : "",
            notes: blocksToText(entry.notes),
        }
    }, [entry])

    const [formState, setFormState] = useState<EditFormState>(buildFormState)
    const [isSaving, setIsSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)

    // Reset form state when entry changes or modal opens
    React.useEffect(() => {
        if (isOpen) {
            setFormState(buildFormState())
            setSaveError(null)
        }
    }, [isOpen, buildFormState])

    const handleFormChange = (
        field: keyof EditFormState,
        value: string
    ) => {
        setFormState((prev) => ({ ...prev, [field]: value }))
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
                entry.number,
                payload
            )
            const updatedEntry = findEntryInChapter(
                updatedChapter as unknown as Record<string, unknown>,
                entry.number
            )
            if (updatedEntry) {
                onSave(updatedEntry)
            }
            onClose()
        } catch (err) {
            setSaveError(
                err instanceof Error ? err.message : "Failed to save"
            )
        } finally {
            setIsSaving(false)
        }
    }

    const handleCancel = () => {
        onClose()
        setSaveError(null)
    }

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={(e) => {
                if (e.target === e.currentTarget) handleCancel()
            }}
        >
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Edit Entry {entry.number}
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
    )
}

export default EditEntryModal