# National Intelligence Terminal — Enhancement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Pivot Nepal Intelligence OS from election-mode to always-on operational intelligence — politics, economy, crisis, and geopolitics in one terminal for journalists and analysts.

**Architecture:** Repurpose existing modules (Situation Room → Political Pulse, Parliament → Legislative Intelligence, Crisis → All-Hazards), extend data pipelines (worker sources), add new Global Geopolitics Desk, and activate AI-powered Intel layer. Preserve existing election data as historical context.

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind, Shadcn UI, Hono API, Bun worker, Zod schemas, SSE, GDELT, USGS, NRB.

---

## Progress & implementation status (as of Phase 3 completion)

**Phase 1–2 (partial):** NEPSE in Economy, flood/crisis incidents, Global Geopolitics Desk (GDELT, world articles), circuit breaker for sources, DHM disclaimer / ENABLE_DHM_SCRAPE, Nepal holidays config, worker scheduler.

**Phase 3 — completed:**

- **3.1 Intel briefing:** Sparkles button opens AI briefing modal; Panel button toggles right rail. `POST /v1/intel/brief` (daily | economic | crisis | custom), Anthropic Messages API, circuit breaker. Command palette "Generate Intel Briefing" / "Toggle right panel".
- **Redux & persistence:** Redux store (UI slice + RTK Query `watchlistApi`), `redux-persist` for UI (`briefingPanelOpen`, `intelRailOpen`, `typeFilter`) and watchlist cache (localStorage). Panel state migrated from filter-store to Redux.
- **Watchlist:** API CRUD (`GET/POST/DELETE/PATCH /v1/watchlist`), `POST /v1/ingest/watchlist/:id/triggered`. Worker `runWatchlistCheck()` after each live cycle; optional Telegram alerts (`TELEGRAM_BOT_TOKEN`). Rule types: keyword, constituency, district, price_threshold, crisis_severity. Intel rail Alert Rules section with add/toggle/delete.
- **3.2 Signal types:** `SignalEventTypeSchema` extended with political, security, economic, disaster, diplomatic, health. `inferSignalType(title, body)` in news normalizer (first-match order: disaster → security → political → economic → diplomatic → health → news), with Nepali (Devanagari) keywords. Type badge and type filter row in Signals Feed; Redux `typeFilter` persisted.
- **3.3 Severity escalation:** `inferSeverity(title, body)` (critical / warning / info) in news normalizer; all news events get inferred severity.
- **3.4 Named entity tagging:** `extractEntities(text)` (parties, districts; keyword lists), optional `entities` on `SignalEvent`; news normalizer sets `event.entities` when non-empty.
- **API filters:** `GET /v1/feed` and `GET /v1/feed/social` support optional `?type=` and `?severity=`; compose e.g. `?severity=critical&type=disaster`.
- **Config:** `nepal-holidays.json` updated through April 2027 (NEPSE closed days). API has `zod` dependency; worker duplicate `nepalHolidays` block removed.

**Remaining (Phase 4 and earlier gaps):** Phase 1.1 (SSE backoff, configurable stale threshold), 1.2 (Political Pulse reframe), 1.4 (crisis tabs, map layers), 1.5 (news feeds), 2.1–2.4 as specified; Phase 4 sustainability (freemium, exports, etc.) per separate spec.

---

## Current State Mapping

| Enhancement Plan Module | Current Implementation | Key Files |
|------------------------|------------------------|-----------|
| Situation Room → Political Pulse | `apps/web/src/app/(dashboard)/page.tsx` | NationalSummaryCards, PartyStandings, BattleSeats, CandidateWatch |
| Parliament → Legislative Intelligence | `apps/web/src/app/(dashboard)/parliament/page.tsx` | SeatTiles, MajorityBar, CoalitionBuilder |
| Economy (polish) | `apps/web/src/app/(dashboard)/economy/page.tsx` | NRB FX, metal/crypto assets |
| Crisis → All-Hazards | `apps/web/src/app/(dashboard)/disasters/page.tsx` | USGS earthquakes, crisis keywords |
| Signals Feed | `apps/web/src/components/feed/signals-feed.tsx` | typeConfig: official, ingest, anomaly, note, news, political, security, economic, disaster, diplomatic, health; type + severity filters (Redux); type badge |
| News Room | `apps/web/src/app/(dashboard)/news-room/page.tsx` | SignalsFeed filtered to news + domain types |
| Intel | `apps/web/src/components/layout/intel-rail.tsx`, `intel-panel.tsx`, `command-palette.tsx` | Connection, Anomalies, Watchlist, Alert Rules (RTK Query), Source Health, Notes; Sparkles → briefing modal |
| Worker | `apps/worker/src/index.ts` | runLiveEcn, runLiveNews, runLiveSocial, runLiveCrisis, runLiveFlood, runLiveEconomy, runLiveNepse, runWatchlistCheck |
| Schemas | `packages/shared/src/schemas.ts` | SignalEventTypeSchema, SignalSeveritySchema, SignalEventEntitiesSchema, WatchlistItemSchema, NepseSummarySchema, etc. |

