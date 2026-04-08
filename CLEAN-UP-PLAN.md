# `app/` Clean-Up Plan

Scope: every file under `app/` (plus the few external references that directly affect `app/`, such as `types/ShoppingListItemType.ts`, `types/ShoppingListType.ts`, and `.prettierrc`).

Nothing in this document has been executed. Each item is a proposal with a severity, a precise location, and a concrete prescription so it can be verified after the work is done.

**Severities**

- **P0** — Bug-prone, broken, or wrong per the tooling the project already depends on. Fix before anything else.
- **P1** — Inconsistent style or obvious dead code. High-value, low-risk.
- **P2** — Structural / architectural tidying that improves readability but is safe to defer.
- **P3** — Cosmetic or subjective nits.

---

## 0. Summary of files

```
app/
├── favicon.ico
├── globals.css               ← live, but contains a commented-out import
├── globals-SAVE.css          ← DEAD FILE, unreferenced
├── layout.tsx                ← dead font imports + hardcoded margins
├── page.tsx                  ← tab/semi drift + stale comments
├── glossary/page.tsx         ← tab/semi drift + redundant CSS import
├── index/page.tsx            ← tab/semi drift + redundant CSS import + route name collision
├── chapters/[id]/page.tsx    ← wrong param type for Next 16 + missing metadata
├── shopping-list/page.tsx    ← missing metadata + minor a11y nits
└── contexts/
    └── ShoppingListContext.tsx  ← stable value hazard + localStorage race risk
```

Cross-cutting observations appear in §2. File-specific items are in §3.

---

## 1. Tooling / baseline expectations

Before or alongside the fixes below, make sure the cleanup is verifiable against:

- `npx tsc --noEmit` — must stay at zero errors.
- `npm run lint` — the **pre-existing** errors in `scripts/*.mjs` and `types/generated.ts/*.d.ts` are out of scope for this plan; zero *new* errors must be introduced in `app/`.
- `.prettierrc` — `semi: false`, `singleQuote: false`, `trailingComma: "es5"`, `tabWidth: 4`. Three files in `app/` currently violate this (see §2.1).
- A full boot (`make start-db && make migrate-db && make start-server && npm run dev`) plus a quick curl of `/`, `/glossary`, `/index`, `/chapters/chapter-i`, `/chapters/chapter-xx`, and `/shopping-list` after each destructive edit.

---

## 2. Cross-cutting issues

### 2.1 [P1] Inconsistent indentation & semicolons across pages

Prettier is configured with `semi: false` and `tabWidth: 4`. Seven `app/` files currently split into two camps:

| File | Leading-tab lines | `;` line-endings |
| ---- | ----------------: | ---------------: |
| `app/page.tsx` | 82 | 11 |
| `app/glossary/page.tsx` | 14 | 6 |
| `app/index/page.tsx` | 14 | 6 |
| `app/layout.tsx` | 0 | 2 |
| `app/chapters/[id]/page.tsx` | 0 | 0 |
| `app/shopping-list/page.tsx` | 0 | 0 |
| `app/contexts/ShoppingListContext.tsx` | 0 | 0 |

**Action:** run `npx prettier --write "app/**/*.{ts,tsx,css}"` (after confirming `.prettierrc` is the single source of truth). This will unify on spaces + no-semicolons and flip `app/page.tsx`, `app/glossary/page.tsx`, `app/index/page.tsx`, and the two stray semicolons in `app/layout.tsx`.

**Verify:** `grep -c ';$' app/**/*.{ts,tsx}` → 0 in every file except any intentional inline-statement `;`; `awk '/^\t/' app/**/*.{ts,tsx}` → empty.

### 2.2 [P1] Redundant `import "./globals.css"` / `import "@/app/globals.css"` in every page

`app/layout.tsx:6` already imports `./globals.css`, which is the App Router's correct place. The page files duplicate the import:

