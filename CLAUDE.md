# CLAUDE.md

Project-specific guidance for Claude. All rules here are concrete and verifiable from the current codebase — generic advice ("write clean code") is intentionally omitted.

## Project layout

This is a three-tier app: Next.js frontend → FastAPI backend → MongoDB.

- `app/`, `components/`, `functions/`, `types/` — Next.js 16 App Router frontend (TypeScript + React 19).
- `data/` — source-of-truth JSON content + JSON Schemas. **Read-only from code**; loaded into Mongo by `scripts/migrate-to-mongo.mjs`.
- `scripts/` — Node ESM utilities (`.mjs`) for validation and migration.
- `server/` — FastAPI backend (Python 3.12, Motor, uv-managed venv at `server/.venv/`).
- `tests/server/` — pytest integration tests that hit the FastAPI app via `TestClient`.
- `compose.yaml`, `Makefile` — MongoDB container and workflow targets.

## Running the stack

Always use the `make` targets. Do not invent ad-hoc `docker compose` / `uv` / `node` invocations when one exists.

Full local dev loop (each step depends on the previous):

```bash
make install-server   # once: uv sync inside server/
make start-db         # MongoDB on 127.0.0.1:27018 (NOT 27017)
make migrate-db       # load data/*.json and data/chapters/*.json into Mongo
make start-server     # FastAPI dev server on 127.0.0.1:8000
npm run dev           # Next.js dev server on 127.0.0.1:3000
```

Stop order: Next.js (Ctrl-C) → FastAPI (Ctrl-C) → `make stop-db`. Use `make db-clean` **only** to deliberately wipe the Mongo volumes.

### Host port 27018 is deliberate

`compose.yaml` publishes `127.0.0.1:${MONGO_HOST_PORT:-27018}:27017`. Do not change this back to `27017` — a Homebrew `mongodb-community` on this machine holds `127.0.0.1:27017` with no auth, and Node vs. Python resolve `localhost` differently (IPv6 vs. IPv4), which caused silent auth failures. The default for `MONGO_PORT` in `scripts/migrate-to-mongo.mjs` and `server/app/db.py` is therefore `27018`.

### Environment variables

Both the migration script and the FastAPI server read the same env vars. If any are missing, defaults kick in:

| Var | Default | Used by |
| --- | --- | --- |
| `MONGO_URI` | unset (built from pieces) | everything, as full override |
| `MONGO_HOST` | `localhost` | script + server |
| `MONGO_PORT` | `27018` | script + server |
| `MONGO_HOST_PORT` | `27018` | `compose.yaml` only |
| `MONGO_ROOT_USERNAME` | `root` | script + server + compose |
| `MONGO_ROOT_PASSWORD` | `example` | script + server + compose |
| `MONGO_DATABASE` | `escoffier` | script + server + compose |
| `NEXT_PUBLIC_API_BASE_URL` | `http://127.0.0.1:8000` | `functions/apiClient.ts` |
| `API_BASE_URL` | same fallback | `functions/apiClient.ts` |

## Test runners, linting, type checking

### TypeScript / Next.js

- **Type check:** `npx tsc --noEmit` (zero output = pass). Run this before calling TS work done.
- **Lint:** `npm run lint`. Pre-existing lint noise exists in `scripts/*.mjs` and `types/generated.ts/*.d.ts` — do not try to fix those unless the user asks. *Your* new/edited files must produce zero new errors.
- **Tests:** There is no Next.js/JS test runner configured. Do not add `jest`, `vitest`, or similar without asking.
- **Full build smoke:** `npm run build` (exercises `generateStaticParams`, Server Components data fetches, and static render).
- **Regenerate JSON-schema types:** `npm run types:generate` (reads `data/schemas/`, writes `types/generated.ts/`).

### Python / FastAPI

