# Live data ingestion and News Room — Design

**Date:** 2025-03-05  
**Status:** Design (pending approval)  
**Goal:** Ingest real election data from ECN and news sites via crawl/scrape, normalize in a worker into our existing API shape, and surface source attribution everywhere so users see where data comes from.

---

## 1. Principles

- **Single API contract** — The app keeps using the same endpoints (`/v1/national-summary`, `/v1/constituencies`, `/v1/feed`, etc.). Only the *origin* of the data changes: replay fixtures vs live worker.
- **Source everywhere** — Every piece of displayed data can show its source (e.g. "Election Commission of Nepal", "Kantipur") and, when useful, last-updated time.
- **Unstructured → structured in the worker** — Crawlers fetch raw HTML/RSS; the worker parses and maps to our Zod schemas and POSTs to ingest. No scraping logic in the API or web app.
- **Both official and news** — ECN (and similar official pages) for numbers; news sites for narrative/headlines. Both feed the same API (summary/snapshot/events) with clear source labels.

---

## 2. Source attribution

**Current state:**  
`SignalEvent` has optional `source`. The feed already shows "via {source}".  
`NationalSummary` and `ConstituencyResult` have no source field; Source Health is global per source, not per record.

**Changes:**

- **Schemas (`packages/shared`)**  
  - Add optional `sourceId?: string` and `sourceName?: string` (and optionally `sourceFetchedAt?: string` ISO datetime) to:
    - `NationalSummarySchema`
    - `ConstituencyResultSchema`
  - Keep `SignalEvent.source` as-is (already used in feed).
- **API responses**  
  - Summary and constituency GET responses include these fields when set. No breaking change (additive).
- **UI**  
  - National summary card(s): show e.g. "Source: Election Commission of Nepal · Updated 5 min ago" when present.
  - Constituency/dossier views: show source and last-updated for that constituency.
  - Feed: keep current "via {source}" for events.
  - Optional: small "Data sources" block (Intel Rail or footer) that lists active sources and last success time (from existing `/v1/sources/health`).

---

## 3. Data pipeline (worker)

Two-stage flow:

```
[ECN / News sites]  →  Crawl/Scrape (raw HTML, RSS, etc.)
                              ↓
                      Raw / unstructured DTOs
                              ↓
                      Normalizer (worker)
                              ↓
                      Our schemas (summary, snapshot, event) + sourceId/sourceName
                              ↓
                      POST /v1/ingest/summary | /ingest/snapshot | /ingest/event
                              ↓
                      API store + SSE broadcast (unchanged)
```

- **Crawler**  
  - Fetches pages from configurable URLs (ECN, Kantipur election pages, etc.).  
  - Respects robots.txt and rate limits (e.g. one run every N minutes).  
  - Output: raw HTML, or parsed “raw” objects (e.g. table rows, headline + link + date). No dependency on our app schemas here.
- **Normalizer**  
  - ECN path: parse ECN HTML/tables (or any JSON if available) → build `NationalSummary` and `ConstituencyResult[]`; set `sourceId: "ecn"`, `sourceName: "Election Commission of Nepal"`, `sourceFetchedAt: new Date().toISOString()`. POST to ingest.  
  - News path: parse RSS or listing pages → create `SignalEvent` with `type: "news"` (or a dedicated type), `source: "Kantipur"` (or sourceId/sourceName if we add to events). POST to `/v1/ingest/event`.  
- **Source health**  
  - After each successful fetch per source, worker updates that source’s health (e.g. lastUpdate, status live/stale). This can be a dedicated ingest endpoint or the worker calling an internal API; either way, `/v1/sources/health` continues to drive the UI.

**Concrete worker layout (recommended):**

