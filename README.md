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

# In another terminal — start the replay worker
bun run dev:worker

# In another terminal — start the web UI (port 3000)
bun run dev:web
```

## Docker Deployment

```bash
cp .env.example .env
# Edit .env with production values

docker compose up --build
```

Services:
- **web** — Next.js on port 3000
- **api** — Hono API on port 3001
- **worker** — Replay/ingestion worker
- **redis** — Cache layer (port 6379)
- **caddy** — Reverse proxy with auto-HTTPS (ports 80/443)

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
| **Database / Redis** | | |
| `DATABASE_URL` | PostgreSQL connection string (Phase 2) | No |
| `REDIS_URL` | Redis connection string (optional; for SSE fan-out) | No |
| **Worker** | | |
| `REPLAY_SPEED` | Fixture replay speed multiplier (default: 5) | No |
| `MODE` | `replay` or `live` (default: live) | No |
| `CRON_ECN_MINUTES` | How often to poll ECN + news in live mode (minutes; 0 = run once and exit) | No |
| `ECN_BASE_URL` | ECN results base URL (default: https://election.gov.np/results) | No |
| `NEWS_FEEDS` | Optional; semicolon-separated Name&#124;URL pairs to extend/override news feeds | No |
| `DEBUG_NEWS_TIMES` | Set to `true` to log feed item timestamps (debug) | No |

## Routes

| Route | Page | Status |
|-------|------|--------|
| `/` | Situation Room | Active |
| `/map` | Nepal Tactical Map | Active |
| `/constituencies` | Constituencies Table | Active |
| `/constituencies/[id]` | Constituency Dossier | Active |
| `/parliament` | Parliament Control | Active |
| `/feed` | Signals Feed | Active |
| `/economy` | Economic Pulse | Phase 2 stub |
| `/disasters` | Crisis Monitor | Phase 2 stub |
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

## Docs & plans

- **[current-status.md](current-status.md)** — Project status, what’s done, what’s next, run commands.
- **Plans** (design and implementation):
  - [Live ingest & News Room — summary](docs/plans/LIVE-INGEST-AND-NEWS-ROOM-SUMMARY.md)
  - [Live ingest & News Room — design](docs/plans/2025-03-05-live-ingest-and-news-room-design.md)
  - [Live ingest — implementation plan](docs/plans/2025-03-05-live-ingest-implementation-plan.md)

## License

Private — All rights reserved.