---

## Phase 1 — Stabilize (2–3 weeks)

### Task 1.1: Fix Connection Reliability

**Files:**
- Modify: `apps/web/src/providers/sse-provider.tsx`
- Modify: `apps/web/src/stores/realtime-store.ts`
- Modify: `apps/worker/src/index.ts` (scheduler)

**Step 1:** Add configurable stale threshold to SSE provider

In `sse-provider.tsx`, make the "disconnected" threshold configurable (e.g. env `NEXT_PUBLIC_SSE_STALE_SECONDS` default 90). Ensure heartbeat interval is documented.

**Step 2:** Add retry with exponential backoff for SSE reconnection

In `sse-provider.tsx`, when connection drops, retry with backoff (1s, 2s, 4s, max 30s) instead of single reconnect.

**Step 3:** Replace setInterval with proper cron-style scheduler in worker

In `apps/worker/src/index.ts`, `startLiveScheduler` uses `setTimeout` recursively. Add `cronMinutes` validation and ensure cycle doesn't overlap (await completion before scheduling next).

**Step 4:** Add source health uptime % to Source Health section

In `intel-rail.tsx` SourceHealthSection, compute uptime from `lastUpdate` vs now; show "X% uptime (24h)" if we have historical health data. For now, show "Last success: X ago" per source.

**Step 5:** Commit

```bash
git add apps/web/src/providers/sse-provider.tsx apps/web/src/stores/realtime-store.ts apps/worker/src/index.ts apps/web/src/components/layout/intel-rail.tsx
git commit -m "fix: improve SSE reconnection and worker scheduler reliability"
```

---

### Task 1.2: Repurpose Situation Room → Political Pulse Room

**Files:**
- Modify: `apps/web/src/app/(dashboard)/page.tsx`
- Create: `apps/web/src/components/dashboard/political-pulse-cards.tsx`
- Modify: `apps/web/src/components/layout/nav-rail.tsx`
- Modify: `apps/web/src/components/command-palette.tsx`

**Step 1:** Create Political Pulse placeholder components

Create `political-pulse-cards.tsx` with placeholder cards:
- Cabinet stability index (placeholder: "Coming soon — minister changes")
- Parliamentary session tracker (placeholder: "Coming soon — bills tabled")
- Coalition health widget (reuse existing CoalitionBuilder data if available)

**Step 2:** Reframe Situation Room page

In `page.tsx`:
- Change title from "Situation Room" to "Political Pulse"
- Change subtitle from "National pulse — live election intelligence" to "Nepal's real-time national pulse — politics, economy, crisis"
- Keep ElectionDatasetSelector but move to collapsible "Historical election data" section
- Add Political Pulse cards above or beside existing election widgets
- Make election widgets conditional: show when `selectedDatasetId` has data, else show "No election data — view historical datasets" with link

**Step 3:** Update nav labels

In `nav-rail.tsx` and `command-palette.tsx`, change "Situation Room" to "Political Pulse".

**Step 4:** Commit

```bash
git add apps/web/src/app/\(dashboard\)/page.tsx apps/web/src/components/dashboard/political-pulse-cards.tsx apps/web/src/components/layout/nav-rail.tsx apps/web/src/components/command-palette.tsx
git commit -m "feat: repurpose Situation Room to Political Pulse with placeholder widgets"
```

---

### Task 1.3: Add NEPSE to Economy Module