- `app/page.tsx:14` — `import "./globals.css";`
- `app/glossary/page.tsx:6` — `import "@/app/globals.css";`
- `app/index/page.tsx:6` — `import "@/app/globals.css";`
- `app/chapters/[id]/page.tsx:9` — `import "@/app/globals.css"`

These imports are no-ops at runtime (CSS from a parent layout already applies) and two different spellings are used in parallel. One page uses a relative path, three use the `@/` alias.

**Action:** delete all four imports. Keep only `import "./globals.css"` in `app/layout.tsx`.

**Verify:** `grep -rn "globals.css" app/` returns exactly one line (`app/layout.tsx`).

### 2.3 [P1] Unused `import React` in Server Components

With `"jsx": "react-jsx"` in `tsconfig.json`, importing `React` is unnecessary unless the file references the `React` namespace at runtime.

- `app/glossary/page.tsx:3` — `import React from "react"` (no `React.X` reference)
- `app/index/page.tsx:3` — same
- `app/shopping-list/page.tsx:3` — `import React, { useState, useEffect } from "react"` — the default import is unused; the named imports are needed.
- `app/contexts/ShoppingListContext.tsx:3` — `import React, { createContext, useContext, useState, useEffect } from "react"` — `React` is used for `React.FC` (line 21) and `React.ReactNode` (line 22), so the default is still needed **only** until item 2.4 is applied.

**Action:** remove the unused `React` default imports (glossary page, index page, shopping-list page).

**Verify:** `grep -n "\bReact\b" <file>` shows only the removed import line before the edit and zero lines after.

### 2.4 [P2] Drop `React.FC` in favour of the plain function-component signature

The project's other components are split roughly 50/50 between `React.FC<Props>` and `(props: Props) => …`. Within `app/` only `ShoppingListContext.tsx` uses `React.FC`. The [React team recommends against `React.FC`](https://react.dev/reference/react) because it makes children implicit and returns `Element | null` rather than the more precise `ReactNode`. Since we're touching the file anyway for 2.3, convert it.

- `app/contexts/ShoppingListContext.tsx:21-23` — convert `ShoppingListProvider: React.FC<{ children: React.ReactNode }>` to `function ShoppingListProvider({ children }: { children: React.ReactNode })` or export an interface `ShoppingListProviderProps`.