- **Package manager:** `uv` only. Never invoke `pip` directly. Add deps via editing `server/pyproject.toml` and running `uv sync` from inside `server/` (or `make install-server`).
- **Tests:** `make test-server` (runs `uv run pytest` from inside `server/`; `testpaths` is set to `../tests/server` in `server/pyproject.toml`). Expect either **all pass** or **all skipped with the DB-not-reachable reason** — anything else is a real failure.
- **Lint/format:** No Python linter is configured. Do not silently add `ruff`/`black`/`mypy`; ask first.
- **Python version:** `3.12.12`, pinned in `server/.python-version`. The venv is created with `uv venv --python "$(pyenv which python)"`. Do not bypass pyenv.
- **System trust store:** `server/pyproject.toml` sets `[tool.uv] native-tls = true` because this host rejects bundled CAs for PyPI. Do not remove it.

## TypeScript style rules (enforced or verifiable)

- **Module system:** ES modules throughout. No `require()`. `.mjs` is allowed for `scripts/` only; everything else is `.ts` / `.tsx`.
- **Path aliases:** Use `@/…` (mapped to project root in `tsconfig.json`). Do not use deep relative imports like `../../../types/...`.
- **Formatting comes from `.prettierrc`** — no semicolons (`semi: false`), double quotes (`singleQuote: false`), ES5 trailing commas, **4-space indent**. If you edit a file, match the existing whitespace in that file (a few pre-existing files have stray semicolons; that is drift, not intent — do not introduce new semicolons).
- **Component typing:** Components currently use either `React.FC<Props>` or `(props: Props) => JSX.Element`. Pick whichever is already used in the file you are editing; do not mix them in the same file.
- **Props:** Define a named `interface XxxProps` or `type XxxProps` immediately above the component. Do not inline prop types in the parameter list for anything beyond trivial one-prop components.
- **Server vs. Client Components:** Default is Server Component (async function in `app/**/page.tsx`). Only add `"use client"` when the component uses state, effects, browser APIs, or event handlers. See `components/Glossary.tsx` (client) vs. `components/Chapter.tsx` (server).
- **Data fetching in Server Components:** Always go through `functions/apiClient.ts` (`getCookbook` / `getContents` / `getGlossary` / `getIndexData` / `getChapter`). Do **not** import `fs`, re-read `data/*.json`, or reintroduce `functions/getData.ts` — that file has been removed on purpose. Do not add a second `fetch` call into `/api/*`; add a helper to `apiClient.ts`.
- **`cache: "no-store"`** is set in `apiClient.ts` so Server Components always see fresh data. Do not change this without discussing caching strategy first.
- **Dynamic route params** are async in Next 16. Use `const { id } = await params`, as in `app/chapters/[id]/page.tsx`. Do not treat `params` as a plain object.
- **Generated types:** `types/generated.ts/*.d.ts` are produced by `json-schema-to-typescript`. **Never hand-edit them** — change `data/schemas/` and run `npm run types:generate`.
- **`TableOfContentsItemType`** is the one hand-written shared type, at `types/TableOfContentsItemType.ts`. Use `default interface` there to match the existing pattern.
- **Prefer `interface` for object shapes, `type` for unions/aliases.** Pre-existing code is consistent on this.
- **Explicit return types** on top-level functions in `functions/` (see `generateSlug.ts`, `createCookbookTOC.ts`). Component render functions may infer.
- **`null` is the "not found" sentinel** returned by `apiClient` helpers. Pages check for `null` and render a fallback message — keep that contract when adding new helpers.
- **No `any`.** The project runs `@typescript-eslint/recommended`; if you need a wildcard, use `unknown` and narrow.

## Python style rules (enforced or verifiable)

