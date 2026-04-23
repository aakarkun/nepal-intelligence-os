# Run with Docker

Once Docker is installed, you can run the Web app, API, Worker, and Postgres with one command. They run as **separate containers** (separate processes) that Compose starts together — not one container with everything inside.

- **1 Compose file** (`docker compose up`) → starts **4 containers**: `db`, `api`, `worker`, `web`.
- Each container has its own image and process; they talk over Docker’s network (e.g. API uses `db:5432`, Worker uses `http://api:3001`). The browser loads the Next.js app from `web`, and Next.js proxies API calls (`/v1`, `/api/stream`) to the backend target (default `http://localhost:3001`).

---

## Environment variables

- **One root `.env`** (optional): Copy from `.env.example` at repo root. Used for **local dev** (when you run `bun run dev:api` / `dev:worker` / `dev:web` from root, the runner loads root `.env`) and for **Docker** (Compose reads root `.env` for variable substitution and passes only what each service needs).
- **Per-app `.env`**: Each app has its own `.env.example` listing only that app’s variables. Use per-app `.env` when running a single app from its directory (e.g. `cd apps/api && bun run dev`). In Docker, **env is set by Compose** (see below); no per-app `.env` is required inside containers.

| App    | Needs                                                                 | In Docker (set by Compose) |
|--------|-----------------------------------------------------------------------|----------------------------|
| **API**   | `API_PORT`, `DATABASE_URL`, optional `WORKER_SECRET`, `ADMIN_SECRET`, `ANTHROPIC_API_KEY` | All set in `docker-compose.yml`; optional ones from root `.env` |
| **Worker** | `API_URL`, optional `WORKER_SECRET`, `ADMIN_SECRET`, `MODE`, plus feeds/cron/etc. | Same; optional from root `.env` |
| **Web**   | `NEXT_PUBLIC_*` + `API_PROXY_TARGET` (no DB). Frontend can use same-origin API via Next rewrites. | `docker-compose.yml` passes web env/build args; default proxy target is `http://localhost:3001`. |

To pass secrets into Docker (e.g. `WORKER_SECRET`, `ADMIN_SECRET`, `ANTHROPIC_API_KEY`), create a `.env` at repo root from `.env.example` and set the values. Compose will substitute them into the `api` and `worker` services. No root `.env` is required for a minimal run (DB + API + Worker + Web work with defaults).

For **hot reload** while editing the UI, skip the `web` container and run **`bun run dev:web`** from the repo root instead (see below).

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
4. Build and start **Web** (Next.js standalone; default **host** port **3000**, override with `WEB_HOST_PORT` in root `.env`, e.g. `3100`)

First run can take a few minutes while images build. The worker image includes **fixtures** (for bootstrap/replay) and **Python + Scrapling** (for live ECN). If you pulled changes that touch `apps/worker` or `apps/scrapling`, rebuild with `docker compose up --build` (or `docker compose build --no-cache worker` then `docker compose up -d`).

If Compose warns about **orphan** containers from an older project definition (e.g. a renamed `web` service), run once with **`docker compose up -d --build --remove-orphans`** to remove them.

---

## 3. Web app: Docker vs local dev

**With Compose:** after `docker compose up`, open **http://localhost:3000** by default, or **http://localhost:3100** if you set **`WEB_HOST_PORT=3100`** in root `.env` (container still listens on port 3000 *inside* Docker). The browser uses same-origin API routes (`/v1`, `/api/stream`) and Next proxies to the backend target.

**Hot reload (optional):** run the Web app on the host so Turbopack can reload while you edit:

```bash
# From repo root
bun run dev:web
```

Then open **http://localhost:3000** — Discover, Feed, Map, etc. will use same-origin API routes proxied by Next.

---

## 4. Useful commands

| Command | Description |
|--------|-------------|
| `docker compose up --build` | Build and start (foreground) |
| `docker compose up -d --build` | Build and start in background |
| `docker compose down` | Stop and remove containers |
| `docker compose down -v` | Stop and remove containers **and** the Postgres volume (fresh DB) |
| `docker compose up -d --remove-orphans` | Start and drop containers not defined in the current file |
| `docker compose logs -f api` | Follow API logs |
| `docker compose logs -f web` | Follow Web logs |

---

## 5. Deploy Env Checklist (Required)

Use this checklist for any deploy target (Compose, GHCR images, VPS, k8s, AI-operated deploys).

1. **Web routing mode**
   - Prefer same-origin proxy mode:
     - `NEXT_PUBLIC_API_URL=` (empty)
     - `API_PROXY_TARGET=<internal-api-url-reachable-from-web>`
   - Examples:
     - Docker Compose: `API_PROXY_TARGET=http://api:3001`
     - Single host process: `API_PROXY_TARGET=http://localhost:3001`
     - k8s/service mesh: `API_PROXY_TARGET=http://api.<namespace>.svc.cluster.local:3001`

2. **API / Worker linkage**
   - Worker must point to API:
     - `API_URL=<api-base-url-reachable-from-worker>`
   - API must have DB:
     - `DATABASE_URL=<postgres-connection-string>`

3. **Secrets parity**
   - If set, values must match across API and Worker:
     - `WORKER_SECRET`
     - `ADMIN_SECRET`

4. **External exposure**
   - Expose only Web publicly when possible.
   - API can stay private/internal because web proxies `/v1` and `/api/stream`.

### Smoke test after deploy

```bash
# 1) Web reachable
curl -i http://<web-host>:3000/

# 2) Proxied API reachable through web (not direct API)
curl -i http://<web-host>:3000/v1/national-summary

# 3) SSE route proxied through web
curl -i -N http://<web-host>:3000/api/stream
```

If step 2 or 3 fails while step 1 works, `API_PROXY_TARGET` is likely wrong for the web runtime.

---

## 6. Optional: Worker secret and other vars

To protect the worker-state endpoints or set admin/Anthropic keys, use a root `.env` (copy from `.env.example`):

```bash
# .env in repo root
WORKER_SECRET=your-secret-here
# ADMIN_SECRET=...
# ANTHROPIC_API_KEY=...
```

Compose reads root `.env` for substitution, so `WORKER_SECRET=your-secret-here docker compose up --build` also works. If you don’t set `WORKER_SECRET`, the endpoints still work (no auth).

---

## 7. What’s in the stack (4 containers)

| Service | Image | Port | Role |
|--------|--------|------|------|
| **db** | postgres:16 | 5432 | PostgreSQL; API is the only app that connects |
| **api** | Built from `apps/api/Dockerfile` | 3001 | REST API + runs migrations on startup |
| **worker** | Built from `apps/worker/Dockerfile` | — | Polls ECN/news/NEPSE etc. and POSTs to API |
| **web** | Built from `apps/web/Dockerfile` | `WEB_HOST_PORT` (default **3000**) → container **3000** | Next.js (standalone); browser uses same-origin `/v1` and `/api/stream`, proxied by Next to `API_PROXY_TARGET` |

Dockerfiles used:

- `apps/api/Dockerfile`
- `apps/worker/Dockerfile`
- `apps/web/Dockerfile`

No extra setup is required; `docker compose up --build` is enough to host Web + API + Worker + DB.

---

## 8. Prebuilt images (GHCR)

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
