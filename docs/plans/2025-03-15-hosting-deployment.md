# Nepal Intelligence OS — Hosting Deployment Plan

> **Goal:** Decide how to host Web, API, Worker, and Postgres, and execute the steps to get to production.

**Architecture (from [docs/HOSTING_PLAN.md](../HOSTING_PLAN.md)):** Browser → Web (Next.js) → API (Hono+Bun) → Postgres. Worker runs separately and talks only to the API (no DB). One Postgres (Neon or self-hosted) is used only by the API.

**Tech stack:** Next.js (Web), Hono+Bun (API), Bun (Worker), PostgreSQL (Neon or Docker), Docker, optional Vercel/Railway/Fly.io.

---

## 1. Hosting decision

| Goal | Recommended setup | Web | API + Worker | Database |
|------|-------------------|-----|--------------|----------|
| **Production, minimal ops** | Option B | Vercel | Railway or Fly.io (Docker) | Neon |
| **Single VPS / full control** | Option A | Same VPS in Docker, or Vercel | Same VPS (Docker Compose) | Neon or Postgres in Compose |
| **Local / staging** | Current Compose | Local `bun run dev:web` | `docker compose up` | Postgres in Compose or Neon |

**Recommendation:** Use **Option B** for production (Vercel + Railway/Fly + Neon) unless you explicitly want one server. Use **Option A** (single VPS with Compose) if you prefer one machine and are fine managing it.

---

## 2. Option B — Vercel (Web) + PaaS (API + Worker) + Neon

### 2.1 Prerequisites

- [ ] Neon account → create project, copy connection string (e.g. `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`).
- [ ] Vercel account (for Web).
- [ ] Railway or Fly.io account (for API + Worker).

### 2.2 Database (Neon)

1. Create a Neon project and copy `DATABASE_URL`.
2. Run migrations once (from repo root or `apps/api`):
   ```bash
   DATABASE_URL="postgresql://..." bun run db:migrate
   ```
   Or deploy API first; it runs migrations on startup.

### 2.3 API + Worker (Railway or Fly.io)

**Railway (one service per app):**

1. New project → Add service → Deploy from GitHub (this repo).
2. **API service:** Root directory; Dockerfile path: `apps/api/Dockerfile`. Set env:
   - `DATABASE_URL` = Neon connection string
   - `API_PORT` = 3001
   - `WORKER_SECRET` = (generate and save for Worker)
   - Optionally: `ADMIN_SECRET`, `ANTHROPIC_API_KEY`
3. **Worker service:** Same repo; Dockerfile path: `apps/worker/Dockerfile`. Set env:
   - `API_URL` = public API URL (e.g. `https://your-api.up.railway.app`)
   - `WORKER_SECRET` = same as API
   - Optionally: `ADMIN_SECRET`, `MODE=live`

**Fly.io (one app per process):**

1. From repo root, deploy API:
   ```bash
   fly launch --name nepal-intel-api --dockerfile apps/api/Dockerfile
   fly secrets set DATABASE_URL="..." WORKER_SECRET="..." ...
   ```
2. Deploy Worker (same repo, different app):
   ```bash
   fly launch --name nepal-intel-worker --dockerfile apps/worker/Dockerfile
   fly secrets set API_URL="https://nepal-intel-api.fly.dev" WORKER_SECRET="..."
   ```

### 2.4 Web (Vercel)

1. Import repo in Vercel; set root to repo root and framework to Next.js (or set app directory to `apps/web` if supported).
2. Set env in Vercel:
   - `NEXT_PUBLIC_API_URL` = public API URL (e.g. `https://your-api.up.railway.app` or `https://nepal-intel-api.fly.dev`).
3. Deploy. Ensure Web is built from `apps/web` (monorepo: may need to set "Root Directory" to `apps/web` and adjust build command).

### 2.5 Verification (Option B)

- [ ] API health/root returns 200.
- [ ] Web in browser loads and calls API (e.g. Feed/Discover).
- [ ] Worker is running (check worker-state or logs); ingest endpoints receive data.

---

## 3. Option A — Single VPS (Docker Compose + optional Web in Docker)

### 3.1 Prerequisites

- [ ] VPS (e.g. DigitalOcean, Linode, Hetzner) with Docker and Docker Compose.
- [ ] Neon project (or use Postgres in Compose on the VPS).

### 3.2 Compose with Neon (no local Postgres)

- Use current `docker-compose.yml` but **remove** or disable the `db` service when using Neon.
- Set `DATABASE_URL` for `api` to the Neon connection string (e.g. via env file or Compose `environment`).
- On the VPS:
  ```bash
  # .env on VPS
  DATABASE_URL=postgresql://... Neon connection string
  WORKER_SECRET=...
  ```
  Then: `docker compose up -d --build` (after adjusting Compose to not start `db` if using Neon).

### 3.3 Add Web to Compose (optional)

- Add a `web` service to `docker-compose.yml` that builds from `apps/web/Dockerfile`.
- **Requirement:** `apps/web/next.config.mjs` must set `output: 'standalone'` for the existing Web Dockerfile to work.
- Set env for `web`: `NEXT_PUBLIC_API_URL=http://api:3001` (internal) is wrong for the browser; the browser must reach the API by the **public** host (e.g. `https://api.yourdomain.com`). So build-time env on the VPS should be `NEXT_PUBLIC_API_URL=https://api.yourdomain.com`.
- Expose API on 3001 and Web on 3000; put a reverse proxy (e.g. Caddy/Nginx) in front for TLS and routing.

### 3.4 Verification (Option A)

- [ ] From the host: `curl http://localhost:3001` (API), `curl http://localhost:3000` (Web if in Compose).
- [ ] From the internet: API and Web reachable via domain; Worker logs show successful polling.

---

## 4. Pre-production checklist (all options)

From [HOSTING_PLAN.md](../HOSTING_PLAN.md):

- [ ] Set **WORKER_SECRET** (same value in API and Worker).
- [ ] Optionally set **ADMIN_SECRET** for admin-only endpoints.
- [ ] Use hosted Postgres (e.g. Neon) and set **DATABASE_URL** on the API; run migrations once.

---

## 5. Gaps / follow-up tasks

| Item | Action |
|------|--------|
| Web in Docker (Option A) | Add `output: 'standalone'` to `apps/web/next.config.mjs` so the existing Web Dockerfile works. |
| Compose + Neon | Add a `docker-compose.neon.yml` or env example that runs only `api` + `worker` with `DATABASE_URL` from env (no `db` service). |
| Vercel monorepo | Confirm Vercel root (e.g. `apps/web`) and build command so Web deploys correctly. |

---

## 6. Summary

- **Choose Option B** for production with minimal ops: Vercel (Web) + Railway/Fly (API + Worker) + Neon.
- **Choose Option A** for a single VPS: Docker Compose for API + Worker (+ optional Web), Neon or Compose Postgres.
- Complete the pre-production checklist before going live.
- Address the gaps above when implementing (standalone for Web Docker, Compose variant for Neon-only).
