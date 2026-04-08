# GIT-COMMIT.md — Staged changes since `9debcf9`

Snapshot of every change in the working tree since the last commit on this detached HEAD (`9debcf9 Fix ContentBlockList component and update chapter data`). **Nothing has been committed.** This file exists so the diff can be reviewed and split into logical commits by a human.

## 0. How to look at this

- `git status --porcelain` sees **29 entries**: 11 modified files, 3 deletions, and 15 new paths (some of which are directories containing multiple files).
- `git diff --stat` (working tree vs. `HEAD`) reports **17 tracked files** changed: **+577 / −351** lines, not counting untracked new files.
- `.claude/`, `.next/`, `next-env.d.ts`, `node_modules/`, `server/.venv/`, `server/.pytest_cache/`, `server/app/__pycache__/`, `tests/server/__pycache__/`, and `tsconfig.tsbuildinfo` are **ignored** and must not be committed.

## 1. Changes grouped by logical feature

The work was done as eight sequential tasks. Each one is a candidate standalone commit — the suggested commit messages at the bottom of this file assume that split.

### 1.1 Task 1 — MongoDB in Docker + Makefile workflow

**New files**

- `compose.yaml` — `mongo:7` service `escoffier-mongodb`. Publishes `127.0.0.1:${MONGO_HOST_PORT:-27018}:27017` (host port **27018**, deliberately not 27017, to avoid conflicting with a locally-installed Homebrew mongodb-community on this machine). Named volumes `mongodb_data` / `mongodb_config`. Healthcheck via `mongosh --eval "db.adminCommand('ping').ok"`.
- `Makefile` — top-level workflow targets with a `help:` block:
  - `start-db`, `stop-db`, `restart-db`, `db-status`, `db-logs`, `db-shell`, `db-clean`
  - `migrate-db`
  - `install-server`, `start-server`, `test-server`

**Modified**

- `README.md` — added a **Database** section documenting requirements, `make` targets, connection details, volume persistence, and the default credentials (`root` / `example` / `escoffier`).

**Tested**: container starts healthy, `make stop-db` returns clean exit `0`, volumes persist across a stop/start cycle.

### 1.2 Task 2 — Migrate JSON data into MongoDB

**New files**

- `scripts/migrate-to-mongo.mjs` — Node ESM migration. Reads `data/cookbook.json`, `data/contents.json`, `data/glossary.json`, `data/index.json`, `data/chapters/chapter-*.json`. `deleteMany({})` + `insertMany(...)` per collection (idempotent). Honours `MONGO_URI`, `MONGO_HOST`, `MONGO_PORT`, `MONGO_ROOT_USERNAME`, `MONGO_ROOT_PASSWORD`, `MONGO_DATABASE`.

**Modified**

- `package.json` — added `mongodb: ^7.1.1` dep + `db:migrate` npm script.
- `package-lock.json` — lockfile updates for the `mongodb` install (**+143 / −2**).
- `README.md` — new **Migrating the JSON data into MongoDB** subsection with the collection layout table.

**Collection layout**

| Collection | Source | `_id` strategy |
| --- | --- | --- |
| `cookbook`  | `data/cookbook.json`          | fixed `"cookbook"` (single document) |
| `contents`  | `data/contents.json`          | the `part` value (e.g. `"I"`) |
| `glossary`  | `data/glossary.json`          | auto (terms are not unique — e.g. `"Anglaise"` appears 3×) |
| `index`     | `data/index.json`             | the `letter` value |
| `chapters`  | `data/chapters/chapter-*.json` | the chapter `id` (e.g. `"chapter-i"`) |

**Tested**: 1 + 2 + 107 + 24 + 6 documents inserted; counts match JSON sources exactly; re-running the migration is idempotent.

### 1.3 Task 3 — FastAPI server (Python, pyenv + uv)

**New directory** `server/` — 6 tracked files:

