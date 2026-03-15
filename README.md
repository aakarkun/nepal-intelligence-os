# Nepal Intelligence OS

A permanent national intelligence platform for Nepal. Election monitoring is the launch module — the platform persists as a living signal layer over Nepal's politics, economy, geography, and society.

**Codename:** YETI-OS

## Architecture

```
apps/
  web/          Next.js 14 App Router — intelligence dashboard UI
  api/          Hono on Bun.serve() — REST + SSE API (port 3001)
  worker/       Ingestion workers + replay mode on Bun

packages/
  shared/       Zod schemas, types, constants shared across all apps

data/           GeoJSON, constituency codes, district mappings
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, Tailwind CSS, shadcn/ui |
| Maps | Mapbox GL JS |
| Data | TanStack Query, TanStack Table, Recharts |
| State | Zustand |
| API | Hono.js on Bun.serve() |
| Realtime | Server-Sent Events (SSE) |
| Types | Zod + TypeScript |
| Runtime | Bun v1.x (API + Worker), Node.js (Next.js) |
| Deploy | Docker Compose, Caddy, Hetzner |

## Quick Start

```bash
# Install Bun if not already installed
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install

# Copy environment variables
cp .env.example .env
# Edit .env with your Mapbox token and other keys

# Start the API server (port 3001)
bun run dev:api

# In another terminal — start the worker
bun run dev:worker

# In another terminal — start the web UI (port 3000)
bun run dev:web
```

Live mode now disables Reddit and GDELT by default to avoid rate limits and IP blocks. Re-enable them only when needed:

```bash
ENABLE_GDELT=true ENABLE_REDDIT=true bun run dev:worker
```

**Election scrape:** Off by default (`SCRAPE_ELECTION` is not set). Election data is treated as finalized and stored in the API DB. Set `SCRAPE_ELECTION=true` in the worker env only when you need to re-scrape. When enabled, the worker uses the Scrapling Ekantipur crawl; conservative defaults: `CRON_ECN_MINUTES=30`, `SCRAPLING_REQUEST_DELAY_MS=1000`, `LIVE_STATE_PATH=.live-worker-state.json`.

Scrapling tools are available under `apps/scrapling/`:

```bash
cd apps/scrapling
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
scrapling install
cd ../..

bun run scrape:ecn
bun run scrape:news
```

## Docker

Run API, Worker, and Postgres with Docker. Web runs locally for dev (hot reload).

```bash
cp .env.example .env
# Optional: set WORKER_SECRET, ADMIN_SECRET, ANTHROPIC_API_KEY in .env

docker compose up --build
```

Services:
- **db** — PostgreSQL 16 (port 5432); API is the only service that connects
- **api** — Hono API on port 3001; runs migrations on startup
- **worker** — Live ingest (news, economy, crisis, etc.); no election scrape by default (see `SCRAPE_ELECTION`)

Run the web app locally and point it at the API:  
`NEXT_PUBLIC_API_URL=http://localhost:3001 bun run dev:web`

