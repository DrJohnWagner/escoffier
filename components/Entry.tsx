// components/Entry.tsx

"use client"

import React, { useState, useEffect } from "react"
import {
    InstructionalEntry,
    Recipe,
} from "@/types/generated.ts/entry-schema"
import ContentBlockList from "./ContentBlockList"
import CopyButton from "./buttons/CopyButton"
import { useShoppingList } from "@/app/contexts/ShoppingListContext"
import EditEntryModal from "./EditEntryModal"
import PlusIcon from "./buttons/PlusIcon"
import PencilIcon from "./buttons/PencilIcon"

const isRecipe = (entry: InstructionalEntry): entry is Recipe =>
    entry.type === "recipe"

interface EntryProps {
    entry: InstructionalEntry
}

const Entry: React.FC<EntryProps> = ({ entry }) => {
    const [entryData, setEntryData] = useState<InstructionalEntry>(entry)
    const [isClient, setIsClient] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const { addItem, isItemInList } = useShoppingList()

    useEffect(() => {
        setIsClient(true)
    }, [])

    useEffect(() => {
        setEntryData(entry)
    }, [entry])

    const alreadyInList = isClient ? isItemInList(entryData._id) : false

    const handleAddItem = () => {
        if (isRecipe(entryData)) {
            addItem({
                _id: entryData._id,
                title: entryData.title,
                ingredients: entryData.ingredients,
            })
        }
    }

    const handleOpenEdit = () => {
        setIsEditing(true)
    }

    const handleCloseEdit = () => {
        setIsEditing(false)
    }

    const handleSaveEntry = (updatedEntry: InstructionalEntry) => {
        setEntryData(updatedEntry)
    }

    return (
        <div
            id={`entry-${entryData._id}`}
            className="entry bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-8"
        >
            <header className="flex justify-between items-start mb-4">
                {/* Left Side: Title */}
                <h4 className="text-2xl font-semibold text-gray-800 pr-4">
                    <span className="text-gray-400 mr-2">
                        {entryData._id}
                    </span>
                    —<span className="entry-title">{entryData.title}</span>
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
                    <CopyButton entry={entryData} format="text" />
                    <CopyButton entry={entryData} format="markdown" />
                </div>
            </header>

            {entryData.introduction && entryData.introduction.length > 0 && (
                <div className="entry-introduction prose prose-gray max-w-none mb-4">
                    <ContentBlockList items={entryData.introduction} />
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
            <EditEntryModal
                entry={entryData}
                isOpen={isEditing}
                onClose={handleCloseEdit}
                onSave={handleSaveEntry}
            />
        </div>
    )
}
export default Entry