- `server/.python-version` — `3.12.12` (pinned via `pyenv local`).
- `server/pyproject.toml` — `escoffier-server 0.1.0`, `requires-python >=3.12`, deps `fastapi[standard]>=0.115` + `motor>=3.6`. `[tool.uv] native-tls = true` (required on this host to reach PyPI through the system trust store). Hatchling build backend declaring `packages = ["app"]`. Also contains the dev dep group (see §1.5).
- `server/uv.lock` — uv-resolved dep graph.
- `server/app/__init__.py` — empty.
- `server/app/db.py` — Motor client helpers. `build_mongo_uri()` honours `MONGO_URI` or builds from `MONGO_HOST`/`MONGO_PORT` (default `27018`)/`MONGO_ROOT_USERNAME`/`MONGO_ROOT_PASSWORD`. Singleton `get_client()` / `get_database()`. `close_client()` invoked by lifespan shutdown.
- `server/app/main.py` — FastAPI app with `lifespan` asynccontextmanager, CORS `GET`-only for `*`, `_serialize()` that recursively converts `ObjectId → str`, and the following routes:
  - `GET /` — health
  - `GET /api/cookbook` — single document, 404 if missing
  - `GET /api/contents` — parts sorted by `_id`
  - `GET /api/glossary` — sorted by `term`
  - `GET /api/index` — letter groups sorted by `_id`
  - `GET /api/chapters` — summaries in **cookbook order** (computed by cross-referencing the `contents` collection, so `chapter-ix` lands after `chapter-v` rather than before)
  - `GET /api/chapters/{chapter_id}` — single chapter, 404 if unknown

**Modified**

- `.gitignore` — added `server/.venv/`, `__pycache__/`, `*.pyc`, `.ruff_cache/`, `.pytest_cache/`.
- `Makefile` — `install-server` (`uv sync` inside `server/`) and `start-server` (`uv run fastapi dev …`) targets.
- `README.md` — new **API Server** section documenting requirements, setup, running, endpoints, configuration.

#### Sub-bug fix (port 27017 → 27018)

While testing, pymongo failed auth where Node had succeeded. Root cause: a Homebrew `mongodb-community` process is bound to `127.0.0.1:27017` with no auth, and Node resolved `localhost` to IPv6 (hitting the Docker container via `::1`) while pymongo resolved to IPv4 (hitting the local mongod). Fix — publish the container on port **27018** instead:

- `compose.yaml` — ports line changed to `127.0.0.1:${MONGO_HOST_PORT:-27018}:27017`.
- `scripts/migrate-to-mongo.mjs` — default `MONGO_PORT=27018`.
- `server/app/db.py` — default `MONGO_PORT=27018`.
- `README.md` — updated Database section to match.

**Tested**: every endpoint hit with curl; ObjectId serialized as string on `/api/glossary`; chapter order is `chapter-i, -ii, -iii, -iv, -v, -ix`; 404 works on `/api/chapters/does-not-exist`.

### 1.4 Task 4 — Pytest integration tests for the API

**New directory** `tests/server/` — 2 tracked files:

- `tests/server/conftest.py` — session-scoped `TestClient` fixture (inside a `with` block so FastAPI lifespan shutdown runs). Autouse `_require_db` fixture that pings Mongo and verifies the cookbook singleton is present, otherwise `pytest.skip`s the whole module with a helpful message.
- `tests/server/test_api.py` — **8 tests**:
  1. `test_root_health`
  2. `test_cookbook` — shape, known title and year
  3. `test_contents` — exactly two parts `["I", "II"]`, nested chapter shape
  4. `test_glossary_sorted_and_serialized` — alphabetical ordering + `_id` is a string (guards the ObjectId→str serializer)
  5. `test_index` — letter groups, sorted
  6. `test_chapters_list_order_and_fields` — verifies cookbook order via `chapter-v` < `chapter-ix`
  7. `test_get_single_chapter`
  8. `test_get_missing_chapter_is_404`

**Modified**

