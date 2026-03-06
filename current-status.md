# Nepal Intelligence OS — Current Status

**Last updated:** 2025-03-05

## Overview

Nepal Intelligence OS (YETI-OS) is a Bun monorepo for election monitoring and national intelligence. Phase 1 (election launch) is in place; live data ingestion and News Room are implemented with source attribution.

## Repo layout

```
apps/
  web/       Next.js 14 — dashboard, map, constituencies, feed, News Room
  api/       Hono on Bun — REST + SSE, ingest endpoints, seed from fixtures
  worker/    Replay (fixtures) + Live (ECN + news crawl → ingest)

packages/
  shared/    Zod schemas, types (election, signals, source health)

docs/
  plans/     Design and implementation plans (see below)
```

## What’s done

- **Phase 1 (original):** Monorepo, shared schemas, API (REST + SSE), replay worker, Next.js UI, layout shell, Situation Room, tactical map, constituencies table & dossier, parliament view, Signals Feed, ⌘K palette, War Room stub, economy/disasters stubs, Docker Compose.
- **Live ingest & News Room:**
  - Source attribution on national summary and constituency (optional `sourceId`, `sourceName`, `sourceFetchedAt` in schemas and UI).
  - API: `POST /v1/ingest/source-health` for worker.
  - Worker: ECN crawler (fetch + parse stub), ECN normalizer → summary/snapshots, news RSS source → events (type `news`), ingest client, `MODE=live` with optional `CRON_ECN_MINUTES`.
  - Web: News Room page (`/news-room`), nav + command palette, feed “news” type and “Read more” link for `event.url`.
- **API:** Seed from worker fixtures on startup when store is empty.
- **Web:** Dev/build/start use `bunx next` so `bun run dev:web` works.
- **News, Reddit & X without IP blocks:** GDELT Reddit (no direct Reddit requests), Nitter RSS for X (no API key), Reddit backoff + configurable delay. See `docs/DATA-SOURCES-AVOIDING-BLOCKS.md` and `.env.example` (REDDIT_*, NITTER_BASE_URL).

## What’s next (from plans)

- **ECN parsing:** Map real ECN page structure (election.gov.np) in `apps/worker/src/sources/ecn.ts` and `normalizers/ecn.ts` so live mode produces real summary/snapshots.
- **News Room vs Signals Feed:** Optionally default News Room to “official + news + note” only (see `docs/plans/`).
- **Ongoing:** Run worker in live mode (e.g. cron or process manager) and tune RSS/news sources.

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
bun run dev:worker   # Replay worker (default); use MODE=live for ECN + news
bun run dev:web      # Next.js on 3000
```

Live worker (single run):  
`MODE=live API_URL=http://localhost:3001 bun run --filter worker start`  

Live worker on a schedule:  
`MODE=live CRON_ECN_MINUTES=5 API_URL=http://localhost:3001 bun run --filter worker start`
