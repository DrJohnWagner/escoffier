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

export interface Bookmark {
    chapterId: string
    entryNumber: string
    title: string
}

interface BookmarksContextType {
    bookmarks: Bookmark[]
    isBookmarked: (chapterId: string, entryNumber: string) => boolean
    addBookmark: (bookmark: Bookmark) => void
    removeBookmark: (chapterId: string, entryNumber: string) => void
    toggleBookmark: (bookmark: Bookmark) => void
}

const BookmarksContext = createContext<BookmarksContextType | undefined>(
    undefined
)

const STORAGE_KEY = "escoffier-bookmarks"

function isBookmark(value: unknown): value is Bookmark {
    if (typeof value !== "object" || value === null) return false
    const v = value as Record<string, unknown>
    return (
        typeof v.chapterId === "string" &&
        typeof v.entryNumber === "string" &&
        typeof v.title === "string"
    )
}

function readFromStorage(): Bookmark[] {
    if (typeof window === "undefined") return []
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) return []
        const parsed: unknown = JSON.parse(raw)
        if (!Array.isArray(parsed)) return []
        return parsed.filter(isBookmark)
    } catch (error) {
        if (process.env.NODE_ENV !== "production") {
            console.error("Error reading bookmarks from localStorage", error)
        }
        return []
    }
}

function matchesBookmark(
    bookmark: Bookmark,
    chapterId: string,
    entryNumber: string
): boolean {
    return (
        bookmark.chapterId === chapterId &&
        bookmark.entryNumber === entryNumber
    )
}

export function BookmarksProvider({ children }: { children: ReactNode }) {
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
    const [hydrated, setHydrated] = useState(false)

    useEffect(() => {
        setBookmarks(readFromStorage())
        setHydrated(true)
    }, [])

    useEffect(() => {
        if (!hydrated) return
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks))
        } catch (error) {
            if (process.env.NODE_ENV !== "production") {
                console.error("Error writing bookmarks to localStorage", error)
            }
        }
    }, [bookmarks, hydrated])

    const isBookmarked = useCallback(
        (chapterId: string, entryNumber: string) =>
            bookmarks.some((bookmark) =>
                matchesBookmark(bookmark, chapterId, entryNumber)
            ),
        [bookmarks]
    )

    const addBookmark = useCallback((bookmark: Bookmark) => {
        setBookmarks((prev) => {
            if (
                prev.some((existing) =>
                    matchesBookmark(
                        existing,
                        bookmark.chapterId,
                        bookmark.entryNumber
                    )
                )
            ) {
                return prev
            }
            return [...prev, bookmark]
        })
    }, [])

    const removeBookmark = useCallback(
        (chapterId: string, entryNumber: string) => {
            setBookmarks((prev) =>
                prev.filter(
                    (bookmark) =>
                        !matchesBookmark(bookmark, chapterId, entryNumber)
                )
            )
        },
        []
    )

    const toggleBookmark = useCallback((bookmark: Bookmark) => {
        setBookmarks((prev) => {
            const exists = prev.some((existing) =>
                matchesBookmark(existing, bookmark.chapterId, bookmark.entryNumber)
            )

            if (exists) {
                return prev.filter(
                    (existing) =>
                        !matchesBookmark(
                            existing,
                            bookmark.chapterId,
                            bookmark.entryNumber
                        )
                )
            }

            return [...prev, bookmark]
        })
    }, [])

    const value = useMemo<BookmarksContextType>(
        () => ({
            bookmarks,
            isBookmarked,
            addBookmark,
            removeBookmark,
            toggleBookmark,
        }),
        [bookmarks, isBookmarked, addBookmark, removeBookmark, toggleBookmark]
    )

    return (
        <BookmarksContext.Provider value={value}>
            {children}
        </BookmarksContext.Provider>
    )
}

export function useBookmarks(): BookmarksContextType {
    const context = useContext(BookmarksContext)
    if (context === undefined) {
        throw new Error("useBookmarks must be used within a BookmarksProvider")
    }
    return context
}