- `server/pyproject.toml` — added `[dependency-groups] dev = ["pytest>=8.3"]` and `[tool.pytest.ini_options] testpaths = ["../tests/server"]` + `addopts = "-ra"`.
- `server/uv.lock` — locked `pytest==9.0.2` + transitives.
- `Makefile` — `test-server` target (`cd server && uv run pytest`).
- `README.md` — new **Testing** subsection explaining the skip-on-no-db behavior and what each test covers.

**Tested**: **8 passed** with the DB up; **8 skipped** with a descriptive reason when the DB is down.

### 1.5 Task 5 — Wire the Next.js pages to the FastAPI server

**New file**

- `functions/apiClient.ts` — typed fetch helpers with `cache: "no-store"` and a `null`-on-404 contract:
  - `getCookbook(): Promise<Cookbook | null>`
  - `getContents(): Promise<CookbookTableOfContents | null>`
  - `getGlossary(): Promise<CookbookGlossary | null>`
  - `getIndexData(): Promise<CookbookIndex | null>`
  - `getChapter(id: string): Promise<CookbookChapter | null>` (URL-encodes the id)
  - Base URL resolution: `NEXT_PUBLIC_API_BASE_URL` → `API_BASE_URL` → `http://127.0.0.1:8000`.

**Deleted**

- `functions/getData.ts` — obsolete filesystem JSON reader. All four consuming pages now use `apiClient` instead.

**Modified (initial API integration — will be further cleaned up in §1.7)**

- `app/page.tsx` — switched to `apiClient`. (Later collapsed to a single call in Task 8.)
- `app/glossary/page.tsx` — now calls `getGlossary()`.
- `app/index/page.tsx` — now calls `getIndexData()`.
- `app/chapters/[id]/page.tsx` — `generateStaticParams` now calls `getContents()`; `ChapterPage` calls `getChapter(id)`.
- `README.md` — reworked the Directory and File Structure bullets for `data/`, `functions/`, added entries for `server/` and `tests/server/`. Rewrote **Getting Started** to spell out the four-step dev loop and document `NEXT_PUBLIC_API_BASE_URL`.

**Tested**: all five pages rendered from live API data; FastAPI access log confirmed the expected call pattern.

### 1.6 Task 6 — `CLAUDE.md`

**New file**

- `CLAUDE.md` — project-specific guidance at the repo root. Concrete rules only (no "write clean code" filler), grounded in files read during the work. Sections: project layout, running the stack (including the 27018 port rationale), env-var table, test runners, lint commands, TS style rules, Python style rules, Make target conventions, and a "things not to do (each has burned this project once)" list.

### 1.7 Task 7 — `CLEAN-UP-PLAN.md`

**New file**

- `CLEAN-UP-PLAN.md` — detailed file-by-file review of everything under `app/` (plus the couple of external files that directly affect `app/`). Items are bucketed **P0/P1/P2/P3** with line references and concrete prescriptions. The plan ends with a proposed execution order, an out-of-scope list, and a rough effort table. **No code was changed by Task 7.**

### 1.8 Task 8 — Execute the clean-up plan

Every actionable item from `CLEAN-UP-PLAN.md` was applied. Two items were explicitly deferred in the plan (§3.8.2 `window.confirm` UX modal; §3.6.2 `/index` route rename) and remain deferred.

#### Deletes

- `app/globals-SAVE.css` — 57 lines of commented-out CSS, zero references (`grep` verified).
- `types/ShoppingListType.ts` — zero references.

#### P0 fixes

- `app/chapters/[id]/page.tsx` — `params` type changed from `{ id: string }` to `Promise<{ id: string }>` (correct for Next 16 per `.next/dev/types/validator.ts:9`). Same for the new `generateMetadata`. A shared local type alias `ChapterRouteParams` is used by both.
- `types/ShoppingListItemType.ts` — removed leading-space bug on line 1 and the non-idiomatic `.d` suffix in `@/types/generated.ts/content-block-schema.d`.

