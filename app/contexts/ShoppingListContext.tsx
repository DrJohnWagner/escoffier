"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import ShoppingListItemType from "@/types/ShoppingListItemType"

// 1. Define the shape of the context's value
interface ShoppingListContextType {
    shoppingListItems: ShoppingListItemType[]
    addItem: (item: ShoppingListItemType) => void
    removeAllItems: () => void
    removeItem: (itemNumber: number) => void
    isItemInList: (itemNumber: number) => boolean
}

// 2. Create the context with a default value of undefined
const ShoppingListContext = createContext<ShoppingListContextType | undefined>(
    undefined
)

// 3. Create the Provider component
export const ShoppingListProvider: React.FC<{
    children: React.ReactNode
}> = ({ children }) => {
    const [shoppingListItems, setShoppingListItems] = useState<
        ShoppingListItemType[]
    >(() => {
        // For client-side persistence, read from localStorage on initial load
        if (typeof window === "undefined") {
            return []
        }
        try {
            const item = window.localStorage.getItem("shoppingList")
            return item ? JSON.parse(item) : []
        } catch (error) {
            console.error("Error reading from localStorage", error)
            return []
        }
    })

    // Save to localStorage whenever the list changes
    useEffect(() => {
        try {
            window.localStorage.setItem(
                "shoppingList",
                JSON.stringify(shoppingListItems)
            )
        } catch (error) {
            console.error("Error writing to localStorage", error)
        }
    }, [shoppingListItems])

    const addItem = (item: ShoppingListItemType) => {
        // Prevent duplicates
        if (!isItemInList(item.number)) {
            setShoppingListItems((prevItems) => [...prevItems, item])
        }
    }

    const removeItem = (itemNumber: number) => {
        setShoppingListItems((prevItems) =>
            prevItems.filter((item) => item.number !== itemNumber)
        )
    }

    const removeAllItems = () => {
        setShoppingListItems([])
    }

    const isItemInList = (itemNumber: number) => {
        return shoppingListItems.some((item) => item.number === itemNumber)
    }

    const value = {
        shoppingListItems,
        addItem,
        removeItem,
        removeAllItems,
        isItemInList,
    }

    return (
        <ShoppingListContext.Provider value={value}>
            {children}
        </ShoppingListContext.Provider>
    )
}

// 4. Create a custom hook for easy consumption of the context
export const useShoppingList = (): ShoppingListContextType => {
    const context = useContext(ShoppingListContext)
    if (context === undefined) {
        throw new Error(
            "useShoppingList must be used within a ShoppingListProvider"
        )
    }
    return context
}
