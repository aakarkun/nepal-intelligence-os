# Nepal Intelligence OS — Hosting Plan

How the three apps fit together, what can run in Docker, and how Neon (or any Postgres) fits in.

---

## 1. The three apps and who talks to whom

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER BROWSER                                    │
│  NEXT_PUBLIC_API_URL → calls API                                          │
└─────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  WEB (Next.js) — port 3000                                                │
│  - Serves UI (Discover, Map, Feed, etc.)                                  │
│  - Needs: NEXT_PUBLIC_API_URL (to call API from browser + server)         │
│  - Does NOT connect to the database                                       │
└─────────────────────────────────────────────────────────────────────────┘

                    │ HTTP (fetch /v1/...)
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  API (Hono + Bun) — port 3001                                             │
│  - All REST endpoints (/v1/feed, /v1/watchlist, /v1/worker-state, …)     │
│  - Needs: DATABASE_URL (PostgreSQL — Neon or local)                      │
│  - Only service that talks to the database                                │
└─────────────────────────────────────────────────────────────────────────┘
        │                                              ▲
        │ DATABASE_URL                                 │ HTTP (POST ingest, GET/PATCH worker-state)
        ▼                                              │
┌───────────────────┐                    ┌─────────────────────────────────┐
│  POSTGRESQL       │                    │  WORKER (Bun) — no fixed port    │
│  (Neon / local /  │                    │  - Polls ECN, news, NEPSE, etc.  │
│   any Postgres)   │                    │  - Needs: API_URL, WORKER_SECRET  │
│                   │                    │  - Does NOT connect to DB;        │
│  - All 17 tables │                    │    uses API for state + ingest    │
└───────────────────┘                    └─────────────────────────────────┘
```

**Summary:**

| App    | Connects to DB? | Needs DATABASE_URL? | Can run in Docker? |
|--------|------------------|----------------------|---------------------|
| **Web**   | No               | No                   | Yes (Next.js server) |
| **API**   | Yes              | Yes                  | Yes                 |
| **Worker**| No (uses API)    | No                   | Yes                 |

So: **one Postgres (local or Neon)** is used only by the **API**. The worker never touches the DB; it calls the API.

---

## 2. Can one Docker container run all three?

**Technically yes**, but **not recommended**:

- You’d run API, Worker, and Web (e.g. `next start`) in one container with a process manager (supervisord, or a shell that starts all three). One process crash can affect the others, and you can’t scale or restart API and Worker independently.
- **Recommended:** run **separate containers** (or separate processes) for API and Worker. Web can be in its own container or on Vercel.

---

## 3. Recommended setups

### Option A — Docker Compose (all three in Docker, one Postgres)

Good for: local staging, or a single VPS.

- **1 container:** API (port 3001, `DATABASE_URL` → Neon or a Postgres container).
- **1 container:** Worker (no port; needs `API_URL` and optional `WORKER_SECRET`).
- **1 container:** Web (port 3000; needs `NEXT_PUBLIC_API_URL` pointing at API).
- **DB:** Neon (hosted) **or** a Postgres container in the same Compose stack.

Neon works the same whether you run API/Worker/Web on your laptop or in Docker: the API container only needs `DATABASE_URL` set to the Neon connection string.

### Option B — Vercel (Web) + Docker or PaaS (API + Worker)

Good for: production with minimal ops.

- **Web:** Deploy to **Vercel** (connects to API via `NEXT_PUBLIC_API_URL`).
- **API + Worker:** Run in **Docker** (e.g. Railway, Fly.io, or your own server), or split: API on Railway/Fly, Worker as a separate container/cron.
- **DB:** **Neon** (or any hosted Postgres). Only the API needs `DATABASE_URL`.

### Option C — Single Docker container (all three)

If you really want one container:

- Use a small entrypoint script that starts API, Worker, and Web (e.g. `next start`) in the background and waits. API and Worker need the same env (`DATABASE_URL`, `API_URL`, etc.). Web needs `NEXT_PUBLIC_API_URL` pointing at `http://localhost:3001` (or the hostname you expose). Not ideal for production; Option A or B is better.

---

## 4. What goes in Docker (summary)