#### P1 fixes

- `app/globals.css` — Tailwind v4 typography plugin now correctly wired via `@plugin "@tailwindcss/typography";` (was a commented-out v3-style `@import`).
- `app/layout.tsx`:
  - Dropped the dead `Geist` / `Geist_Mono` imports. They declared CSS variables `--font-geist-sans` / `--font-geist-mono` that nothing in the codebase referenced (verified by grep). Only `Inter` (the one actually-used font) remains. Confirmed from the opposite direction afterwards: the Next.js dev log used to fail to download Geist + Geist Mono + Inter; it now only fails to download Inter.
  - Reorganised top-to-bottom: fonts → metadata → component.
  - `h-screen` → `h-dvh` for correct dynamic-viewport behavior on mobile.
  - Removed the hardcoded `<div className="mx-12">` wrapper; pages own their own gutters.
  - **Bonus bug fix** found mid-cleanup: the layout previously used `<main>` while every page *also* used `<main>`, producing nested `<main>` landmarks. Changed the layout's scroll container to `<div>` so each page is the single `<main>`.
- Removed redundant `import "./globals.css"` / `import "@/app/globals.css"` from all four page files (no-ops once imported in the root layout). Only `app/layout.tsx` imports it now.
- Removed dead `import React from "react"` from `glossary/page.tsx`, `index/page.tsx`, `shopping-list/page.tsx` (project has `"jsx": "react-jsx"` so the import is not needed).
- `app/contexts/ShoppingListContext.tsx` — full rewrite:
  - Dropped `React.FC` in favour of `export function ShoppingListProvider(...)` with `ReactNode` imported as a type.
  - **Stale-closure race fixed** in `addItem`: the duplicate check now lives *inside* the functional updater, so two rapid `addItem` calls with the same number can no longer both pass a stale `isItemInList` check.
  - **Memoized the context value** with `useMemo` and wrapped every handler in `useCallback`. Consumers no longer re-render on unrelated provider re-renders.
  - **Hydration mismatch root-caused**: the provider now initializes to `[]` on both server and client and reads `localStorage` in a post-mount `useEffect`. A `hydrated` boolean gates the persistence effect so it doesn't overwrite storage with the empty initial state.
  - **Shape-validated `JSON.parse`** via an `isShoppingListItem` runtime type-guard; corrupt/wrong-shape storage is silently discarded.
  - `console.error` calls gated on `process.env.NODE_ENV !== "production"`.
  - Stripped "1. Define the shape…", "2. Create the context…", etc. tutorial comments.
- `app/shopping-list/page.tsx`:
  - Removed the `isClient` + `useEffect(() => setIsClient(true))` workaround — the hydration fix in the context made it unnecessary.
  - Added `aria-label`s to the per-item "Remove" button and the "Remove All Items" button; added `type="button"` to both.
  - React `key` hardened from `item.number` to `${item.number}-${item.title}` for defense-in-depth.
  - Changed root element from `<div>` to `<main>` to match the other pages' semantic landmark.
- `app/page.tsx`:
  - Collapsed the **four parallel API calls** (`cookbook` + `contents` + `glossary` + `index`) into a **single** `getCookbook()` call. The cookbook document already embeds all four datasets, so this removes three redundant HTTP round-trips per home-page render. Confirmed in the FastAPI access log.
  - `cookbook.source.edition` now rendered only when present (no more `(undefined)` in the source publication line).
  - `<a>` to Project Gutenberg now guarded by `cookbook.source.url &&` and has an `aria-label`.
