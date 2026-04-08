This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

### Project Overview

- **Framework**: A modern Next.js 16 application using the App Router, written in TypeScript.
- **Styling**: Utilizes Tailwind CSS for styling, including the `@tailwindcss/typography` plugin for rich text formatting, which is ideal for a content-heavy site like a cookbook.
- **Data**: All content is sourced from local JSON files within the `data/` directory. This data is highly structured, with its shape strictly defined by JSON schemas (`data/schemas/`).
- **Type Safety**: The project leverages `json-schema-to-typescript` to automatically generate TypeScript types from the schemas. This ensures that the data passed to components is type-safe, reducing potential runtime errors.

### Directory and File Structure Analysis

- **`app/`**: This directory contains the core routing and page structure.
    - `layout.tsx`: The root layout defining the global HTML structure and applying the Geist font.
    - `page.tsx`: The homepage, which fetches `cookbook.json` to display the title, author information, and the main table of contents.
    - `chapters/[id]/page.tsx`: A dynamic route that statically generates pages for each chapter at build time using `generateStaticParams`. This is excellent for performance.
    - `glossary/page.tsx` & `index/page.tsx`: Static pages for displaying the glossary and index, respectively.
- **`components/`**: A well-organized set of React components responsible for rendering different parts of the UI.
    - `Chapter.tsx`, `Section.tsx`, and `Entry.tsx` work together to render the hierarchical structure of a chapter's content.
    - `ContentBlockList.tsx` is a key reusable component designed to handle the flexible `ContentBlock` schema, intelligently rendering simple lists, titled lists, and nested lists.
    - `Glossary.tsx` and `Index.tsx` are client components (`"use client"`) that use React's `useState` hook to provide interactive filtering by letter.
- **`data/`**: The original source-of-truth JSON content. These files are loaded into MongoDB by `make migrate-db` and are then served to the Next.js app through the FastAPI backend (see the Database and API Server sections below).
    - `cookbook.json` is the cookbook's metadata and a copy of its table of contents, glossary, and index.
    - `chapters/*.json`: Individual JSON files for each chapter's content.
    - `contents.json`, `glossary.json`, `index.json`: Standalone data sources for the respective pages.
    - `schemas/*.json`: The JSON Schema definitions that act as the single source of truth for the data's structure.
- **`functions/`**: Utility modules for Server Components, notably `apiClient.ts`, which provides typed `getCookbook` / `getContents` / `getGlossary` / `getIndexData` / `getChapter` helpers that call the FastAPI backend.
- **`server/`**: The Python FastAPI backend that reads from MongoDB and exposes `/api/*` JSON endpoints. See the API Server section.
- **`tests/server/`**: Pytest integration tests for the FastAPI server. See the Testing section.
- **`types/`**: This directory holds TypeScript definitions. The `generated.ts` subdirectory is particularly important as it contains the auto-generated types that align the code with the data schemas.

## Github Branching
- Using https://gist.github.com/digitaljhelms/4287848
- Using `feature`, `bugfic` and `stable`
- Feature Branches: These branches are used for developing new features. Use the prefix feature/. For instance, feature/login-system.
- Bugfix Branches: These branches are used to fix bugs in the code. Use the prefix bugfix/. For example, bugfix/header-styling.
- Hotfix Branches: These branches are made directly from the production branch to fix critical bugs in the production environment. Use the prefix hotfix/. For instance, hotfix/critical-security-issue.
- Release Branches: These branches are used to prepare for a new production release. They allow for last-minute dotting of i’s and crossing t’s. Use the prefix release/. For example, release/v1.0.1.
- Documentation Branches: These branches are used to write, update, or fix documentation eg. the README.md file. Use the prefix docs/. For instance, docs/api-endpoints.

## Getting Started

The Next.js app no longer reads the JSON files in `data/` directly — at runtime every page pulls its data from the FastAPI backend, which in turn reads from MongoDB. A full development loop therefore needs three processes running: MongoDB (in Docker), the FastAPI server, and the Next.js dev server.

First-time setup:

```bash
make install-server    # create the Python venv and install server deps via uv
```

Then, in order:

```bash
make start-db          # launch MongoDB in Docker (port 27018 on the host)
make migrate-db        # load data/*.json and data/chapters/*.json into MongoDB
make start-server      # FastAPI dev server on http://127.0.0.1:8000
npm run dev            # Next.js dev server on http://127.0.0.1:3000
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file — Server Components will refetch from the API on each request because `apiClient.ts` uses `cache: "no-store"`.

### Configuring the API base URL

By default the Next.js pages call `http://127.0.0.1:8000`. To point them at a different host or port, set either `NEXT_PUBLIC_API_BASE_URL` (recommended, since it also works in client-side bundles) or `API_BASE_URL` before starting `npm run dev`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://api.local:8000 npm run dev
```

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Database

The project ships with a [MongoDB](https://www.mongodb.com/) service defined in `compose.yaml` and managed through a `Makefile` wrapper around `docker compose`.

### Requirements

- [Docker](https://www.docker.com/) and the `docker compose` plugin
- GNU `make`

### Make targets

| Target        | Description                                                   |
| ------------- | ------------------------------------------------------------- |
| `start-db`    | Start the MongoDB container in the background                 |
| `stop-db`     | Stop the MongoDB container (data is preserved)                |
| `restart-db`  | Restart the MongoDB container                                 |
| `db-status`   | Show container status                                         |
| `db-logs`     | Tail container logs                                           |
| `db-shell`    | Open a `mongosh` shell inside the running container           |
| `db-clean`    | Stop the container **and delete its volumes** (destructive)   |
| `migrate-db`  | Load the JSON files under `data/` into MongoDB                |

Run `make help` to see the same list from the command line.

### Connection details

By default, the container is published on `127.0.0.1:27018` (port `27018` is used on the host so it cannot collide with a locally-installed mongod on `27017`). Inside the container mongod still listens on the standard `27017`.

- **Host port**: `27018`
- **Username**: `root`
- **Password**: `example`
- **Database**: `escoffier`

Connection URI:

```
mongodb://root:example@localhost:27018/escoffier?authSource=admin
```

These defaults can be overridden by setting `MONGO_HOST_PORT` (to change the published host port), `MONGO_ROOT_USERNAME`, `MONGO_ROOT_PASSWORD`, and `MONGO_DATABASE` in your environment (or in a `.env` file, which is git-ignored) before running `make start-db`.

### Data persistence

Database files are stored in the named Docker volumes `mongodb_data` and `mongodb_config`, so data survives `make stop-db` and `make restart-db`. Use `make db-clean` only when you want to wipe the database entirely.

### Migrating the JSON data into MongoDB

The source-of-truth JSON files under `data/` can be loaded into MongoDB with `make migrate-db` (equivalent to `npm run db:migrate`). The script lives at `scripts/migrate-to-mongo.mjs` and requires the container to be running (`make start-db`).

The migration creates/replaces the following collections in the `escoffier` database:

| Collection  | Source file(s)                       | `_id` strategy                           |
| ----------- | ------------------------------------ | ---------------------------------------- |
| `cookbook`  | `data/cookbook.json`                 | fixed `"cookbook"` (single document)     |
| `contents`  | `data/contents.json`                 | the `part` value (e.g. `"I"`)            |
| `glossary`  | `data/glossary.json`                 | auto-generated (terms are not unique)    |
| `index`     | `data/index.json`                    | the `letter` value                       |
| `chapters`  | `data/chapters/chapter-*.json`       | the chapter `id` (e.g. `"chapter-i"`)    |

Each collection is emptied before being re-populated, so running the migration multiple times is safe and produces the same result.

The script honours `MONGO_URI` (full override) as well as the same `MONGO_HOST`, `MONGO_PORT`, `MONGO_ROOT_USERNAME`, `MONGO_ROOT_PASSWORD`, and `MONGO_DATABASE` variables used by `compose.yaml`. The default `MONGO_PORT` is `27018` to match the host port published by compose.

## API Server

A lightweight read-only [FastAPI](https://fastapi.tiangolo.com/) server lives in `server/` and serves the cookbook data from MongoDB as JSON. It is intended to be used alongside the Dockerized database — no authentication is required at this stage.

### Requirements

- [`pyenv`](https://github.com/pyenv/pyenv) with Python `3.12.12` installed (`pyenv install 3.12.12`). The version is pinned in `server/.python-version`.
- [`uv`](https://docs.astral.sh/uv/) for dependency management. `uv` is used **instead of** `pip`.

### Setup

The first time (or after deps change):

```bash
make install-server
```

This runs `uv sync` inside `server/`, which creates `server/.venv` using the pyenv-selected Python and installs `fastapi[standard]` and `motor` as declared in `server/pyproject.toml`.

### Running the server

```bash
make start-db          # make sure MongoDB is up
make migrate-db        # (only needed the first time or after editing data/)
make start-server      # starts FastAPI dev server on http://127.0.0.1:8000
```

`start-server` runs `uv run fastapi dev app/main.py --host 127.0.0.1 --port 8000`, which enables auto-reload while you edit files in `server/`.

Interactive API docs are available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

### Endpoints

| Method | Path                          | Returns                                                               |
| ------ | ----------------------------- | --------------------------------------------------------------------- |
| GET    | `/`                           | Health probe (`{"status":"ok","service":"escoffier-api"}`)            |
| GET    | `/api/cookbook`               | The single `cookbook` document                                        |
| GET    | `/api/contents`               | All parts with their nested chapter listings                          |
| GET    | `/api/glossary`               | All glossary entries, sorted by term                                  |
| GET    | `/api/index`                  | All letter groups                                                     |
| GET    | `/api/chapters`               | Chapter summaries (`_id`, `id`, `chapter`, `title`) in cookbook order |
| GET    | `/api/chapters/{chapter_id}`  | A single chapter document (404 if unknown)                            |

### Configuration

The server reads the same `MONGO_*` environment variables as the migration script (see the Database section above). In particular, `MONGO_URI` can be supplied as a full override, and `MONGO_HOST_PORT`/`MONGO_PORT` both default to `27018`.

### Testing

Integration tests for the API live at [`tests/server/`](tests/server/) and are run with [pytest](https://docs.pytest.org/). They exercise the FastAPI app in-process through `fastapi.testclient.TestClient` and talk to a real MongoDB — so the database must be running and populated first.

Pytest is added as a dev dependency in `server/pyproject.toml` (under the `dev` dependency group) and is installed automatically by `make install-server` / `uv sync`.

```bash
make start-db          # start MongoDB
make migrate-db        # (only needed once, or after editing data/)
make test-server       # runs `uv run pytest` from inside server/
```

If MongoDB is not reachable, the entire suite is **skipped** with a helpful message rather than failing — so you can run `make test-server` safely even when the DB is down. When the DB *is* up, the suite currently contains **8 tests** covering:

- the `/` health probe
- `/api/cookbook` — shape and known title/year
- `/api/contents` — the two parts and their nested chapters
- `/api/glossary` — alphabetical ordering and that `_id` is serialized to a string (so the response is JSON-round-trippable even for auto-generated `ObjectId`s)
- `/api/index` — letter groups
- `/api/chapters` — cookbook ordering (verifying e.g. `chapter-ix` lands *after* `chapter-v` rather than at the lexical position)
- `/api/chapters/{id}` — fetching an individual chapter
- `/api/chapters/{unknown}` — 404 behaviour

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