**Files:**
- Create: `apps/worker/src/sources/nepse.ts`
- Modify: `apps/worker/src/index.ts`
- Modify: `packages/shared/src/schemas.ts`
- Modify: `apps/api/src/store.ts`
- Modify: `apps/api/src/routes.ts`
- Modify: `apps/web/src/app/(dashboard)/economy/page.tsx`

**Step 1:** Add NEPSE schema and API types

In `packages/shared/src/schemas.ts`, add:

```ts
export const NepseSummarySchema = z.object({
  sourceId: z.string(),
  sourceName: z.string(),
  timestamp: z.string().datetime(),
  index: z.number(),
  change: z.number().nullable(),
  changePercent: z.number().nullable(),
  topGainers: z.array(z.object({ symbol: z.string(), change: z.number() })).optional(),
  topLosers: z.array(z.object({ symbol: z.string(), change: z.number() })).optional(),
});
```

**Step 2:** Create NEPSE scraper

Create `apps/worker/src/sources/nepse.ts`. NEPSE publishes daily index at https://www.nepalstock.com/ — use fetch + parse HTML or check for JSON API. If no public API, add placeholder that returns mock/stale data with `sourceName: "NEPSE (placeholder)"`.

**Step 3:** Add NEPSE to API store and routes

In `apps/api/src/store.ts`, add `nepseSummary` state and `updateNepseSummary`. In `routes.ts`, add GET `/economy/nepse` and POST `/ingest/economy/nepse`.

**Step 4:** Add NEPSE to worker cycle

In `apps/worker/src/index.ts`, add `runLiveNepse()` that fetches NEPSE, posts to ingest, and runs every cycle (or every 15 min). Call from `runLiveCycle`.

**Step 5:** Add NEPSE widget to Economy page

In `economy/page.tsx`, add a card for NEPSE index + top gainers/losers when data exists.

**Step 6:** Commit

```bash
git add packages/shared/src/schemas.ts apps/worker/src/sources/nepse.ts apps/worker/src/index.ts apps/api/src/store.ts apps/api/src/routes.ts apps/web/src/app/\(dashboard\)/economy/page.tsx
git commit -m "feat: add NEPSE index and top movers to Economy module"
```

---

### Task 1.4: Expand Crisis Monitor — Flood/Protest Layers

**Files:**
- Modify: `packages/shared/src/schemas.ts`
- Create: `apps/worker/src/sources/flood.ts` (placeholder)
- Modify: `apps/worker/src/index.ts`
- Modify: `apps/web/src/app/(dashboard)/disasters/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/map/page.tsx`

**Step 1:** Add flood/incident schema

In `schemas.ts`, add `CrisisIncidentSchema` (generic: id, type: flood|protest|fire, title, place, lat, lng, timestamp, sourceId, url). Add to CrisisSummary or new `crisisIncidents` array.

**Step 2:** Create flood source placeholder

Create `apps/worker/src/sources/flood.ts` that returns empty array with comment: "DHM/NDRRMA integration pending". Export `fetchFloodAlerts()`.

**Step 3:** Add flood to worker cycle

In worker `index.ts`, add `runLiveFlood()` that calls `fetchFloodAlerts`, posts to new ingest endpoint. In `apps/api/src/store.ts`, add `crisisIncidents` state and `replaceCrisisIncidents`. In `apps/api/src/routes.ts`, add POST `/ingest/crisis/incidents`. In `apps/worker/src/ingest-client.ts`, add `postCrisisIncidents(apiUrl, incidents)`.

**Step 4:** Add crisis type tabs to Disasters page

In `disasters/page.tsx`, add tabs: "Seismic" | "Flood/Landslide" | "Conflict/Protest". Seismic shows current earthquake UI. Flood shows placeholder "DHM integration pending". Conflict reuses existing crisis signals filtered by CRISIS_KEYWORDS.

**Step 5:** Add map layer toggle for Tactical Map

In `map/page.tsx` and `nepal-map.tsx`, add layer toggles: "Election" | "Seismic" | "Incidents". Seismic plots earthquake incidents; Incidents plots flood/protest when data exists.

**Step 6:** Commit

