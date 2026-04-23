# Verify Before Merging (Postgres migration)

Use **local PostgreSQL** for development and verification. You can add Neon (or another hosted Postgres) later for production.

---

## Local PostgreSQL setup (pick one)

**Recommendation:** Use **Option B (Docker)** so you don’t install Postgres on the host, and it matches the stack you run with `docker compose up`. You can also start only the DB from Compose: `docker compose up -d db`, then use `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nepal_intel` for local API/worker.

### Option A — Homebrew (macOS)

```bash
brew install postgresql@16
brew services start postgresql@16

# Create the app database (your macOS user is the DB user by default)
createdb nepal_intel
```

Then in `.env` (or when running commands):

```bash
# If your Mac user has no password for Postgres (common on dev machines):
DATABASE_URL=postgresql://localhost:5432/nepal_intel

# Or with explicit user (replace $USER with your macOS username):
DATABASE_URL=postgresql://$USER@localhost:5432/nepal_intel
```

### Option B — Docker

```bash
docker run --name nepal-pg \
  -e POSTGRES_DB=nepal_intel \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 -d postgres:16
```

Then:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nepal_intel
```

---

## 1. Test migration against local PostgreSQL

From the repo root (or `apps/api`):

```bash
# Set DATABASE_URL for your local setup (see above), then apply migrations
cd apps/api
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nepal_intel bun run db:migrate

# Or if migrations run on API startup (they do), just start the API with DATABASE_URL in .env
bun run start
```

Confirm logs show `[api] migrations complete` and `[migrate] migrations complete` with no errors.

## 2. Store re-exports

Every route import from `./store` resolves to a real function (repo-backed or in-memory fallback).

```bash
grep -r "from.*store" apps/api/src/
# All listed files should run without undefined at runtime.
```

## 3. Worker state roundtrip

- After migration, the `worker_state` table has one row (`id = 'singleton'`) from `INSERT ... ON CONFLICT DO NOTHING` in `0000_blue_zeigeist.sql`.
- With API running and `WORKER_SECRET` set (or unset for local dev), worker startup: `GET /v1/worker-state` loads state.
- After a cycle: `PATCH /v1/worker-state` with `lastNepseRunAt` etc. persists.
- Worker state repo coerces bigint → number so `Date.now() - state.lastNepseRunAt` never becomes `NaN`.

## 4. Reactions persistence across API restart

1. Start API (migrations run, tables created).
2. Like a post on Discover page.
3. Stop the API process completely.
4. Start the API again.
5. Reload Discover page.
6. Confirm like count and liked status are preserved.

---

## Merge sequence

```bash
git checkout feat/national-intelligence-terminal
git merge feat/postgres-migration --no-ff
```

## After merging — production DB (optional)

For local dev, **local PostgreSQL is enough** (Homebrew or Docker above). When you need a hosted DB (e.g. for deployment or a shared staging environment):

**Neon (recommended for this project):**

1. Create account at neon.tech.
2. Create project `nepal-intelligence-os`, copy connection string.
3. Add `DATABASE_URL` to production `.env`.
4. Run `bun run db:migrate` once against that URL.
5. Confirm all 17 tables in Neon’s table viewer.

---

## When deploying to web (production checklist)

This repo supports the common “split deploy” setup:

- **Web** → Vercel (or Docker)
- **API** → Docker/PaaS/VPS (runs migrations on startup)
- **Worker** → Docker/PaaS/VPS/cron (talks to API; no DB access)

See `docs/HOSTING_PLAN.md` for hosting options and service-by-service env.

Before going live, set these in production so worker/admin endpoints aren’t open:

- **WORKER_SECRET** — Set the same value in API and Worker env. Protects GET/PATCH `/v1/worker-state`.
- **ADMIN_SECRET** — Optional; protects admin actions (e.g. circuit breaker reset). Set in both API and Worker if you use them.

### Required env (production)

- **API**
  - `DATABASE_URL` (hosted Postgres like Neon)
  - `WORKER_SECRET` (recommended)
  - `ADMIN_SECRET` (recommended if you use admin reset)
- **Worker**
  - `API_URL` (public API base URL)
  - `WORKER_SECRET` (same as API if set)
  - `ADMIN_SECRET` (same as API if set)
- **Web**
  - `NEXT_PUBLIC_API_URL` (public API base URL)

### Verify secrets are enforced (smoke test)

With API running in the target environment:

```bash
# Without secret: should be rejected when WORKER_SECRET is set
curl -i "$API_URL/v1/worker-state"

# With secret: should succeed
curl -i "$API_URL/v1/worker-state" -H "X-Worker-Secret: $WORKER_SECRET"

# Admin reset (only if ADMIN_SECRET is set)
curl -i -X POST "$API_URL/admin/sources/<source-id>/reset" -H "X-Admin-Secret: $ADMIN_SECRET"
```

If you run API and Worker as separate processes/containers, ensure both have the same `WORKER_SECRET` and `ADMIN_SECRET` values; otherwise the worker won’t be able to load/persist state and admin resets won’t propagate.
