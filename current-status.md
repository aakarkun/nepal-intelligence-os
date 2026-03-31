# Nepal Intelligence OS — Current Status

**Last updated:** 2026-03-30

## Overview

Nepal Intelligence OS (YETI-OS) is a Bun monorepo for election monitoring and national intelligence. The API uses **PostgreSQL** (Drizzle ORM); election data (national summaries, constituency results) is **persisted in the DB** and hydrated on startup. Election scrape is **off by default** (finalized); worker runs news, economy, crisis, political pulse, minister bio enrichment, and other ingest on a schedule.

## Repo layout

```
apps/
  web/       Next.js 14 — dashboard, map, constituencies, parliament, feed, News Room, Economy, Crisis, Political Pulse, Discover-style shells
  api/       Hono on Bun — REST + SSE, ingest endpoints, election datasets, crisis/economy APIs, HoR / political-pulse payloads
  worker/    Replay (fixtures) + Live (Ekantipur + news + crisis + economy + political jobs + minister bio)

packages/
  shared/    Zod schemas, types (election, signals, HoR 2082 helpers, seat/PR utilities, source health, crisis, economy)

docs/
  plans/     Design and implementation plans (see below)
```

## What’s done

- **PostgreSQL + Drizzle:** API uses Postgres for reactions, signal events, worker state, source health, anomalies, crisis/flood/cabinet/parliament, **election data**, **MP biography fields**, and **extended constituency payload**. Migrations run on API startup.
- **Election data in DB:** Ingest `/ingest/summary` and `/ingest/snapshot` persist to `national_summaries` and `constituency_results`. API hydrates from DB on startup; seed from fixtures when DB is empty. **Unified HoR (Election 2026)** labeling and helpers live in `packages/shared` with API store alignment.
- **HoR 2082 seed:** `seed-hor-2082` and related routes support loading proportional and FPTP-oriented election breakdowns for parliament and dashboards.
- **Election scrape finalized:** Worker does not run ECN/election scrape by default (`SCRAPE_ELECTION` off). Set `SCRAPE_ELECTION=true` only when re-scraping is needed.
- **NEPSE UX:** No "0.00 (-) Market closed" spam; worker does not post fallback summary/signals; Market Pulse and Economy show NEPSE only when real index data exists.
- **Election live ingest (when enabled):**
  - Ekantipur Scrapling crawl can post live national summary and constituency snapshots into the API.
  - Archived election data is preserved as a separate dataset instead of being overwritten by live ingest.
  - Dataset selector is wired through the Situation Room, map, parliament, constituencies, and dossier views.
  - Map province and district clicks open a right-side geography drawer with linked constituency data.
- **Signals and source hygiene:**
  - News Room and Signals Feed are separated more clearly.
  - Reddit and GDELT remain disabled by default to avoid IP/rate-limit issues.
  - Worker live scheduling persists the last completed cycle so restarts do not immediately scrape again.
- **Signals ops console:** Feed queue UI aligns with Discover shell patterns (rail headers, tab strip, pill filters); cards use border-forward selection and simplified severity chrome.
- **Crisis module:**
  - Typed USGS earthquake ingestion powers `/disasters`.
  - API exposes crisis summary and earthquake incident endpoints.
- **Economy module:**
  - Typed NRB forex ingestion powers `/economy`.
  - Gold, Silver, and Bitcoin quotes are ingested separately on a slower cadence.
  - Economy page renders direct-source FX and asset data instead of only keyword-matched headlines.
- **Parliament & constituencies:** Seat map modes, proportional HoR breakdown, party detail panels, and refreshed constituency table/dossier; dynamic page titles via **shell header** overrides on nested routes.
- **Web shell:** **Collapsible app sidebar** (replaces legacy nav rail), **route-derived title and description** in the top bar (breadcrumbs where appropriate), shared **Discover-style** surfaces on disasters/world/economy/political-pulse pages.
- **Dashboard:** Home includes hero and **minister profile** blocks with API-backed bio hooks where configured.
- **Worker — political:** Minister Wikipedia/bio pipeline (`political-minister-bio`) extends political jobs and ingest client for new payloads.
- **Env and Docker:** One root `.env.example` with [API], [Worker], [Web]; per-app `.env.example`; Docker Compose runs db + api + worker (web runs locally). See `docs/DOCKER.md`, `docs/HOSTING_PLAN.md`.

## What’s next (from plans)

- **Crisis expansion:** Add BIPAD and other Nepal-specific official incident sources alongside USGS.
- **Economy expansion:** Further NRB macro/bulletin connectors if needed.
- **Deploy:** Set `WORKER_SECRET` (and optionally `ADMIN_SECRET`) when deploying to production (see `docs/VERIFY_BEFORE_MERGE.md` and `docs/HOSTING_PLAN.md`).

## Plans (in docs)

All design and implementation plans live under **`docs/plans/`**:

| Document | Description |
|----------|-------------|
| [LIVE-INGEST-AND-NEWS-ROOM-SUMMARY.md](docs/plans/LIVE-INGEST-AND-NEWS-ROOM-SUMMARY.md) | Short readable summary of live ingest and News Room. |
| [2025-03-05-live-ingest-and-news-room-design.md](docs/plans/2025-03-05-live-ingest-and-news-room-design.md) | Full design: attribution, pipeline, worker layout, ECN, News Room. |
| [2025-03-05-live-ingest-implementation-plan.md](docs/plans/2025-03-05-live-ingest-implementation-plan.md) | Phased implementation plan (tasks 1–13). |
| [2025-03-06-scrapling-live-election-news-signals.md](docs/plans/2025-03-06-scrapling-live-election-news-signals.md) | Scrapling for ECN, news, signals. |
| [DATA-SOURCES-AVOIDING-BLOCKS.md](docs/DATA-SOURCES-AVOIDING-BLOCKS.md) | News, Reddit & X — getting data without IP blocks. |

## How to run

**Option A — Docker (db + api + worker):**

```bash
docker compose up --build
# Web: NEXT_PUBLIC_API_URL=http://localhost:3001 bun run dev:web
```

**Option B — Local (Postgres required for API):**

```bash
# Start Postgres (Docker or Homebrew), create DB nepal_intel, set DATABASE_URL in apps/api/.env or root .env
bun install
bun run dev:api      # API on 3001; migrations + hydrate from DB; seeds from fixtures if DB empty
bun run dev:worker   # Worker; live mode; election scrape off by default
bun run dev:web      # Next.js on 3000
```

Election scrape (only when needed):  
`SCRAPE_ELECTION=true bun run dev:worker`

Reddit/GDELT (when needed):  
`ENABLE_REDDIT=true ENABLE_GDELT=true bun run dev:worker`

Scrapling (standalone):  
`bun run scrape:ecn` · `bun run scrape:news`
