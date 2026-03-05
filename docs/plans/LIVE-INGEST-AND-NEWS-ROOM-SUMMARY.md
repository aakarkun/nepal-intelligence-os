# Live Data Ingestion & News Room — Summary (Readable Format)

This document is a short, readable summary of the design. Full detail is in `2025-03-05-live-ingest-and-news-room-design.md`.

---

## 1. Source attribution

- Add optional fields to national summary and constituency results:
  - `sourceId` (e.g. "ecn")
  - `sourceName` (e.g. "Election Commission of Nepal")
  - `sourceFetchedAt` (when we last got this data)
- Keep the existing `source` field on feed events (already shown as "via {source}").
- In the UI:
  - On summary and constituency views, show: **Source: Election Commission of Nepal · Updated X min ago**
  - Feed keeps showing source per event as it does now.

---

## 2. Data pipeline (unstructured → our API)

- **Step 1 — Crawl:** Fetch raw data from ECN and (optionally) news sites (HTML, RSS).
- **Step 2 — Normalize:** In the worker, parse that raw data and convert it into our existing shapes (summary, snapshot, event) and set source fields.
- **Step 3 — Ingest:** POST to the same API endpoints we already have:
  - `/v1/ingest/summary`
  - `/v1/ingest/snapshot`
  - `/v1/ingest/event`
- The app does not change: it keeps using the same API. Only where the data comes from changes (replay fixtures vs live worker).

---

## 3. Worker layout

**ECN source**

- Fetch ECN website (and fallback URLs if needed).
- Parse HTML/tables into numbers and constituency results.
- Build national summary + constituency snapshots.
- Send to ingest with `sourceId: "ecn"` and `sourceName: "Election Commission of Nepal"`.

**News source (optional)**

- Fetch news/RSS (e.g. Kantipur).
- Turn each item into a feed event with type `news` and set source (e.g. "Kantipur").
- Send to ingest as events.

**Scheduler**

- Run ECN job every X minutes.
- Run news job every Y minutes.
- On success or failure, update source health (the existing `/v1/sources/health`).

---

## 4. News Room (product)

- Reuse the existing **feed** for both official and news events, with clear source labels.
- Add a **News Room** page (e.g. `/news-room`) that shows these updates with:
  - "Source: ECN" or "Source: Kantipur" (or other source name) on each item.
- No new API at first; we can add a separate `/v1/news` later if needed.

---

## 5. ECN in practice

- Use **election.gov.np** (and known report paths).
- If ECN is down or different, use fallbacks (e.g. Kantipur election pages).
- Use a small HTML parser to extract tables/data.
- If parsing or fetch fails: mark that source as stale/error and do **not** clear existing data.

---

## Next steps

1. Confirm you are okay with this design.
2. Say if you want any change (e.g. separate News API from day one, or different sources).
3. After approval: we create a phased implementation plan and then start coding (e.g. schemas + attribution first, then ECN worker, then news + News Room).