```bash
git add packages/shared/src/schemas.ts apps/worker/src/sources/flood.ts apps/worker/src/index.ts apps/api/src/store.ts apps/api/src/routes.ts apps/web/src/app/\(dashboard\)/disasters/page.tsx apps/web/src/app/\(dashboard\)/map/page.tsx
git commit -m "feat: add flood/incident schema and crisis layer tabs to Crisis Monitor"
```

---

### Task 1.5: Add Nepali News Sources to News Room

**Files:**
- Modify: `apps/worker/config/news-feeds.json`

**Step 1:** Add new RSS feeds

Append to `news-feeds.json`:
- Nagarik: `https://nagariknews.nagariknetwork.com/rss`
- Ratopati: (check for RSS URL)
- Nepali Times: `https://www.nepalitimes.com/feed/`

Verify URLs with curl/fetch. Remove or fix any broken feeds.

**Step 2:** Commit

```bash
git add apps/worker/config/news-feeds.json
git commit -m "feat: add Nagarik, Nepali Times to news feeds"
```

---

## Phase 2 — Expand (4–6 weeks)

### Task 2.1: Launch Global Geopolitics Desk

**Files:**
- Create: `apps/web/src/app/(dashboard)/global-desk/page.tsx`
- Create: `apps/web/src/components/global-desk/south-asia-pulse.tsx`
- Create: `apps/worker/src/sources/gdelt-geopolitics.ts`
- Modify: `apps/web/src/components/layout/nav-rail.tsx`
- Modify: `apps/worker/src/index.ts`

**Step 1:** Create Global Desk page shell

Create `apps/web/src/app/(dashboard)/global-desk/page.tsx` with sections:
- South Asia Pulse (India, China, Pakistan, Bangladesh headlines)
- Nepal diplomatic activity (placeholder)
- World Monitor (top 5 geopolitical stories)

**Step 2:** Extend GDELT for South Asia filter

In `apps/worker/src/sources/gdelt.ts`, add `fetchGdeltSouthAsiaEvents()` that filters by country codes (NP, IN, CN, PK, BD). Reuse existing GDELT client pattern.

**Step 3:** Add Global Desk to worker cycle

Add `runLiveGeopolitics()` that fetches GDELT South Asia + world, posts as signal events with `type: "news"` and `source` including "GDELT South Asia" or similar. Add to `runLiveCycle`.

**Step 4:** Add nav item

In `nav-rail.tsx`, add `{ href: "/global-desk", icon: Globe, label: "Global Desk" }`.

**Step 5:** Commit

```bash
git add apps/web/src/app/\(dashboard\)/global-desk/page.tsx apps/web/src/components/global-desk/south-asia-pulse.tsx apps/worker/src/sources/gdelt.ts apps/worker/src/index.ts apps/web/src/components/layout/nav-rail.tsx
git commit -m "feat: add Global Geopolitics Desk with GDELT South Asia feed"
```

---

### Task 2.2: Bill Tracker in Parliament Module

**Files:**
- Create: `apps/worker/src/sources/parliament.ts`
- Modify: `packages/shared/src/schemas.ts`
- Modify: `apps/api/src/store.ts`
- Modify: `apps/api/src/routes.ts`
- Create: `apps/web/src/components/parliament/bill-tracker.tsx`
- Modify: `apps/web/src/app/(dashboard)/parliament/page.tsx`

**Step 1:** Add Bill schema

```ts
export const BillSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["tabled", "committee", "voted", "enacted", "rejected"]),
  lastUpdate: z.string().datetime(),
  sourceId: z.string(),
  url: z.string().url().optional(),
});
```

**Step 2:** Create parliament scraper

Create `apps/worker/src/sources/parliament.ts`. Parliament of Nepal (parliament.gov.np) may have bill list. Implement scraper or placeholder returning empty array.

**Step 3:** Add bill store and routes

In store: `bills`, `updateBills`. GET `/parliament/bills`, POST `/ingest/parliament/bills`.

**Step 4:** Create BillTracker component

`bill-tracker.tsx`: table of bills with status pipeline (tabled → committee → voted → enacted). Filter by status.

**Step 5:** Add to Parliament page

Add BillTracker below CoalitionBuilder.

**Step 6:** Commit