- `app/chapters/[id]/page.tsx`:
  - Added `generateMetadata` that fetches the chapter and emits `Chapter ${chapter.chapter}: ${chapter.title} | Escoffier's Digital Guide`. React's fetch memoization dedupes this call with the page render — verified: only one `/api/chapters/chapter-i` call per visit.
  - `notFound()` from `next/navigation` replaces the raw `<div>Chapter not found!</div>`. Accompanied by a new `app/chapters/[id]/not-found.tsx` with a styled message and a "Return to the table of contents" link. **Smoke test confirms**: `GET /chapters/chapter-xx` now returns HTTP **404** instead of 200.
  - Dropped explicit `PartEntry` / `ChapterEntry` parameter annotations in `generateStaticParams` (the `CookbookTableOfContents` return type already infers them). Removed those now-unused imports.
  - `generateStaticParams` now logs a dev-mode `console.warn` when `/api/contents` returns null during build.
- `functions/createCookbookTOC.ts` — signature narrowed from `(cookbook: Cookbook)` to `(contents: CookbookTableOfContents)`. Caller in `app/page.tsx` updated accordingly. This avoided an awkward `{ ...cookbook, contents: contents ?? cookbook.contents }` spread.

#### P2 polish — new per-page metadata

- `app/glossary/page.tsx` → `Glossary | Escoffier's Digital Guide`
- `app/index/page.tsx` → `Index | Escoffier's Digital Guide`
- `app/chapters/[id]/page.tsx` → dynamic `generateMetadata`
- `app/shopping-list/layout.tsx` (new file — client pages can't export metadata directly) → `Shopping List | Escoffier's Digital Guide`

#### P2 polish — shared error component

- `components/DataLoadError.tsx` — new. Takes a `resource` prop and renders the missing-data message plus the `make start-db && make migrate-db && make start-server` hint. Used by `app/page.tsx`, `app/glossary/page.tsx`, `app/index/page.tsx` in place of three identical inline error blocks.

#### P3 polish

- Stripped stale decorative comments: "NEW SECTION", "END OF NEW SECTION", "THE FIX IS HERE", "MODIFICATION HERE", "This is an async Server Component…", "Make sure to import your global styles" and similar.

#### Prettier sweep

Three files (`app/page.tsx`, `app/glossary/page.tsx`, `app/index/page.tsx`) previously used tabs + semicolons, in violation of the project's `.prettierrc` (`semi: false`, `tabWidth: 4` with spaces). Ran `npx prettier --write` over all touched files. Post-sweep verification: **0** leading-tab lines and **0** trailing semicolons across every `app/**/*.{ts,tsx,css}` file.

#### Verification after Task 8

- `npx tsc --noEmit` — **zero errors**.
- `npm run lint` — **zero new errors or warnings** in anything touched. Pre-existing 38 errors in `scripts/*.mjs` and warnings in `types/generated.ts/*.d.ts` are unchanged and out of scope.
- `make test-server` — **8 passed in 0.23s**.
- Full stack smoke test via curl (`/`, `/glossary`, `/index`, `/chapters/chapter-i`, `/chapters/chapter-xx`, `/shopping-list`) — all expected statuses, titles, and content strings present.
- FastAPI access log confirms: exactly **1** `/api/cookbook` per home-page render (was 4 before), correct 200/404 behavior on chapter routes.

## 2. Raw working-tree summary

### 2.1 Modified tracked files (17)

| Path | Lines Δ | Touched by |
| --- | ---: | --- |
| `.gitignore`                           | +7 | Task 3 |
| `README.md`                            | +174 / −? | Tasks 1, 2, 3, 4, 5 |
| `app/chapters/[id]/page.tsx`           | +63 / −? | Tasks 5, 8 |
| `app/contexts/ShoppingListContext.tsx` | +136 / −? | Task 8 |
| `app/globals-SAVE.css`                 | −56 (deleted) | Task 8 |
| `app/globals.css`                      | +1 / −1 | Task 8 |
| `app/glossary/page.tsx`                | +43 / −? | Tasks 5, 8 |
| `app/index/page.tsx`                   | +42 / −? | Tasks 5, 8 |
| `app/layout.tsx`                       | +29 / −? | Task 8 |
| `app/page.tsx`                         | +147 / −? | Tasks 5, 8 |
| `app/shopping-list/page.tsx`           | +35 / −? | Task 8 |
| `functions/createCookbookTOC.ts`       | +16 / −? | Task 8 |
| `functions/getData.ts`                 | −24 (deleted) | Task 5 |
| `package-lock.json`                    | +143 / −2 | Task 2 |
| `package.json`                         | +4 / −2 | Tasks 2, 4 |
| `types/ShoppingListItemType.ts`        | +1 / −1 | Task 8 |
| `types/ShoppingListType.ts`            | −5 (deleted) | Task 8 |

Totals reported by `git diff --stat`: **+577 / −351** across 17 files.

### 2.2 Untracked new paths that must be added (expanded to individual files)

```
CLAUDE.md                               (Task 6)
CLEAN-UP-PLAN.md                        (Task 7)
GIT-COMMIT.md                           (this file, Task 9)
Makefile                                (Tasks 1, 2, 3, 4)
compose.yaml                            (Task 1)
scripts/migrate-to-mongo.mjs            (Task 2)

functions/apiClient.ts                  (Task 5)
components/DataLoadError.tsx            (Task 8)
app/chapters/[id]/not-found.tsx         (Task 8)
app/shopping-list/layout.tsx            (Task 8)

server/.python-version                  (Task 3)
server/pyproject.toml                   (Tasks 3, 4)
server/uv.lock                          (Tasks 3, 4)
server/app/__init__.py                  (Task 3)
server/app/db.py                        (Task 3)
server/app/main.py                      (Task 3)

tests/server/conftest.py                (Task 4)
tests/server/test_api.py                (Task 4)
```

### 2.3 Paths that must NOT be added

`git status` shows one more untracked path that is **not part of this work**:

- `.claude/` — contains `.claude/settings.local.json`, which is user-local Claude Code state. Do not commit.

Recommended: either add a `.claude/` line to `.gitignore` as part of one of the commits below, or simply never `git add` it.

Also confirmed ignored by the current `.gitignore`:

- `.next/`, `next-env.d.ts`, `node_modules/`, `tsconfig.tsbuildinfo` — Next.js build artifacts.
- `server/.venv/`, `server/.pytest_cache/`, `server/app/__pycache__/`, `tests/server/__pycache__/` — Python venv and caches (ignored per the Task 3 `.gitignore` update).

## 3. Suggested commit split

The safest split is one commit per task so each commit is independently verifiable and each has a clear scope. Every command block below is a single commit — run `git add` on the listed paths, then `git commit -m`.

> **Important:** do NOT `git add .` or `git add -A` — that would drag `.claude/` and `GIT-COMMIT.md` into whichever commit you run first. Use explicit paths.

Note on the current HEAD: the repository is **detached** at `9debcf9`. Create a branch before committing, e.g. `git checkout -b feature/api-backend`.

### Commit 1 — Database in Docker

```
git add compose.yaml Makefile
# (note: Makefile will also be included in later commits because it accretes
#  targets across tasks — if you prefer, stage only the help/start-db/stop-db
#  lines via `git add -p` here and let subsequent commits add their own lines)
```

Message: **feat(db): add MongoDB docker-compose + Makefile workflow (host port 27018)**

### Commit 2 — Migrate JSON → MongoDB

```
git add scripts/migrate-to-mongo.mjs package.json package-lock.json
git add -p Makefile    # the migrate-db target only
git add -p README.md   # the Database + migration sections only
```

Message: **feat(db): migrate cookbook/contents/glossary/index/chapters JSON to MongoDB**

### Commit 3 — FastAPI server

```
git add server/.python-version server/pyproject.toml server/uv.lock
git add server/app/__init__.py server/app/db.py server/app/main.py
git add -p .gitignore  # the Python venv / __pycache__ lines
git add -p Makefile    # install-server + start-server targets
git add -p README.md   # API Server section
```

Message: **feat(server): add FastAPI backend serving cookbook data from MongoDB**

### Commit 4 — Pytest integration tests

```
git add tests/server/conftest.py tests/server/test_api.py
# server/pyproject.toml already staged in commit 3 — but if you're committing
# linearly, split the pyproject edits so the pytest dep + tool.pytest section
# land here.
git add -p Makefile     # test-server target
git add -p README.md    # Testing subsection
```

Message: **test(server): add pytest integration tests for FastAPI API**

### Commit 5 — Wire Next.js pages to the API

```
git add functions/apiClient.ts
git rm functions/getData.ts
git add app/page.tsx app/glossary/page.tsx app/index/page.tsx "app/chapters/[id]/page.tsx"
git add -p README.md   # Getting Started rewrite + directory bullets
```

Message: **refactor(app): fetch cookbook data from FastAPI instead of local JSON**

### Commit 6 — CLAUDE.md

```
git add CLAUDE.md
```

Message: **docs: add CLAUDE.md with project conventions and commands**

### Commit 7 — CLEAN-UP-PLAN.md (review artifact)

```
git add CLEAN-UP-PLAN.md
```

Message: **docs: add CLEAN-UP-PLAN.md — file-by-file audit of app/**

Optional: this can be squashed into commit 8 if you do not want the plan in history.

### Commit 8 — Execute the clean-up plan

```
git add app/layout.tsx app/page.tsx app/glossary/page.tsx app/index/page.tsx
git add "app/chapters/[id]/page.tsx" "app/chapters/[id]/not-found.tsx"
git add app/shopping-list/page.tsx app/shopping-list/layout.tsx
git add app/contexts/ShoppingListContext.tsx
git add app/globals.css
git rm app/globals-SAVE.css
git add components/DataLoadError.tsx
git add functions/createCookbookTOC.ts
git add types/ShoppingListItemType.ts
git rm types/ShoppingListType.ts
```

Message: **refactor(app): execute clean-up plan (P0→P3)**

Suggested body:

```
- Fix params type to Promise<{id:string}> in chapters/[id] (Next 16 requirement)
- Wire @tailwindcss/typography plugin via @plugin (Tailwind v4)
- Drop dead Geist / Geist_Mono imports (only Inter is actually used)
- Drop redundant globals.css imports from every page; root layout owns it
- Drop dead `import React` in Server Components (jsx: react-jsx)
- Context: fix addItem stale-closure race, memoize value, fix hydration mismatch,
  shape-validate JSON.parse, drop React.FC, drop tutorial comments
- Shopping list: drop the isClient workaround, add aria-labels, harden keys
- Home page: collapse 4 API calls into 1 (/api/cookbook already embeds the rest)
- Chapter page: add generateMetadata, notFound() + not-found.tsx (200 → 404)
- New components/DataLoadError.tsx consolidates the three inline error fallbacks
- Per-page metadata exports (glossary, index, chapters, shopping-list)
- Layout: h-screen → h-dvh, drop hardcoded mx-12, resolve nested <main> landmarks
- Prettier sweep: 0 leading-tab lines, 0 trailing semicolons across app/
- Delete app/globals-SAVE.css (57 lines of commented-out CSS, unreferenced)
- Delete types/ShoppingListType.ts (zero references)
```

## 4. Review checklist before committing

- [ ] On a branch, not detached HEAD (`git checkout -b feature/api-backend`).
- [ ] `.claude/` is **not** staged (`git diff --cached --name-only | grep -v '^\.claude'`).
- [ ] `GIT-COMMIT.md` is **not** staged (this file is a review artifact, not a commit artifact).
- [ ] `make install-server && make start-db && make migrate-db` succeed on a clean checkout.
- [ ] `make test-server` reports **8 passed**.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] `npm run lint` has the same error/warning count as `HEAD~` (pre-existing noise only).
- [ ] Smoke test: `/`, `/glossary`, `/index`, `/chapters/chapter-i`, `/chapters/chapter-xx` (expect 404), `/shopping-list`.
- [ ] FastAPI access log shows exactly one `/api/cookbook` call per home-page render.
