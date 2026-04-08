"use client"

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react"
import ShoppingListItemType from "@/types/ShoppingListItemType"

interface ShoppingListContextType {
    shoppingListItems: ShoppingListItemType[]
    addItem: (item: ShoppingListItemType) => void
    removeAllItems: () => void
    removeItem: (itemNumber: number) => void
    isItemInList: (itemNumber: number) => boolean
}

const ShoppingListContext = createContext<ShoppingListContextType | undefined>(
    undefined
)

const STORAGE_KEY = "shoppingList"

function isShoppingListItem(value: unknown): value is ShoppingListItemType {
    if (typeof value !== "object" || value === null) return false
    const v = value as Record<string, unknown>
    return typeof v.number === "number" && typeof v.title === "string"
}

function readFromStorage(): ShoppingListItemType[] {
    if (typeof window === "undefined") return []
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) return []
        const parsed: unknown = JSON.parse(raw)
        if (!Array.isArray(parsed)) return []
        return parsed.filter(isShoppingListItem)
    } catch (error) {
        if (process.env.NODE_ENV !== "production") {
            console.error(
                "Error reading shopping list from localStorage",
                error
            )
        }
        return []
    }
}

export function ShoppingListProvider({ children }: { children: ReactNode }) {
    // Initialise to [] on both server and client so the first render matches.
    // Hydrate from localStorage in a post-mount effect.
    const [shoppingListItems, setShoppingListItems] = useState<
        ShoppingListItemType[]
    >([])
    const [hydrated, setHydrated] = useState(false)

    useEffect(() => {
        setShoppingListItems(readFromStorage())
        setHydrated(true)
    }, [])

    // Persist on every change, but only after the initial hydration pass so
    // we don't overwrite a populated list with the empty initial state.
    useEffect(() => {
        if (!hydrated) return
        try {
            window.localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(shoppingListItems)
            )
        } catch (error) {
            if (process.env.NODE_ENV !== "production") {
                console.error(
                    "Error writing shopping list to localStorage",
                    error
                )
            }
        }
    }, [shoppingListItems, hydrated])

    const addItem = useCallback((item: ShoppingListItemType) => {
        // Duplicate check lives inside the functional updater so two rapid
        // addItem calls can't both pass a stale isItemInList check.
        setShoppingListItems((prev) =>
            prev.some((existing) => existing.number === item.number)
                ? prev
                : [...prev, item]
        )
    }, [])

    const removeItem = useCallback((itemNumber: number) => {
        setShoppingListItems((prev) =>
            prev.filter((item) => item.number !== itemNumber)
        )
    }, [])

    const removeAllItems = useCallback(() => {
        setShoppingListItems([])
    }, [])

    const isItemInList = useCallback(
        (itemNumber: number) =>
            shoppingListItems.some((item) => item.number === itemNumber),
        [shoppingListItems]
    )

    const value = useMemo<ShoppingListContextType>(
        () => ({
            shoppingListItems,
            addItem,
            removeItem,
            removeAllItems,
            isItemInList,
        }),
        [shoppingListItems, addItem, removeItem, removeAllItems, isItemInList]
    )

    return (
        <ShoppingListContext.Provider value={value}>
            {children}
        </ShoppingListContext.Provider>
    )
}

export function useShoppingList(): ShoppingListContextType {
    const context = useContext(ShoppingListContext)
    if (context === undefined) {
        throw new Error(
            "useShoppingList must be used within a ShoppingListProvider"
        )
    }
    return context
}