See **[docs/DOCKER.md](docs/DOCKER.md)** for env and options.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| **API** | | |
| `API_PORT` | API server port (default: 3001) | No |
| `API_URL` | API base URL (used by worker; default: http://localhost:3001) | No |
| **Frontend** | | |
| `NEXT_PUBLIC_API_URL` | API URL for frontend (default: http://localhost:3001) | No |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox GL JS access token | Yes |
| `NEXT_PUBLIC_ENABLE_WAR_ROOM` | Enable War Room feature (default: false) | No |
| **LiveKit (War Room)** | | |
| `LIVEKIT_URL` | LiveKit server URL (e.g. wss://your-project.livekit.cloud) | No |
| `LIVEKIT_API_KEY` | LiveKit API key | No |
| `LIVEKIT_API_SECRET` | LiveKit API secret | No |
| **Database** | | |
| `DATABASE_URL` | PostgreSQL connection string. **Required for API.** Only the API connects; worker and web do not. | Yes (API) |
| **Worker** | | |
| `REPLAY_SPEED` | Fixture replay speed multiplier (default: 5) | No |
| `MODE` | `replay` or `live` (default: live) | No |
| `ENABLE_GDELT` | Enable GDELT news/social enrichment (default: false) | No |
| `ENABLE_REDDIT` | Enable direct Reddit ingestion (default: false) | No |
| `SCRAPE_ELECTION` | Set to `true` to run election scrape (default: off — election finalized). Worker-only. | No |
| `ENABLE_SCRAPLING_ECN` | When scrape runs: use Scrapling/Ekantipur (true) or legacy ECN parser (false) | No |
| `CRON_ECN_MINUTES` | How often to run news/social/economy polling in live mode (default: 30; `0` = run once and exit) | No |
| `WORKER_SECRET` | Shared secret for worker ↔ API (`/v1/worker-state`). Set same value in API and worker when deploying. | No |
| `ECN_BASE_URL` | Ekantipur election base URL for the Scrapling crawl | No |
| `LIVE_STATE_PATH` | File used to persist the last completed live worker cycle between restarts | No |
| `SCRAPLING_REQUEST_DELAY_MS` | Delay between constituency page requests in the crawler (default: 1000) | No |
| `MARKET_ASSET_MINUTES` | How often to refresh Gold/Silver/BTC quotes in live mode (default: 360) | No |
| `NEWS_FEEDS` | Optional; semicolon-separated Name&#124;URL pairs to extend/override news feeds | No |
| `DEBUG_NEWS_TIMES` | Set to `true` to log feed item timestamps (debug) | No |
| **Admin / circuit breaker** | | |
| `ADMIN_SECRET` | Secret for circuit breaker reset (POST `/admin/sources/:id/reset`). **Required in both API and worker env** when they run as separate processes or containers — the API validates it on reset requests; the worker uses it to poll and consume pending resets. | No (required for admin reset) |
| `ENABLE_DHM_SCRAPE` | Set to `true` to enable DHM flood bulletin scrape (default: false). Station-level data may require DHM data access approval. | No |

## Deployment: API and worker

When the API and worker run in separate processes or containers (e.g. Docker Compose, k8s), set **`ADMIN_SECRET` in both environments**. The API uses it to validate `POST /admin/sources/:id/reset`; the worker uses the same value in `X-Admin-Secret` when polling for pending resets. If only one side has it, circuit breaker resets from the dashboard will not take effect.

## Routes

| Route | Page | Status |
|-------|------|--------|
| `/` | Situation Room | Active |
| `/map` | Nepal Tactical Map | Active |
| `/constituencies` | Constituencies Table | Active |
| `/constituencies/[id]` | Constituency Dossier | Active |
| `/parliament` | Parliament Control | Active |
| `/feed` | Signals Feed | Active |
| `/economy` | Economic Pulse | Active |
| `/disasters` | Crisis Monitor | Active |
| `/war-room` | War Room | Scaffold |

## Replay Mode

The worker service includes a replay engine that simulates election night by streaming fixture data through the API:

```bash
# 5x speed (default)
REPLAY_SPEED=5 bun run dev:worker

# Real-time
REPLAY_SPEED=1 bun run dev:worker

# 10x speed
REPLAY_SPEED=10 bun run dev:worker
```

The replay cursor is persisted in SQLite, so restarting picks up where it left off. Delete `apps/worker/.replay-cursor.sqlite` to restart from the beginning.

## Scrapling

The repo now includes a Python Scrapling bridge in `apps/scrapling/` for Ekantipur election ingestion and news scraping. The Ekantipur crawler posts live election summaries and constituency snapshots into the API, and the worker uses it by default in live mode.

## Docs & plans

- **[current-status.md](current-status.md)** — Project status, what’s done, what’s next, run commands.
- **Plans** (design and implementation):
  - [Live ingest & News Room — summary](docs/plans/LIVE-INGEST-AND-NEWS-ROOM-SUMMARY.md)
  - [Live ingest & News Room — design](docs/plans/2025-03-05-live-ingest-and-news-room-design.md)
  - [Live ingest — implementation plan](docs/plans/2025-03-05-live-ingest-implementation-plan.md)

## License

Private — All rights reserved.