| Service | In Docker? | Notes |
|---------|------------|--------|
| **API**   | ✅ Yes | Use existing `apps/api/Dockerfile`. Set `DATABASE_URL` (Neon or Postgres URL). |
| **Worker**| ✅ Yes | Use existing `apps/worker/Dockerfile`. Set `API_URL` (and `WORKER_SECRET` if you protect worker-state). No DB. |
| **Web**   | ✅ Yes (optional) | Use existing `apps/web/Dockerfile`. Needs Next.js `output: 'standalone'` for the current Dockerfile. Or deploy Web to Vercel and skip Docker for Web. |
| **Postgres** | Optional in Docker | For local dev you can run Postgres in Docker; for production use **Neon** (or another hosted Postgres). |

**Neon** is just the Postgres the API connects to. It works the same whether API/Worker/Web run on your machine, in Docker, or on a PaaS.

---

## 5. Environment variables per service

**API**

- `DATABASE_URL` — **required.** Postgres URL (local or Neon).
- `API_PORT` — default 3001.
- `WORKER_SECRET` — optional; if set, GET/PATCH `/v1/worker-state` require `X-Worker-Secret`.
- (Others: `ADMIN_SECRET`, `ANTHROPIC_API_KEY`, etc. as in `.env.example`.)

**Worker**

- `API_URL` — **required.** Base URL of the API (e.g. `http://api:3001` in Docker, or public URL in production).
- `WORKER_SECRET` — same value as API if you protect worker-state.
- (Others: `MODE`, `CRON_ECN_MINUTES`, feeds, Telegram, etc.)

**Web**

- `NEXT_PUBLIC_API_URL` — **required.** API base URL the browser and server use (e.g. `http://localhost:3001` in dev, or `https://your-api.example.com` in prod).

---

## 6. Step-by-step: local dev with Docker + Neon (or local Postgres)

1. **Database**
   - **Local:** Start Postgres (Docker or Homebrew), create DB `nepal_intel`, set `DATABASE_URL`.
   - **Neon:** Create project, copy connection string, set `DATABASE_URL`.
2. **Migrations:** From repo root or `apps/api`:  
   `DATABASE_URL=... bun run db:migrate`  
   (Or start the API once; it runs migrations on startup.)
3. **API:** Run in Docker or on the host with `DATABASE_URL` and `API_PORT=3001`.
4. **Worker:** Run in Docker or on the host with `API_URL` pointing at the API.
5. **Web:** Run in Docker or on the host with `NEXT_PUBLIC_API_URL` pointing at the API.

If API and Worker are in Docker and Web is on the host, use `http://localhost:3001` for `API_URL` / `NEXT_PUBLIC_API_URL` when the API is published on 3001 on the host. If everything is in Docker Compose, use the API service name (e.g. `http://api:3001`) for `API_URL` inside the worker container, and the host’s URL for `NEXT_PUBLIC_API_URL` (so the browser can reach the API).

---

## 7. Example: Docker Compose with Neon

- `docker-compose.yml` runs **api** and **worker** only; Web runs locally or on Vercel.
- API gets `DATABASE_URL` from env (Neon connection string).
- Worker gets `API_URL=http://api:3001` and optional `WORKER_SECRET`.

No Postgres container needed when using Neon; one Neon DB is shared by the API.

---

## 8. Before deploying to production (checklist)

- [ ] Set **WORKER_SECRET** (same value in API and Worker) so only your worker can call GET/PATCH `/v1/worker-state`.
- [ ] Optionally set **ADMIN_SECRET** (API + Worker) for admin-only endpoints.
- [ ] Use a hosted Postgres (e.g. Neon) and set **DATABASE_URL** on the API; run migrations once.

---

## 9. Summary

- **One Postgres (local or Neon)** is enough; only the **API** uses it.
- **One Docker container per process** (API, Worker, and optionally Web) is better than stuffing all three into a single container.
- **Neon** works with any hosting: local, Docker, or PaaS. Set `DATABASE_URL` on the API and run migrations once; the rest of the stack is unchanged.
- **When deploying to web:** set WORKER_SECRET (and optionally ADMIN_SECRET) so worker-state and admin endpoints aren’t open.