```bash
git add packages/shared/src/schemas.ts apps/worker/src/sources/parliament.ts apps/api/src/store.ts apps/api/src/routes.ts apps/web/src/components/parliament/bill-tracker.tsx apps/web/src/app/\(dashboard\)/parliament/page.tsx
git commit -m "feat: add Bill Tracker to Parliament module"
```

---

### Task 2.3: Journalist Watchlist with Email Alerts (Placeholder)

**Files:**
- Modify: `apps/web/src/components/layout/intel-rail.tsx`
- Create: `apps/web/src/components/watchlist/watchlist-settings.tsx`

**Step 1:** Extend watchlist to support keywords and sources

In `realtime-store.ts`, add `keywordWatchlist: string[]` and `sourceWatchlist: string[]`. Add actions `addKeywordToWatchlist`, `removeKeywordFromWatchlist`.

**Step 2:** Add Watchlist Settings UI

Create `watchlist-settings.tsx` with:
- Input to add keyword (e.g. "Madhesh")
- Input to add source (e.g. "Setopati")
- List of watched items with remove
- Placeholder: "Email alerts coming in Phase 4"

**Step 3:** Add to Intel Rail

In `intel-rail.tsx`, add WatchlistSettings section or link to settings modal.

**Step 4:** Commit

```bash
git add apps/web/src/stores/realtime-store.ts apps/web/src/components/watchlist/watchlist-settings.tsx apps/web/src/components/layout/intel-rail.tsx
git commit -m "feat: extend watchlist with keywords and sources (email alerts placeholder)"
```

---

### Task 2.4: Mobile-Responsive Layout Audit

**Files:**
- Audit: `apps/web/src/app/(dashboard)/layout.tsx`
- Audit: `apps/web/src/components/layout/app-shell.tsx`
- Audit: key pages (economy, disasters, parliament)

**Step 1:** Run Lighthouse mobile audit

```bash
cd apps/web && bun run build && npx lighthouse http://localhost:3000 --view --preset=perf
```

**Step 2:** Fix critical mobile issues

- Ensure nav-rail mobile bottom nav doesn't overlap content
- Ensure tables (economy rate ladder, bill tracker) scroll horizontally on small screens
- Ensure map controls are touch-friendly

**Step 3:** Commit

```bash
git add [affected files]
git commit -m "fix: improve mobile responsiveness for dashboard pages"
```

---

## Phase 3 — Intelligence Layer (6–10 weeks)

### Task 3.1: Activate Intel Button with AI Briefing Generation

**Files:**
- Create: `apps/api/src/routes/intel.ts`
- Modify: `apps/api/src/index.ts`
- Create: `apps/web/src/components/intel/briefing-modal.tsx`
- Modify: `apps/web/src/components/command-palette.tsx`
- Modify: `apps/web/src/components/layout/top-bar.tsx`

**Step 1:** Add Intel API route

Create `apps/api/src/routes/intel.ts` with POST `/intel/briefing` that:
- Accepts `{ type: "daily" | "anomaly" | "trend", context?: string }`
- Fetches recent feed events, anomalies, economy summary, crisis summary from store
- Calls Anthropic API (or OpenAI) with system prompt: "You are a Nepal intelligence analyst. Summarize the following data into a concise briefing for journalists."
- Returns `{ briefing: string, generatedAt: string }`

**Step 2:** Add BriefingModal component

Create `briefing-modal.tsx`: textarea or div showing generated briefing, "Generate" button, loading state. Fetch from `/v1/intel/briefing`.

**Step 3:** Add "Generate Briefing" to command palette

In `command-palette.tsx`, add Command.Item "Generate Intel Briefing" that opens BriefingModal.

**Step 4:** Add Intel button to top bar

In `top-bar.tsx`, add prominent "Intel" or "Briefing" button that opens BriefingModal.

**Step 5:** Add env for API key

In `apps/api/src/env.ts`, add `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`. Document in README.

**Step 6:** Commit

```bash
git add apps/api/src/routes/intel.ts apps/api/src/index.ts apps/web/src/components/intel/briefing-modal.tsx apps/web/src/components/command-palette.tsx apps/web/src/components/layout/top-bar.tsx
git commit -m "feat: add AI-powered Intel briefing generation"
```

---