- `apps/worker/src/sources/ecn.ts` — fetch ECN URL(s), parse, return raw DTOs or throw.
- `apps/worker/src/sources/news.ts` (optional) — fetch one or more news/RSS URLs, return list of raw news items.
- `apps/worker/src/normalizers/ecn.ts` — raw ECN → `NationalSummary` + `ConstituencyResult[]` + optional `SignalEvent[]` (e.g. "ECN update received").
- `apps/worker/src/normalizers/news.ts` — raw news items → `SignalEvent[]` (type `news` or `note`).
- `apps/worker/src/ingest-client.ts` — shared: POST to API ingest endpoints, set `sourceId`/`sourceName` on payloads, update source health on success/failure.
- `apps/worker/src/scheduler.ts` (or main loop) — run ECN job every X min, news job every Y min; on success, call normalizers then ingest client.

Replay worker stays as-is (fixtures → same ingest endpoints). For live mode, we run the scheduler instead of (or in addition to) replay.

---

## 4. ECN scraping (practical notes)

- **URLs** — ECN: `election.gov.np` (e.g. constituency-wise reports, toptwo, etc.). Some paths may 404; implement fallbacks and log failures. Alternative: Kantipur’s election result pages (e.g. generalelection2074.ekantipur.com) as a secondary source for structure.
- **Parsing** — Prefer table-based or known HTML structure; use a small HTML parser (e.g. linkedom, node-html-parser, or Bun’s built-in) to extract rows/cells. If ECN exposes JSON in the future, add a JSON path and keep HTML as fallback.
- **Idempotency** — Same as today: last write wins per constituency/summary. Worker sends full snapshot/summary; API replaces. No duplicate events if we dedupe by (source + external id) or timestamp window when creating events.
- **Errors** — On parse/network failure: do not clear existing data; update source health to `stale` or `error` and optionally emit an anomaly/event so the UI can show "ECN temporarily unavailable".

---

## 5. News Room (product)

- **Meaning**  
  - A dedicated place in the app where users see “what’s happening” with clear attribution: headlines and short updates from ECN (official) and from news sites (e.g. Kantipur), with source and time.
- **Data**  
  - Reuse the **feed** (`/v1/feed`): events with `type: "news"` (or a new type) and `source` set. Optionally add a filter `?type=news` if we want a news-only view.
  - Alternatively, add a separate `/v1/news` endpoint and a `NewsItem` schema (title, body, url, sourceId, sourceName, timestamp, optional district/constituency). Trade-off: one feed vs two. **Recommendation:** start with one feed + event type `news` and optional `url` on `SignalEvent`; add `/v1/news` later if the product needs a distinct news model.
- **UI**  
  - **News Room page** (e.g. `/news-room`): timeline or list of events filtered by type (official + news), with source badges and "Source: ECN" / "Source: Kantipur" on each item. Reuse feed components with a filter.
  - **Attribution on rest of app** — Summary and constituency views show "Source: …" as in section 2.

---

## 6. Summary of deliverables

| Item | Description |
|------|-------------|
| **Schemas** | Add optional `sourceId`, `sourceName`, `sourceFetchedAt` to NationalSummary and ConstituencyResult; optional `url` on SignalEvent if we use it for news. |
| **API** | Ingest accepts and stores new fields; GET responses return them. Optional: extend Source Health usage. |
| **Worker: ECN** | Crawl ECN (and fallback) → normalize → POST summary + snapshots + optional events with ECN source. |
| **Worker: News** | Crawl news/RSS → normalize to events (type news) → POST to ingest. |
| **Worker: Scheduler** | Run ECN and news jobs on intervals; update source health. |
| **UI: Attribution** | Show source + last-updated on summary card, constituency/dossier, and in feed (already partial). |
| **UI: News Room** | New page (or feed view) for news/official updates with source badges. |

---

## 7. Out of scope for this design

- Authentication / API keys for ingest (could be added later).
- Persistence: design assumes current in-memory store; if we add DB later, source fields are already on the models.
- Detailed ECN page structure: to be implemented during development (URLs and selectors may need adjustment as the site changes).

---

**Next step:** After your approval, an implementation plan (phased tasks) will be written and we can start with schema + attribution, then ECN crawler + normalizer, then news and News Room UI.
