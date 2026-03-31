# Plan: Live Nepal Election Data, News & Signal Feed with Scrapling

**Date:** 2025-03-06  
**Goal:** Use [Scrapling](https://scrapling.readthedocs.io/en/latest/) to get latest Nepal election data (ECN), news, and signal feed — live-updating the existing worker and API.

---

## Current State

| Component | What exists | Gap |
|-----------|-------------|-----|
| **ECN** | `apps/worker/src/sources/ecn.ts`: `fetch()` + linkedom parse | ECN (election.gov.np) returns **403** for plain fetch; parser is a stub (table cells → raw rows). No real structure mapping. |
| **News** | RSS via `rss-parser` + `news-feeds.json` | Works for RSS; no JS-heavy or bot-blocking sites; no full-article scraping. |
| **Signals** | GDELT, Twitter, Reddit → `POST /v1/ingest/event` | No Scrapling-based signal sources (e.g. official bulletins, forums). |
| **API** | `POST /v1/ingest/summary`, `snapshot`, `event`, `source-health` | Ready; no change. |
| **Worker** | Bun, cron or one-shot, runs ECN + news + social | Needs a way to run/trigger Scrapling (Python). |

Scrapling gives: **StealthyFetcher** (bypass Cloudflare/403), **adaptive selectors** (survive site changes), **spider framework** (crawl + concurrency), optional **MCP** for AI-assisted extraction.

---

## Architecture Overview

- Keep **API** and **Worker** (Bun/TS) as-is: API stays the single source of truth; worker remains the scheduler and can still run RSS/GDELT/Twitter/Reddit.
- Add a **Scrapling layer** (Python) that:
  1. **ECN:** Fetches election.gov.np with StealthyFetcher, parses summary + constituencies, POSTs to existing ingest API.
  2. **News (optional):** Scrapes Nepali news sites that need JS or block bots; POSTs events to `/v1/ingest/event` (type `news`).
  3. **Signals (optional):** Scrapes additional signal sources (e.g. official pages, forums); POSTs as `event` (type `note` or `official`).

Two integration options:

- **Option A — Subprocess:** Worker (Bun) runs a Python Scrapling script on a schedule (e.g. same cron as today). Script outputs JSON to stdout or POSTs directly to API.
- **Option B — Standalone service:** Separate long-running Python process (Scrapling spider/scheduler) that runs on an interval and POSTs to API; no change to worker code.

Recommendation: **Option A** for minimal ops (single process manager); **Option B** if you want to scale Scrapling independently (e.g. many sites, different schedules).

---

## Phase 1: ECN Live Election Data (Scrapling)

### 1.1 Add Scrapling to the repo

- Create a Python env under the monorepo, e.g. `apps/scrapling/` or `scripts/scrapling/`.
- Use Python 3.10+ and `pip install "scrapling[fetchers]"` (then `scrapling install` for browsers).
- No need to change Node/Bun deps.

Suggested layout:

```
apps/scrapling/
  pyproject.toml or requirements.txt
  .env.example          # API_URL, ECN_BASE_URL, optional headless/stealth
  src/
    __init__.py
    config.py           # env (API_URL, ECN_BASE_URL)
    ecn_spider.py       # Scrapling fetch + parse ECN
    ingest.py           # POST to API (summary, snapshots, source-health)
  run_ecn.py            # CLI: fetch ECN → parse → ingest
  run_news.py          # (Phase 2) optional news crawler
  run_signals.py       # (Phase 3) optional signal crawler
```

### 1.2 ECN fetch with StealthyFetcher

- In `ecn_spider.py`, use `StealthyFetcher` (with `adaptive=True` if needed) to load the ECN results URL (e.g. `https://election.gov.np` or the actual results path; confirm from ECN when available).
- Use Scrapling’s page API (e.g. `page.css(...)`) to extract:
  - **National summary:** total seats, counted constituencies, total votes, party-wise seats/votes.
  - **Per-constituency:** constituency id/name, district, province, status, candidates (party, votes).
- Map to the same shapes the API expects: `NationalSummary`, `ConstituencyResult` (see `packages/shared/src/schemas.ts`). Emit `sourceId: "ecn"`, `sourceName: "Election Commission of Nepal"`, `sourceFetchedAt: now`.

### 1.3 ECN parsing (selectors)

- Inspect the live ECN results page (when accessible) and define selectors for:
  - Summary block (totals, party table).
  - Constituency list or table (rows → constituency + candidates).
- Use Scrapling’s **adaptive** mode so that if ECN changes layout, selectors can be re-learned; document the current selectors in `ecn_spider.py` or a small `ecn_selectors.md`.

### 1.4 Ingest from Python

- In `ingest.py`, implement:
  - `post_summary(api_url, summary)` → `POST /v1/ingest/summary`
  - `post_snapshot(api_url, snapshot)` → `POST /v1/ingest/snapshot`
  - `post_source_health(api_url, health)` → `POST /v1/ingest/source-health`
- Payloads must match the shared Zod schemas (same as worker’s ingest-client). Use a small JSON schema or copy field names from `ConstituencyResultSchema` / `NationalSummarySchema` / `SourceHealthSchema`.

### 1.5 Worker integration (live ECN)

- **Option A:** In worker’s live loop (e.g. `runLiveEcn`), instead of calling `fetchEcnRaw` + `parseEcnRaw`, spawn the Python script and read JSON from stdout, then run existing normalizers + `runEcnIngest`. Or: Python script POSTs directly and worker only runs ECN when you want a fallback (e.g. non-Python env).
- **Option B:** Don’t call ECN from worker; run `python run_ecn.py` from cron (or a process manager) every N minutes. Worker continues to run news/social and source-health; ECN updates come only from Scrapling.

Suggested: **Option B** — run Scrapling ECN on the same schedule as current `CRON_ECN_MINUTES` (e.g. cron job or a small scheduler script that runs both worker and `run_ecn.py`).

### 1.6 Source health

- After each ECN run, POST source-health (e.g. `sourceId: "ecn"`, `status: "live"` or `"error"`, `lastUpdate`, `updateCount`). The API and UI already support this.

---

## Phase 2: News Feed (Scrapling-enhanced)

### 2.1 Keep existing RSS

- Leave current worker news pipeline as-is (RSS + GDELT) for feeds that work.

### 2.2 Add Scrapling for difficult news sources

- Identify Nepali news sites that are JS-heavy or return 403 for simple fetch (e.g. some homepage “latest” or article lists).
- In `run_news.py`, use Scrapling (e.g. `StealthyFetcher` or `DynamicFetcher`) to:
  - Open the site, extract article links and titles (and optionally snippet/publish date).
  - Optionally open each article and extract body with adaptive selectors.
- Normalize to the same `SignalEvent` shape (type `news`, title, body, url, timestamp, source).
- POST each to `POST /v1/ingest/event`.

### 2.3 Config

- Reuse or extend `apps/worker/config/news-feeds.json`: add a flag or a separate list for “scrape with Scrapling” (e.g. `"scrape": true` + URL). Or a dedicated `apps/scrapling/config/news_sites.json` with URLs and selectors.

---

## Phase 3: Signal Feed (Scrapling)

### 3.1 Keep existing signals

- GDELT, Twitter, Reddit in worker unchanged.

### 3.2 Optional Scrapling signal sources

- Add `run_signals.py` (or a spider in `ecn_spider.py`) to scrape:
  - Official ECN “notices” or “bulletins” page → events type `official`.
  - Other government or NGO pages that publish election-related updates → type `note` or `official`.
- Parse to `SignalEvent` (id, type, severity, title, body, timestamp, url, source) and POST to `POST /v1/ingest/event`.

---

## Phase 4: Worker and API (Live updates)

### 4.1 API

- No schema or route changes. Ensure CORS and network allow the Scrapling host to call the API (same as worker).

### 4.2 Worker

- If **Option A:** Add a step in the live cron that runs `python apps/scrapling/run_ecn.py` (or `bun run scrape:ecn` that wraps it) and optionally processes stdout. Optionally run `run_news.py` / `run_signals.py` in the same cycle or on different intervals.
- If **Option B:** Document that Scrapling runs separately (cron/systemd) and POSTs to the same API; worker only runs RSS + social + GDELT. Same `CRON_ECN_MINUTES` (or a separate env) can drive the Scrapling cron.

### 4.3 Live updating UX

- Already in place: API broadcasts via SSE on `ingest/summary`, `ingest/snapshot`, `ingest/event`. Web app uses SSE and feed components. Once Scrapling POSTs to ingest, the dashboard and signals feed will update live.

---

## Implementation Checklist

- [ ] **1. Scrapling app**  
  - [ ] Create `apps/scrapling/` (or `scripts/scrapling/`) with Python 3.10+, `scrapling[fetchers]`, `scrapling install`.  
  - [ ] Add `config.py` (API_URL, ECN_BASE_URL), `ingest.py` (POST summary, snapshot, source-health).

- [ ] **2. ECN**  
  - [ ] Implement ECN fetch with `StealthyFetcher` in `ecn_spider.py`.  
  - [ ] Map ECN page structure to `NationalSummary` and `ConstituencyResult`; document selectors.  
  - [ ] Implement `run_ecn.py`: fetch → parse → POST summary + snapshots + source-health.  
  - [ ] Test against live ECN (or a saved HTML fixture if 403 persists in CI).  
  - [ ] Add cron or worker-trigger to run `run_ecn.py` every N minutes (e.g. same as `CRON_ECN_MINUTES`).

- [ ] **3. News (optional)**  
  - [ ] Add `run_news.py` for Scrapling-based news sites; POST events to `/v1/ingest/event` (type `news`).  
  - [ ] Config for URLs and optional selectors; schedule if needed.

- [ ] **4. Signals (optional)**  
  - [ ] Add `run_signals.py` for official/bulletin pages; POST events (type `official` / `note`).  
  - [ ] Schedule if needed.

- [ ] **5. Docs and runbook**  
  - [ ] Update `current-status.md` and README: how to run Scrapling (env, install, cron).  
  - [ ] Document ECN selector strategy and how to adapt when the site changes.

---

## Summary

| Data | Source | How |
|------|--------|-----|
| **Election (ECN)** | election.gov.np | Scrapling StealthyFetcher → parse → POST summary + snapshots + source-health. |
| **News** | Existing RSS + optional Scrapling | Keep RSS in worker; add Scrapling for JS/bot-blocking sites → POST events. |
| **Signals** | GDELT/Twitter/Reddit + optional Scrapling | Keep current worker; add Scrapling for official/bulletin pages → POST events. |
| **Worker** | Bun | Scheduler; optionally runs Scrapling scripts (Option A) or only RSS/social (Option B). |
| **API** | Unchanged | Ingest endpoints + SSE; Scrapling and worker both POST to same API for live updates. |

This keeps your existing worker and API, and uses Scrapling where it adds value: bypassing 403 on ECN, adaptive parsing for changing pages, and optional news/signal scraping for difficult sources.
