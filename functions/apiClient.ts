// functions/apiClient.ts
//
// Typed helpers for fetching cookbook data from the FastAPI backend.
//
// The backend lives in `server/` and exposes JSON endpoints under `/api/`.
// Each helper returns `null` if the resource is missing or the backend is
// unreachable, matching the pre-existing `getData` contract that the page
// components were built around.

import {
    Cookbook,
    CookbookTableOfContents,
    CookbookGlossary,
    CookbookIndex,
} from "@/types/generated.ts/cookbook-schema"
import { CookbookChapter } from "@/types/generated.ts/chapter-schema"

const DEFAULT_API_BASE = "http://127.0.0.1:8000"

function apiBase(): string {
    const fromEnv =
        process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL
    return (fromEnv ?? DEFAULT_API_BASE).replace(/\/+$/, "")
}

async function apiGet<T>(path: string): Promise<T | null> {
    const url = `${apiBase()}${path}`
    try {
        // Use `no-store` so Next.js Server Components always hit the live
        // API rather than serving a cached response during development.
        const response = await fetch(url, { cache: "no-store" })
        if (response.status === 404) {
            return null
        }
        if (!response.ok) {
            console.error(
                `API request failed: GET ${url} -> ${response.status} ${response.statusText}`
            )
            return null
        }
        return (await response.json()) as T
    } catch (error) {
        console.error(`API request errored: GET ${url}:`, error)
        return null
    }
}

export function getCookbook(): Promise<Cookbook | null> {
    return apiGet<Cookbook>("/api/cookbook")
}

export function getContents(): Promise<CookbookTableOfContents | null> {
    return apiGet<CookbookTableOfContents>("/api/contents")
}

export function getGlossary(): Promise<CookbookGlossary | null> {
    return apiGet<CookbookGlossary>("/api/glossary")
}

export function getIndexData(): Promise<CookbookIndex | null> {
    return apiGet<CookbookIndex>("/api/index")
}

export function getChapter(id: string): Promise<CookbookChapter | null> {
    const safeId = encodeURIComponent(id)
    return apiGet<CookbookChapter>(`/api/chapters/${safeId}`)
}

export async function updateEntry(
    chapterId: string,
    entryNumber: number,
    data: Record<string, unknown>
): Promise<CookbookChapter> {
    const safeId = encodeURIComponent(chapterId)
    const url = `${apiBase()}/api/chapters/${safeId}/entries/${entryNumber}`
    const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    })
    if (!response.ok) {
        const detail = await response.json().catch(() => ({}))
        throw new Error(
            (detail as Record<string, string>).detail ??
                `Failed to update entry: ${response.status}`
        )
    }
    return (await response.json()) as CookbookChapter
}
