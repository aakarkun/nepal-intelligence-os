# Run with Docker

Once Docker is installed, you can run the API, Worker, and Postgres with one command. They run as **three separate containers** (three processes) that Compose starts together — not one container with everything inside.

- **1 Compose file** (`docker compose up`) → starts **3 containers**: `db`, `api`, `worker`.
- Each container has its own image and process; they talk over Docker’s network (e.g. API uses `db:5432`, Worker uses `http://api:3001`).

---

## Environment variables

- **One root `.env`** (optional): Copy from `.env.example` at repo root. Used for **local dev** (when you run `bun run dev:api` / `dev:worker` / `dev:web` from root, the runner loads root `.env`) and for **Docker** (Compose reads root `.env` for variable substitution and passes only what each service needs).
- **Per-app `.env`**: Each app has its own `.env.example` listing only that app’s variables. Use per-app `.env` when running a single app from its directory (e.g. `cd apps/api && bun run dev`). In Docker, **env is set by Compose** (see below); no per-app `.env` is required inside containers.

| App    | Needs                                                                 | In Docker (set by Compose) |
|--------|-----------------------------------------------------------------------|----------------------------|
| **API**   | `API_PORT`, `DATABASE_URL`, optional `WORKER_SECRET`, `ADMIN_SECRET`, `ANTHROPIC_API_KEY` | All set in `docker-compose.yml`; optional ones from root `.env` |
| **Worker** | `API_URL`, optional `WORKER_SECRET`, `ADMIN_SECRET`, `MODE`, plus feeds/cron/etc. | Same; optional from root `.env` |
| **Web**   | `NEXT_PUBLIC_*` only (no DB). Run locally; not in Compose.             | N/A |

To pass secrets into Docker (e.g. `WORKER_SECRET`, `ADMIN_SECRET`, `ANTHROPIC_API_KEY`), create a `.env` at repo root from `.env.example` and set the values. Compose will substitute them into the `api` and `worker` services. No root `.env` is required for a minimal run (DB + API + Worker work with defaults).

---

## 1. Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (Desktop or Engine)
- [Docker Compose](https://docs.docker.com/compose/install/) (included with Docker Desktop)

---

## 2. Start the stack

From the **repo root**:

```bash
docker compose up --build
```

This will:

1. Start **Postgres** (port 5432), create database `nepal_intel`
2. Build and start **API** (port 3001); migrations run on startup
3. Build and start **Worker** (polls feeds and posts to API)

First run can take a few minutes while images build. The worker image includes **fixtures** (for bootstrap/replay) and **Python + Scrapling** (for live ECN). If you pulled changes that touch `apps/worker` or `apps/scrapling`, rebuild with `docker compose up --build` (or `docker compose build --no-cache worker` then `docker compose up -d`).

---

## 3. Run the Web app (on your machine)

The Web app is not in the Compose file (so you can use hot reload during dev). Run it locally and point it at the API:

```bash
# From repo root
NEXT_PUBLIC_API_URL=http://localhost:3001 bun run dev:web
```

Then open **http://localhost:3000** — Discover, Feed, Map, etc. will use the API at `http://localhost:3001`.

---

## 4. Useful commands

| Command | Description |
|--------|-------------|
| `docker compose up --build` | Build and start (foreground) |
| `docker compose up -d --build` | Build and start in background |
| `docker compose down` | Stop and remove containers |
| `docker compose down -v` | Stop and remove containers **and** the Postgres volume (fresh DB) |
| `docker compose logs -f api` | Follow API logs |

---

## 5. Optional: Worker secret and other vars

To protect the worker-state endpoints or set admin/Anthropic keys, use a root `.env` (copy from `.env.example`):

```bash
# .env in repo root
WORKER_SECRET=your-secret-here
# ADMIN_SECRET=...
# ANTHROPIC_API_KEY=...
```

Compose reads root `.env` for substitution, so `WORKER_SECRET=your-secret-here docker compose up --build` also works. If you don’t set `WORKER_SECRET`, the endpoints still work (no auth).

---

## 6. What’s in the stack (3 containers)

| Service | Image | Port | Role |
|--------|--------|------|------|
| **db** | postgres:16 | 5432 | PostgreSQL; API is the only app that connects |
| **api** | Built from `apps/api/Dockerfile` | 3001 | REST API + runs migrations on startup |
| **worker** | Built from `apps/worker/Dockerfile` | — | Polls ECN/news/NEPSE etc. and POSTs to API |

Dockerfiles used:

- `apps/api/Dockerfile`
- `apps/worker/Dockerfile`

No extra setup is required; `docker compose up --build` is enough to host API + Worker + DB.

---

## 7. Prebuilt images (GHCR)

CI (`.github/workflows/docker-publish.yml`) builds and pushes **api**, **worker**, and **web** to GitHub Container Registry:

`ghcr.io/<github-owner>/nepal-intelligence-os/{api,worker,web}`

- **Branch pushes** to `main` or `dev`: tags `dev-latest` and `dev-<shortsha>` on each image.
- **Version tags** `v*`: each image is tagged with the same git tag (e.g. `v1.2.3-beta`). A GitHub Release is created with auto-generated notes.

To run from prebuilt images instead of local `docker build`:

```bash
# default: dev-latest; override tag with NIO_IMAGE_TAG=dev-abc1234
NIO_IMAGE_TAG=dev-latest docker compose -f docker-compose.ghcr.yml up -d
```

For a fork, set `GHCR_OWNER` if images live under a different owner than your default. **DB** stays `postgres:16` (no custom DB image).
