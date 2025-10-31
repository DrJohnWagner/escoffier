"use client"

import React from "react"
import { useShoppingList } from "@/app/contexts/ShoppingListContext"
import ContentBlockList from "@/components/ContentBlockList"
import ShoppingListItemType from "@/types/ShoppingListItemType"

export default function ShoppingListPage() {
    const { shoppingListItems, removeItem, removeAllItems } = useShoppingList()

    const handleRemoveAll = () => {
        // Ask for confirmation before clearing the list
        const confirmed = window.confirm(
            "Are you sure you want to remove all items from your shopping list?"
        )
        if (confirmed) {
            removeAllItems()
        }
    }
    return (
        <div className="max-w-4xl mx-auto py-12">
            <header className="text-center mb-10">
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">
                    Your Shopping List
                </h1>
                <p className="mt-2 text-lg text-gray-600">
                    {shoppingListItems.length === 0
                        ? "Your list is currently empty."
                        : `You have ${shoppingListItems.length} recipe(s) in your list.`}
                </p>
            </header>

            {/* --- THIS IS THE NEW SECTION --- */}
            {shoppingListItems.length > 0 && (
                <div className="text-center mb-8">
                    <button
                        onClick={handleRemoveAll}
                        className="px-4 py-2 text-sm font-semibold text-red-600 bg-red-100 rounded-md hover:bg-red-200 hover:text-red-800 transition-colors"
                    >
                        Remove All Items
                    </button>
                </div>
            )}
            {/* --- END OF NEW SECTION --- */}

            {shoppingListItems.length > 0 && (
                <div className="space-y-8">
                    {shoppingListItems.map((item: ShoppingListItemType) => (
                        <article
                            key={item.number}
                            className="bg-white border border-gray-200 rounded-lg shadow-sm p-6"
                        >
                            <header className="flex justify-between items-start mb-4">
                                <h2 className="text-2xl font-semibold text-gray-800">
                                    <span className="text-gray-400 mr-2">
                                        {item.number}
                                    </span>
                                    —<span>{item.title}</span>
                                </h2>
                                <button
                                    onClick={() => removeItem(item.number)}
                                    className="text-sm font-semibold text-red-600 hover:text-red-800"
                                >
                                    Remove
                                </button>
                            </header>
                            <ContentBlockList
                                title="Ingredients"
                                items={item.ingredients}
                            />
                        </article>
                    ))}
                </div>
            )}
        </div>
    )
}
