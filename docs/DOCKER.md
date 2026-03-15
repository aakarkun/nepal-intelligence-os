# Run with Docker

Once Docker is installed, you can run the API, Worker, and Postgres with one command. They run as **three separate containers** (three processes) that Compose starts together — not one container with everything inside.

- **1 Compose file** (`docker compose up`) → starts **3 containers**: `db`, `api`, `worker`.
- Each container has its own image and process; they talk over Docker’s network (e.g. API uses `db:5432`, Worker uses `http://api:3001`).

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

First run can take a few minutes while images build.

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

## 5. Optional: Worker secret

To protect the worker-state endpoints, set the same secret for API and Worker:

```bash
# .env in repo root (or export before docker compose up)
WORKER_SECRET=your-secret-here
```

Then pass it into Compose:

```bash
WORKER_SECRET=your-secret-here docker compose up --build
```

If you don’t set `WORKER_SECRET`, the endpoints still work (no auth).

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