### Task 3.2: New Signal Types (POLITICAL, SECURITY, ECONOMIC, DISASTER, DIPLOMATIC, HEALTH)

**Files:**
- Modify: `packages/shared/src/schemas.ts`
- Modify: `apps/web/src/components/feed/signals-feed.tsx`
- Modify: `apps/worker/src/normalizers/news.ts`
- Modify: `apps/worker/src/sources/gdelt.ts`

**Step 1:** Extend SignalEventTypeSchema

In `schemas.ts`, change:

```ts
export const SignalEventTypeSchema = z.enum([
  "official", "ingest", "anomaly", "note", "news",
  "political", "security", "economic", "disaster", "diplomatic", "health",
]);
```

**Step 2:** Update typeConfig in SignalsFeed

In `signals-feed.tsx`, add config for political, security, economic, disaster, diplomatic, health (icons and colors).

**Step 3:** Add keyword-based classifier in news normalizer

In `normalizers/news.ts`, add `inferSignalType(title: string, body: string): SignalEventType` that matches keywords:
- political: cabinet, parliament, ordinance, no-confidence, coalition, minister
- security: protest, police, border, bandh, strike
- economic: NRB, NOC, NEPSE, inflation, remittance, fuel
- disaster: earthquake, flood, landslide, DHM, NDRRMA
- diplomatic: MEA, embassy, treaty, visit
- health: EDCD, outbreak, WHO

Default to "news" if no match.

**Step 4:** Use classifier when posting events

In worker, when normalizing news to events, set `type: inferSignalType(item.title, item.content)`.

**Step 5:** Commit

```bash
git add packages/shared/src/schemas.ts apps/web/src/components/feed/signals-feed.tsx apps/worker/src/normalizers/news.ts
git commit -m "feat: add POLITICAL, SECURITY, ECONOMIC, DISASTER, DIPLOMATIC, HEALTH signal types"
```

---

### Task 3.3: Severity Escalation for Signals

**Files:**
- Modify: `apps/worker/src/normalizers/news.ts`
- Modify: `packages/shared/src/schemas.ts`

**Step 1:** Add severity inference

In normalizer, add `inferSeverity(title, body, type): SignalSeverity`. E.g.:
- Keywords "emergency", "crisis", "alert", magnitude >= 6 → critical
- "protest", "strike", "blockade" → warning
- Default → info

**Step 2:** Set severity when creating events

Ensure all posted events have severity from `inferSeverity`.

**Step 3:** Commit

```bash
git add apps/worker/src/normalizers/news.ts
git commit -m "feat: add severity escalation for signals based on keywords"
```

---

### Task 3.4: Named Entity Tagging (Placeholder)

**Files:**
- Create: `apps/worker/src/normalizers/entities.ts`

**Step 1:** Add entity extraction stub

Create `entities.ts` with `extractEntities(text: string): { people: string[], parties: string[], districts: string[] }`. Use regex or simple keyword list for Nepali parties (NC, UML, Maoist, RSP, etc.) and district names. Return empty arrays if no match.

**Step 2:** Extend SignalEvent schema with optional entities

Add `entities?: { people?: string[], parties?: string[], districts?: string[] }` to SignalEventSchema.

**Step 3:** Call extractEntities in news normalizer

When creating event, add `entities: extractEntities(title + " " + body)`.

**Step 4:** Commit

```bash
git add packages/shared/src/schemas.ts apps/worker/src/normalizers/entities.ts apps/worker/src/normalizers/news.ts
git commit -m "feat: add named entity extraction for signals (parties, districts)"
```

---

## Phase 4 — Sustainability (Future)

- Freemium model: free basic access, paid for alerts + exports + AI briefings
- Partner with journalism schools
- API access tier

(Deferred — no implementation tasks in this plan.)

---

## Execution Handoff

**Plan saved to `docs/plans/2025-03-14-national-intelligence-terminal-enhancement-plan.md`.**

**Phase 3 is complete.** Use the "Progress & implementation status" section above for what is already implemented. Remaining work: Phase 1–2 items not yet done, and Phase 4 (sustainability) per separate Cursor-ready spec.

**For Phase 4:** Follow the Phase 4 prompt/spec when provided; do not invent Phase 4 tasks from this document.