- **`from __future__ import annotations`** at the top of every `.py` file in `server/` and `tests/server/`. All existing files use it; keep the pattern.
- **Module docstring** (triple-quoted) as the first statement in every module. See `server/app/db.py`, `server/app/main.py`, `tests/server/conftest.py`.
- **Import order:** stdlib → third-party → local, with blank lines between groups (PEP 8). Match the existing files.
- **Type hints everywhere.** Modern syntax only: `str | None`, `list[dict[str, Any]]`, not `Optional[...]` / `List[...]`. All existing code uses PEP 604 / PEP 585.
- **Async code path:** All route handlers in `server/app/main.py` are `async def` and use Motor's `AsyncIOMotorClient`. Do not call blocking pymongo APIs from a request handler.
- **Lifespan not `@app.on_event`:** The FastAPI app uses `@asynccontextmanager def lifespan(...)`. `@app.on_event("startup" / "shutdown")` is deprecated — do not use it.
- **ObjectId serialization:** `_serialize()` in `server/app/main.py` converts `ObjectId` → `str` recursively before returning. Every endpoint that returns Mongo documents must pass the result through `_serialize()`. Do not `return doc` directly.
- **Config via env vars only.** Use `os.environ.get("NAME", "default")`. Do not introduce `.env` loading (`python-dotenv`) or a settings library unless asked.
- **Singleton Motor client** via `get_client()` / `get_database()`. Do not construct `AsyncIOMotorClient(...)` inside handlers.
- **Indent:** 4 spaces. Double quotes for strings. No trailing whitespace. Line length is informally ≤ 100 chars; match the file.
- **Tests live outside the package** at `tests/server/`. They import via `from app.main import app` — the `app` package is importable because `escoffier-server` is installed in editable mode by `uv sync`. Do not add `sys.path` hacks or `tests/server/__init__.py`.
- **Test fixtures:** Use the `client` fixture from `tests/server/conftest.py`. The autouse `_require_db` fixture skips the whole module when Mongo is unreachable — rely on it rather than adding try/except around every test.
- **Never add `print()` debugging** to committed server or test code. Use standard exceptions; FastAPI turns them into 500s with tracebacks in dev.

## Node / script rules

- Scripts live in `scripts/` as `.mjs` (ESM). Use `import`, not `require`.
- They are plain Node scripts (no TypeScript) and may use `process.env`, `console.log`, top-level `await`. ESLint currently flags `process` / `console` as undefined in these files — that's pre-existing and ignored; don't "fix" by adding lint-disables unless you own the whole rewrite.
- When adding a new script, wire it up in both `package.json` scripts and (if appropriate) the root `Makefile`.

## Make target conventions

- Targets that affect running containers/servers: `start-*`, `stop-*`, `restart-*`, `db-status`, `db-logs`, `db-shell`, `db-clean`.
- Dev-loop actions: `install-server`, `migrate-db`, `start-server`, `test-server`.
- Every target must have a one-line entry in the `help:` block at the top of `Makefile`. If you add a target, update `help`.
- Targets that wrap commands with subdirectory context use `cd <dir> && <cmd>` on a single line — do not split with newlines (Make runs each line in its own subshell).

## When editing

- **Read before editing.** Do not modify a file you have not read in the current session.
- **Stay in scope.** Do not "clean up" unrelated code in a file you're touching for a bugfix.
- **Do not regenerate `types/generated.ts/*` as a side effect.** Only regenerate when schemas in `data/schemas/` change.
- **After TS changes:** run `npx tsc --noEmit` and `npm run lint` and confirm zero new errors.
- **After Python changes:** run `make test-server` with the DB up.
- **After changing the API surface (`server/app/main.py`)**, update `tests/server/test_api.py` in the same commit. The README's endpoint table and `functions/apiClient.ts` must also match.

## Things not to do (each has burned this project once)

- Do not bind MongoDB to host port `27017` — it collides with Homebrew mongodb-community.
- Do not connect to Mongo from Python with SCRAM defaults expecting the URI to Just Work; the underlying bug was `localhost` resolution, not SCRAM. Fix by changing the host/port, not by twiddling `authMechanism`.
- Do not reintroduce `functions/getData.ts` or file-system JSON reads from Server Components. The architecture is now API-backed.
- Do not silently add new Python or JS dev dependencies. Add them to the appropriate `pyproject.toml` / `package.json` and mention them.
- Do not set `cache: "force-cache"` or Next.js `fetch` revalidation without discussing — the data is currently fully dynamic on purpose.
