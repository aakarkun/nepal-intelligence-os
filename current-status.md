# Nepal Intelligence OS — Current Status

**Last updated:** 2026-03-07

## Overview

Nepal Intelligence OS (YETI-OS) is a Bun monorepo for election monitoring and national intelligence. The election module now runs against a live Ekantipur-backed dataset with preserved archives, and the first typed Crisis and Economy source families are in place.

## Repo layout

```
apps/
  web/       Next.js 14 — dashboard, map, constituencies, feed, News Room, Economy, Crisis
  api/       Hono on Bun — REST + SSE, ingest endpoints, election datasets, crisis/economy APIs
  worker/    Replay (fixtures) + Live (Ekantipur + news + crisis + economy ingest)

packages/
  shared/    Zod schemas, types (election, signals, source health, crisis, economy)

docs/
  plans/     Design and implementation plans (see below)
```

## What’s done

- **Election live ingest:**
  - Ekantipur Scrapling crawl now posts live national summary and constituency snapshots into the API.
  - Archived election data is preserved as a separate dataset instead of being overwritten by live ingest.
  - Dataset selector is wired through the Situation Room, map, parliament, constituencies, and dossier views.
  - Map province and district clicks open a right-side geography drawer with linked constituency data.
- **Signals and source hygiene:**
  - News Room and Signals Feed are separated more clearly.
  - Reddit and GDELT remain disabled by default to avoid IP/rate-limit issues.
  - Worker live scheduling now persists the last completed cycle so restarts do not immediately scrape again.
- **Crisis module:**
  - Typed USGS earthquake ingestion now powers `/disasters`.
  - API exposes crisis summary and earthquake incident endpoints.
- **Economy module:**
  - Typed NRB forex ingestion now powers `/economy`.
  - Gold, Silver, and Bitcoin quotes are ingested separately on a slower cadence.
  - Economy page now renders direct-source FX and asset data instead of only keyword-matched headlines.
- **UI platform updates:**
  - Top-bar module pills now navigate to the actual module routes.
  - Global card/border styling has been softened to reduce harsh white outlines.

## What’s next (from plans)

- **Crisis expansion:** Add BIPAD and other Nepal-specific official incident sources alongside USGS.
- **Economy expansion:** Add NEPSE or NRB macro/bulletin connectors so Economy is no longer FX-first.
- **Operational hardening:** Persist live datasets and non-election modules beyond in-memory storage.

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

```bash
bun install
bun run dev:api      # API on 3001, seeds from fixtures if empty
bun run dev:worker   # Worker; live mode keeps Reddit/GDELT disabled unless explicitly enabled
bun run dev:web      # Next.js on 3000
```

Live worker (single run):  
`MODE=live API_URL=http://localhost:3001 bun run --filter worker start`  

Live worker on a schedule:  
`MODE=live CRON_ECN_MINUTES=30 API_URL=http://localhost:3001 bun run --filter worker start`

Enable Reddit/GDELT only when needed:

`ENABLE_REDDIT=true ENABLE_GDELT=true MODE=live bun run dev:worker`

Scrapling runs:

`bun run scrape:ecn`

`bun run scrape:news`