**Action:** rewrite the provider declaration, then remove the now-unused `React` default import (it's still needed if `React.ReactNode` is referenced — use `import type { ReactNode } from "react"` instead).

**Verify:** `npx tsc --noEmit` green, `grep "React.FC" app/` empty.

### 2.5 [P2] Error handling is a plain `<h1>` in three places

`app/page.tsx:25-31`, `app/glossary/page.tsx:13-19`, and `app/index/page.tsx:13-19` all render the same "Error: X data could not be loaded." pattern. This is duplicated boilerplate that gives no actionable signal (was it a 404? backend down? network error?).

**Action:** introduce a tiny shared `components/DataLoadError.tsx` (new file, outside `app/`) that takes a `resource` prop and renders the message + a hint about `make start-db && make migrate-db && make start-server`. Replace the three inline variants.

**Verify:** `grep -rn "could not be loaded" app/` returns zero.

### 2.6 [P2] Pages never declare `metadata`

Only `app/layout.tsx` defines `export const metadata`. Every other route inherits "Escoffier's Digital Guide" verbatim. For SEO / browser-tab distinguishability:

- `app/glossary/page.tsx` should export `metadata: Metadata = { title: "Glossary | Escoffier's Digital Guide" }`.
- `app/index/page.tsx` → `"Index | …"`.
- `app/shopping-list/page.tsx` → `"Shopping List | …"`.
- `app/chapters/[id]/page.tsx` should export a `generateMetadata({ params })` async function that fetches the chapter (or just the chapter summary from `/api/chapters`) and returns `{ title: "Chapter ${chapter.chapter}: ${chapter.title}" }`. Use an in-request memoization if the same data is already being fetched in the page render to avoid duplicate API calls.

**Verify:** `curl -s http://127.0.0.1:3000/glossary | grep -o '<title>.*</title>'` differs from the home page title, etc.

### 2.7 [P3] Stale comments documenting recent edits

Recurring "NEW SECTION", "END OF NEW SECTION", "THE FIX IS HERE", "MODIFICATION HERE" comments survive from earlier edits and have no current information value.

- `app/page.tsx:76` — `{/* The error is now resolved because the 'title' prop is optional */}`
- `app/page.tsx:88` — `{/* --- NEW SECTION: GLOSSARY --- */}`
- `app/page.tsx:95` — `{/* --- NEW SECTION: INDEX --- */}`
- `app/shopping-list/page.tsx:40, 51` — `{/* --- THIS IS THE NEW SECTION --- */}` and the matching `END`.

**Action:** delete these. They describe a point-in-time state that git history owns.

---

## 3. File-by-file cleanup

### 3.1 `app/globals-SAVE.css` — **[P0] DELETE ENTIRELY**

- 57 lines of commented-out experiments (lines 28-56 are literally inside `/* … */`), stale `:root` definitions, and an orphaned `@media (prefers-color-scheme: dark)` block that never ships.
- `grep -rn globals-SAVE /Users/jmwagner/Projects/DataAnnotation/Boxing/escoffier-willow` returns **zero** references.
- The `.next/` build cache will happily ignore it, but the file confuses any human scanning `app/`.

**Action:** `rm app/globals-SAVE.css`.

**Verify:** the file is gone and `grep -rn globals-SAVE .` is empty.

### 3.2 `app/globals.css` — **[P1]**

```css
@import "tailwindcss";
/* @import '@tailwindcss/typography'; */
```

Two issues:

1. **The commented-out `@tailwindcss/typography` import is a bug trap.** `app/page.tsx:75` uses `prose prose-lg` classes. With Tailwind v4, the typography plugin is registered via `@plugin "@tailwindcss/typography";` in CSS **or** through `tailwind.config.*`. If it is not active, the `prose` classes silently no-op. The package is installed (`@tailwindcss/typography` is in `devDependencies` of `package.json`), so the intent is clearly "use it", but the actual wiring is missing.
2. The single line of `@import "tailwindcss"` has no `@plugin` declarations, no CSS variables, no layer definitions — it is thin enough that it's easy to miss that the typography plugin is *not* being loaded.

**Action:**
- Decide (via quick visual QA on `/` and `/chapters/chapter-i`) whether the `prose` classes are currently doing anything. If they are not, add `@plugin "@tailwindcss/typography";` below the `@import "tailwindcss";` line and verify the introduction paragraph on `/` gets the expected leading/font-size. Remove the commented-out line either way.
- If the decision is "we don't actually want prose styling", remove the `prose prose-lg max-w-none` classes from `app/page.tsx:75` instead.

**Verify:** `grep -n tailwindcss/typography app/globals.css` shows a single live `@plugin` line (or nothing, matching the removal choice).

### 3.3 `app/layout.tsx` — **[P1] + [P2]**

```tsx
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Inter } from "next/font/google";   // <-- semicolon and separate import
```

Issues, in order of severity:

1. **[P1] Dead fonts.** `Geist` and `Geist_Mono` are imported at lines 2, 8-11, and 13-16. They declare CSS variables `--font-geist-sans` and `--font-geist-mono`. A repo-wide grep for `font-geist` finds exactly **two** hits: the declarations themselves. Nothing consumes them. That means every cold boot of the Next dev server fetches two font families from Google just to set CSS variables nobody reads. Delete the imports and the `.variable` interpolations in the `<body>` className.
2. **[P1] Font import style.** `Inter` is imported on a separate line (line 3) with an **ES5 semicolon** in a file that otherwise has no semicolons. Either merge it with the `next/font/google` import on line 2 or drop the semicolon; Prettier will handle both under 2.1.
3. **[P1] `inter` declared mid-file.** Lines 8-16 declare `geistSans` / `geistMono`, then line 18 declares `metadata`, then line 23 declares `inter`. This is disorienting — fonts should be grouped together above `metadata`.
4. **[P2] Hardcoded `mx-12` wrapper.** Line 40 wraps all page children in `<div className="mx-12">`. Every page then reintroduces its own width constraint (e.g. `max-w-5xl mx-auto` on the home page, ad-hoc widths elsewhere), which the layout margin fights with on narrow viewports. Either:
    - Remove `mx-12` and let each page own its gutters, OR
    - Replace with a responsive utility: `<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">` and strip the per-page `max-w-…` wrappers.
5. **[P2] `h-screen` on mobile.** Line 34: `flex h-screen flex-col`. Safari's dynamic toolbars make `100vh` render behind the browser chrome. `h-dvh` (Tailwind v4 supports it) is the modern equivalent; `min-h-dvh` if you want to allow the body to grow beyond the viewport.
6. **[P3] Two stray semicolons** — lines 3 (`import { Inter } from "next/font/google";`) and somewhere else per the grep above. Prettier sweep (§2.1) handles this.

**Verify:** `grep -n font-geist app/layout.tsx` is empty; `npx tsc --noEmit` green; visual check that the header remains pinned and only the `main` scrolls.

### 3.4 `app/page.tsx` — **[P1] + [P2]**

1. **[P1] Indentation & semicolons** (see §2.1). 82 tab-indented lines, 11 lines ending in `;`.
2. **[P1] Four parallel API calls for data that is also embedded in `/api/cookbook`.** `getCookbook()` already returns a document that contains `contents`, `glossary`, and `index` embedded (that is how the original `cookbook.json` was structured and the migration preserved it). Calling all four endpoints means the Home page makes **4** HTTP round-trips when **1** would do. There are two defensible choices:
    - **a.** Keep the current 4-call fan-out *only* if the dedicated endpoints might diverge from the embedded data in the future. Document that reasoning in a comment.
    - **b.** Drop to a single `getCookbook()` call and read `cookbook.contents`, `cookbook.glossary`, `cookbook.index`. Remove the `Promise.all` and the three unused helpers *on this page only*. (Glossary/index pages would still use the dedicated endpoints.)
    - Recommended: **(b)** for less over-fetching, and add a unit-level assertion somewhere that the two stay in sync (or rewrite the migration so `cookbook.json` stops duplicating `contents.json` / `glossary.json` / `index.json` — scope that as a follow-up, not part of this cleanup).
3. **[P1] `createCookbookTOC` is being fed a synthesised object.** Lines 36-39:
   ```tsx
   const tocItems = createCookbookTOC({
       ...cookbook,
       contents: contents ?? cookbook.contents,
   });
   ```
   This works because `Cookbook` has an index signature (`[k: string]: unknown`), but it's unclear: the helper is asking for a full `Cookbook` when it really only needs `contents`. Fix by changing `createCookbookTOC`'s signature (in `functions/createCookbookTOC.ts`) to take a `CookbookTableOfContents` directly, then call `createCookbookTOC(contents ?? cookbook.contents)`.
4. **[P2] Source-publication block rendering.** Line 59: `{cookbook.source.title} ({cookbook.source.edition})` will render `undefined` inside the parentheses if `edition` is missing (the schema says `edition` is optional). Guard it: `{cookbook.source.edition && ` (${cookbook.source.edition})`}`.
5. **[P2] Missing `alt`/aria on the source link.** Line 64-71 opens a new tab with `target="_blank" rel="noopener noreferrer"` — good — but lacks an `aria-label` describing the destination. Minor a11y polish.
6. **[P3] Stale comment `{/* The error is now resolved … */}`** on line 76 — delete per §2.7.
7. **[P3] Decorative HTML comment banners** on lines 88 and 95 — delete per §2.7.

**Verify:** `curl -s http://127.0.0.1:3000/ | grep -c 'FONDS DE CUISINE'` ≥ 1 and FastAPI's access log shows exactly one `/api/cookbook` request per page load (assuming option (b)).

### 3.5 `app/glossary/page.tsx` — **[P1]**

1. **[P1]** Indentation/semicolons (§2.1).
2. **[P1]** Redundant `import "@/app/globals.css"` (§2.2).
3. **[P1]** Unused `import React` (§2.3).
4. **[P2]** Missing `metadata` (§2.6).
5. **[P3]** Line 6 comment `// Make sure to import your global styles` becomes dead once 2.2 is applied.
6. **[P3]** Line 8 comment `// This is an async Server Component, which is the default in the App Router.` is purely educational and redundant with the `async` keyword.

### 3.6 `app/index/page.tsx` — **[P1] + [P2]**

All of the glossary-page items **plus**:

1. **[P2] Route name `/index` collides with the conventional filesystem meaning of "index".** Every other framework treats `index` as the default segment; new contributors will expect `/index` to be the homepage, but in this app the homepage is `/` (served from `app/page.tsx`) and `/index` is the book's index-of-terms page. Worse, search engines may conflate them.

   Consider renaming the route to `/book-index` or `/terms` and adding a redirect from `/index`. This is non-trivial because `app/index/` as a directory name also works as "the index route folder", but filesystem-routing with `app/index/page.tsx` means the URL is exactly `/index` — confirmed by curl in the smoke test. If keeping `/index`, at least add a `export const metadata = { title: "Index | …" }` so browser tabs distinguish it from the root.

2. **[P3]** Line 8 redundant comment (same as 3.5).

### 3.7 `app/chapters/[id]/page.tsx` — **[P0] + [P1]**

```tsx
export default async function ChapterPage({
    params,
}: {
    params: { id: string }       // <-- WRONG for Next 16
}) {
    const { id } = await params
```

1. **[P0] Incorrect `params` type.** In Next 16, page components receive `params: Promise<{ id: string }>` — confirmed by the generated `.next/dev/types/validator.ts` line 9 (`params: Promise<ParamMap[Route]>`). The current type is `{ id: string }`, but the runtime `await params` suggests the author knew it was a promise. TypeScript doesn't currently flag this because `await` on a non-promise is legal, so the inconsistency is quietly wrong.

    **Action:** change the annotation to `params: Promise<{ id: string }>`. `npx tsc --noEmit` should stay green afterwards.

2. **[P1]** Redundant `import "@/app/globals.css"` (§2.2).
3. **[P1] `PartEntry` / `ChapterEntry` parameter annotations in `flatMap` are redundant.** Lines 18-19:
   ```tsx
   const allChapterIds = contents.flatMap((part: PartEntry) =>
       part.chapters.map((chapter: ChapterEntry) => chapter.id)
   )
   ```
   `contents` is already typed as `CookbookTableOfContents` (i.e. `PartEntry[]`) by the `apiClient.getContents` return type, so TypeScript infers `part` and `chapter` correctly. The explicit annotations + imports exist purely to satisfy the original author's comfort; they are noise.

   **Action:** drop the `PartEntry` and `ChapterEntry` imports, drop the parameter annotations:
   ```tsx
   const allChapterIds = contents.flatMap((part) =>
       part.chapters.map((chapter) => chapter.id)
   )
   ```

4. **[P1] `"Chapter not found!"` fallback is a raw `<div>`.** Lines 32-38. Three concerns:
    - It's not inside `<main>`, breaking the layout's semantic landmark structure.
    - It renders a `200` response body while the underlying resource is a `404`. Next 16 supports `notFound()` from `next/navigation`, which yields a proper `404` and triggers `app/chapters/[id]/not-found.tsx` (which doesn't exist yet — create one).
    - Users can't navigate back; there is no link home.

    **Action:**
    - Add `app/chapters/[id]/not-found.tsx` with a styled message and a link to `/`.
    - In `ChapterPage`, replace the `<div>` fallback with `notFound()`.

5. **[P2] `generateMetadata`** — see §2.6. Emit `{ title: "Chapter ${chapter.chapter}: ${chapter.title}" }`. Memoize the chapter fetch (Next dedupes by URL when using `fetch`, which the API client already uses, so a second call from `generateMetadata` is cheap).

6. **[P2] `generateStaticParams` returns `[]` on API failure at build time.** Line 15-17. If the FastAPI server is unreachable during `next build`, the app will successfully build with zero statically-generated chapter routes and all chapter requests will fall back to on-demand rendering, which depends on the API at request time. That is acceptable behaviour, but it's undocumented and there's no build-time warning. Add a `console.warn` and consider throwing when `process.env.NEXT_BUILD_STRICT === "1"`.

### 3.8 `app/shopping-list/page.tsx` — **[P1] + [P2]**

1. **[P1] `isClient` anti-pattern for hydration.** Lines 10-14:
   ```tsx
   const [isClient, setIsClient] = useState(false)
   useEffect(() => { setIsClient(true) }, [])
   ```
   This is a workaround for the fact that `shoppingListItems` (from `useShoppingList()`) is read from `localStorage`, so SSR renders the empty initial list and client rehydration then shows the populated list, causing a hydration mismatch warning. The fix of rendering "Loading…" on the server until the client takes over works but costs a full re-render round-trip.

   Two better options:
    - **a.** Make the `shopping-list` page strictly client-side with no SSR: add `export const dynamic = "force-dynamic"` and/or refactor so the render reads directly from `useSyncExternalStore` bound to `localStorage`. `useSyncExternalStore` is exactly the hook designed for this problem.
    - **b.** Keep `isClient` but extract the logic into a reusable `useLocalStorageValue` hook in `functions/` so it's not repeated (currently only used once, but the pattern will spread).

    Recommended: **(a)** with `useSyncExternalStore`, because the "Loading…" flash on every visit is annoying for a page that lives on the client anyway.

2. **[P1] `window.confirm` is a UX regression.** Line 18-20 uses the native `confirm()` dialog, which looks out of place next to the Tailwind UI. Replace with a styled confirmation modal (or a two-step "Really?" button) — deferrable to a UX pass.

3. **[P2] `item.number` used as React `key`.** Line 57 — this is only safe because the context enforces uniqueness on `number` (see 3.9.1). If that invariant ever breaks, React will silently collapse entries. Add a comment linking to the context's `isItemInList` guarantee, or switch to `key={`${item.number}-${item.title}`}` for defence in depth.

4. **[P2] Accessibility.** The "Remove" and "Remove All Items" buttons have no `aria-label` describing *what* is being removed. Add `aria-label={`Remove recipe ${item.number}: ${item.title}`}` on the per-item button and `aria-label="Remove all recipes from the shopping list"` on the bulk one.

5. **[P2] Missing `metadata`** (§2.6).

6. **[P3] Decorative comment banners** on lines 40 and 51 (§2.7).

### 3.9 `app/contexts/ShoppingListContext.tsx` — **[P1] + [P2]**

1. **[P1] Stale-closure race in `addItem`.** Lines 52-57:
   ```tsx
   const addItem = (item: ShoppingListItemType) => {
       if (!isItemInList(item.number)) {
           setShoppingListItems((prevItems) => [...prevItems, item])
       }
   }
   ```
   `isItemInList` reads `shoppingListItems` via closure (not via a ref or a functional setter). If two `addItem` calls fire before React commits the first one (e.g. rapid-fire clicks on two different ingredient buttons with the same recipe number), both can pass the `isItemInList` check and both can enqueue the same item. The duplicate check should happen inside the functional updater:
   ```tsx
   const addItem = (item: ShoppingListItemType) => {
       setShoppingListItems((prevItems) =>
           prevItems.some((i) => i.number === item.number)
               ? prevItems
               : [...prevItems, item]
       )
   }
   ```
   With that fix, `isItemInList` stays as a read-only helper for the UI.

2. **[P1] Context value is a fresh object on every render.** Lines 73-79. Every re-render of `ShoppingListProvider` creates a new `value` object, which invalidates every consumer's `useContext` regardless of whether anything they care about changed. Wrap with `useMemo`:
   ```tsx
   const value = useMemo(
       () => ({ shoppingListItems, addItem, removeItem, removeAllItems, isItemInList }),
       [shoppingListItems]
   )
   ```
   Also wrap `addItem`, `removeItem`, `removeAllItems`, `isItemInList` with `useCallback` so the deps array stays stable. (They currently capture `shoppingListItems` via closure, which is why this is needed — once you move the duplicate check inside the functional updater per item 1, `addItem` no longer depends on `shoppingListItems` at all.)

3. **[P1] `isItemInList` leaks the whole list to determine a boolean.** Not a bug, but now that the duplicate-check moves into the setter, `isItemInList` is only used by the UI for disabling the "Add to list" button. After the item-1 fix it can be simplified to `shoppingListItems.some(...)` inline in the consumer, or kept for API convenience but memoized. Either is fine.

4. **[P1] `React.FC` pattern** (§2.4).

5. **[P2] Hydration mismatch risk.** Line 24-38 initialises `shoppingListItems` with a function that reads `localStorage`. That function runs during SSR too (it will hit the `typeof window === "undefined"` branch and return `[]`), and then the client's initial render reads from `localStorage` and gets a different value — exactly the symptom that `app/shopping-list/page.tsx` is working around with the `isClient` trick (§3.8.1). Root cause fix: initialise to `[]` always, then read `localStorage` inside a `useEffect` that runs once on mount. That removes the hydration mismatch without the `isClient` dance.

6. **[P2] Silent JSON parse.** Line 33: `JSON.parse(item)` has no shape validation. A corrupted `localStorage["shoppingList"]` entry (invalid JSON, or valid JSON of the wrong shape) will either throw (caught on line 34) or silently return garbage that crashes on first render. Add a runtime guard:
   ```tsx
   const parsed = JSON.parse(item)
   if (!Array.isArray(parsed)) return []
   return parsed.filter((p) => typeof p?.number === "number" && typeof p?.title === "string")
   ```

7. **[P2] `console.error` in a committed client component.** Lines 35 and 48. These are legitimate error logs, but ESLint flags them in strict projects and they spam the user's browser console. Swap for a no-op in production or gate on `process.env.NODE_ENV !== "production"`.

8. **[P3] Numbered bullet comments.** Lines 6, 15, 20, 88 use `// 1. Define the shape…`, `// 2. Create the context…`, etc. These read like a tutorial. Remove them — the structure is self-evident.

---

## 4. External-to-`app/` items that directly affect `app/`

These are not inside `app/` but `app/` files break or become cleaner if they are fixed. Include in the cleanup scope:

### 4.1 [P0] `types/ShoppingListItemType.ts`

```ts
 import { ContentBlock } from "@/types/generated.ts/content-block-schema.d"
```

- **Line 1 starts with a space** before `import`. Prettier will strip it but only if the file is included in the Prettier run.
- **`.d` suffix in the import path** — `@/types/generated.ts/content-block-schema.d` works via TS module resolution but is non-idiomatic. The canonical form is `@/types/generated.ts/content-block-schema`.

**Action:** fix both.

### 4.2 [P1] `types/ShoppingListType.ts` — dead file

```ts
import ShoppingListItemType from "@/types/ShoppingListItemType"
type ShoppingListType = ShoppingListItemType[]
export default  ShoppingListType   // <-- two spaces after `default`
```

A repo-wide grep for `ShoppingListType\b` finds only this file. It is never imported.

**Action:** delete.

### 4.3 [P2] `createCookbookTOC` should take `CookbookTableOfContents`

Follow-up from §3.4 item 3: `functions/createCookbookTOC.ts` currently takes a full `Cookbook` but only reads `cookbookData.contents`. Narrow the input type, rename the function parameter, update its single caller (`app/page.tsx`).

---

## 5. Proposed execution order

If you later execute this plan, do it in this order so each step is independently verifiable and reversible:

1. **§3.1** — Delete `app/globals-SAVE.css` (safe, unreferenced).
2. **§4.2** — Delete `types/ShoppingListType.ts` (safe, unreferenced).
3. **§2.1** — Prettier sweep (mechanical, reversible).
4. **§2.2** — Remove redundant CSS imports (4 lines across 4 files).
5. **§2.3 + §3.3 item 1** — Drop dead `React` and font imports.
6. **§3.7 item 1** — Fix the `params: Promise<{ id: string }>` type (P0 correctness).
7. **§3.2** — Fix the typography-plugin wiring in `globals.css`.
8. **§4.1** — Fix `ShoppingListItemType` import path + leading space.
9. **§3.9 items 1, 2, 5** — Context fixes (race, memoization, hydration).
10. **§3.8 item 1** — Swap the `isClient` hack for `useSyncExternalStore` now that the context no longer races.
11. **§3.4 item 2** — Collapse the 4-call fan-out on the home page (if option b is chosen).
12. **§3.7 item 4** — Add `not-found.tsx` for chapters and switch to `notFound()`.
13. **§2.5** — Extract `DataLoadError` component and consolidate the three fallbacks.
14. **§2.6** — Add per-page `metadata` (and `generateMetadata` for chapters).
15. **§2.4** — Drop `React.FC`.
16. **§3.3 items 4, 5** — Layout width and `h-dvh` polish.
17. **§3.8 items 2, 4** — Shopping-list UX + a11y.
18. **§2.7 + §3.x P3 items** — Strip stale comments.

After every step: `npx tsc --noEmit`, `npm run lint`, boot the full stack, and curl `/`, `/glossary`, `/index`, `/chapters/chapter-i`, `/chapters/chapter-xx`, `/shopping-list`. The FastAPI access log should still show the exact same calls as the smoke test recorded in `README.md` (minus step 11's deletions, if that option is taken).

---

## 6. Out of scope (deliberately not in this plan)

- Rewriting the `components/` directory — that was specifically not asked for and these pages interact with many components that have their own issues.
- Adding a Next.js/JS test runner — CLAUDE.md explicitly says not to do this without asking.
- Changing the migration's cookbook document shape so `cookbook.json` stops duplicating `contents.json` / `glossary.json` / `index.json`. That would make §3.4 item 2 option (b) the obvious answer but it's a cross-cutting data decision.
- Replacing Motor with the new pymongo async API on the backend.
- Server-side rendering the shopping list (it's localStorage-only by design).
- Internationalization and dark mode (both hinted at in `globals-SAVE.css` but explicitly dead).

---

## 7. Rough effort guess

| Severity | Items | Est. size |
| -------- | ----: | --------- |
| P0       | 2 (§3.1 delete, §3.7 item 1 type) | < 15 minutes |
| P1       | ~13 | 1–2 hours, mostly mechanical |
| P2       | ~12 | 2–4 hours, includes context rewrite + a11y pass |
| P3       | ~8 | < 30 minutes, folded into other steps |

Totals are indicative only; the meaningful signal is that nothing here blocks anything else, every step is individually verifiable, and the P0 items alone reduce real correctness risk.
