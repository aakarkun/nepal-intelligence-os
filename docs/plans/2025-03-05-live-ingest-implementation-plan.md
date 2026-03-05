# Live Ingest & News Room — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ingest real election data from ECN (and optionally news sites) via crawl/scrape, normalize in a worker into the existing API shape, and surface source attribution across the app plus a News Room page.

**Architecture:** Unstructured data (HTML/RSS) is fetched by worker crawlers, parsed into our Zod schemas in normalizers, then POSTed to existing ingest endpoints. Optional source fields on summary/constituency are stored and returned; UI shows "Source: …" and a News Room page shows feed events with source badges. Replay worker unchanged.

**Tech Stack:** Bun, Hono, Next.js 14, existing shared Zod schemas; worker uses fetch + HTML parser (e.g. linkedom or node-html-parser) for ECN; RSS parser for news.

**Design reference:** `docs/plans/2025-03-05-live-ingest-and-news-room-design.md`, `docs/plans/LIVE-INGEST-AND-NEWS-ROOM-SUMMARY.md`

---

## Phase 1 — Source attribution (schemas, API, UI)

### Task 1: Add source fields to shared schemas

**Files:**
- Modify: `packages/shared/src/schemas.ts`

**Step 1:** Add optional source attribution to `NationalSummarySchema` (after `partyResults`):

```ts
sourceId: z.string().optional(),
sourceName: z.string().optional(),
sourceFetchedAt: z.string().datetime().optional(),
```

**Step 2:** Add the same three optional fields to `ConstituencyResultSchema` (after `candidates` array).

**Step 3:** Add optional `url` to `SignalEventSchema` (after `source`): `url: z.string().url().optional()` — for news links.

**Step 4:** Ensure exported types are still inferred (no change needed if using `z.infer`).

**Step 5:** From repo root run: `bun run build` (or build in apps that use shared). Expected: no type errors.

**Step 6:** Commit with message: `feat(shared): add source attribution and event url to schemas`

---

### Task 2: API store and ingest accept source fields

**Files:**
- Modify: `apps/api/src/store.ts` (no change needed — store already holds full objects)
- Modify: `apps/api/src/routes.ts` (no change needed — ingest uses schema parse, so new optional fields pass through)

**Step 1:** Confirm ingest routes use `NationalSummarySchema` and `ConstituencyResultSchema` for parsing; optional fields are already allowed. No code change if schemas were updated in Task 1.

**Step 2:** Optionally add a dedicated endpoint for source health updates if worker will POST health: e.g. `POST /v1/ingest/source-health` that accepts `SourceHealthSchema` and calls `updateSourceHealth`. Design doc said "worker updates source health" — can be same as now (worker could call a small internal endpoint or we add one). For minimal change, skip new endpoint and have worker set health in memory only when it runs in-process; for multi-process, add `POST /v1/ingest/source-health`. **Decision:** Add `POST /v1/ingest/source-health` so worker can update health after each run.

**Step 3:** In `apps/api/src/routes.ts`, add:

```ts
api.post("/ingest/source-health", async (c) => {
  const body = await c.req.json();
  const parsed = SourceHealthSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid payload", issues: parsed.error.issues }, 400);
  }
  updateSourceHealth(parsed.data);
  return c.json({ ok: true });
});
```

Import `SourceHealthSchema` from `@repo/shared`. Ensure `updateSourceHealth` is imported from store.

**Step 4:** Restart API and POST a sample payload to `http://localhost:3001/v1/ingest/source-health`. Expected: 200 and health visible on GET `/v1/sources/health`.

**Step 5:** Commit: `feat(api): add POST /v1/ingest/source-health for worker`

---

### Task 3: UI — Source attribution on national summary

**Files:**
- Modify: `apps/web/src/components/dashboard/national-summary-cards.tsx`

**Step 1:** Below the four StatCards (or in a small row above/below), when `data.sourceName` or `data.sourceId` is present, render a line:

- "Source: {data.sourceName ?? data.sourceId} · Updated {timeAgo(data.sourceFetchedAt ?? data.timestamp)} ago"

Use existing `timeAgo` from `@/lib/utils`. Style as small muted text (e.g. `text-xs text-muted-foreground`).

**Step 2:** If neither source field is set, show nothing (backward compatible with replay data).

**Step 3:** Verify on Situation Room page: with replay data (no source), no new line; if you manually add source to a summary in store, line appears.

**Step 4:** Commit: `feat(web): show source attribution on national summary cards`

---

### Task 4: UI — Source attribution on constituency dossier

**Files:**
- Modify: `apps/web/src/app/(dashboard)/constituencies/[id]/page.tsx` or the dossier component that shows a single constituency

**Step 1:** Locate where constituency result is displayed (likely `ConstituencyDossier` or similar). Add a line showing source when present: "Source: {sourceName ?? sourceId} · Updated {timeAgo(sourceFetchedAt ?? lastUpdate)} ago". Use same styling as Task 3.

**Step 2:** If no source fields, show nothing.

**Step 3:** Commit: `feat(web): show source attribution on constituency dossier`

---

## Phase 2 — Worker: ECN crawler and normalizer

### Task 5: Worker dependency for HTML parsing

**Files:**
- Modify: `apps/worker/package.json`

**Step 1:** Add dependency: `"linkedom": "latest"` (or `"node-html-parser": "latest"`). Run `bun install` from repo root.

**Step 2:** Commit: `chore(worker): add linkedom for HTML parsing`

---

### Task 6: ECN crawler module (fetch + raw parse)

**Files:**
- Create: `apps/worker/src/sources/ecn.ts`

**Step 1:** Implement a function `fetchEcnRaw(options: { baseUrl?: string }): Promise<{ html: string; url: string }>`. Default `baseUrl` to `https://election.gov.np` or a known results path (e.g. English constituency report URL from design). Use `fetch`, get response text, return `{ html, url }`. Catch errors and rethrow with context.

**Step 2:** Add a second function `parseEcnRaw(html: string): { summaries?: unknown[]; constituencies?: unknown[] }` that uses linkedom to parse HTML and extract placeholder structure (e.g. find tables, return empty arrays for now). Goal: establish the interface; real selectors can be refined when ECN page structure is known. Export both functions.

**Step 3:** From `apps/worker` run `bun run build` or `bun src/index.ts` to ensure no import errors (index may still run replay only). Commit: `feat(worker): add ECN source fetch and stub parser`

---

### Task 7: ECN normalizer (raw → our schemas)

**Files:**
- Create: `apps/worker/src/normalizers/ecn.ts`

**Step 1:** Implement `normalizeEcnToSummary(raw: unknown, sourceId: string, sourceName: string): NationalSummary | null`. Accept raw object(s) from crawler, map to `NationalSummary` shape (totalSeats, totalConstituencies, countedConstituencies, totalVotesCast, timestamp, partyResults). Set `sourceId`, `sourceName`, `sourceFetchedAt: new Date().toISOString()`. Return null if mapping fails. Use strict types from `@repo/shared`.

**Step 2:** Implement `normalizeEcnToConstituencies(raw: unknown[], sourceId: string, sourceName: string): ConstituencyResult[]`. Map each raw item to `ConstituencyResult` (constituencyId, constituencyName, districtName, provinceId, status, totalVotes, lastUpdate, candidates). Attach source fields. Filter out invalid entries.

**Step 3:** When ECN page structure is unknown, normalizer can return empty array or mock one record for integration test. Commit: `feat(worker): ECN normalizer to NationalSummary and ConstituencyResult`

---

### Task 8: Ingest client in worker

**Files:**
- Create: `apps/worker/src/ingest-client.ts`

**Step 1:** Implement `postSummary(apiUrl: string, summary: NationalSummary): Promise<boolean>`, `postSnapshot(apiUrl: string, snapshot: ConstituencyResult): Promise<boolean>`, `postEvent(apiUrl: string, event: SignalEvent): Promise<boolean>`, `postSourceHealth(apiUrl: string, health: SourceHealth): Promise<boolean>`. Each does `fetch(apiUrl + endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })` and returns `res.ok`. Endpoints: `/v1/ingest/summary`, `/v1/ingest/snapshot`, `/v1/ingest/event`, `/v1/ingest/source-health`.

**Step 2:** Export a single function `runEcnIngest(apiUrl: string, ecnData: { summary: NationalSummary | null; constituencies: ConstituencyResult[] }): Promise<void>` that: if summary, POST summary; for each constituency, POST snapshot; then POST source health for `ecn` with status `live`, lastUpdate now, errorRate 0. Use `SourceHealth` shape from shared.

**Step 3:** Commit: `feat(worker): ingest client for summary, snapshot, event, source-health`

---

### Task 9: Wire ECN job into worker entrypoint

**Files:**
- Modify: `apps/worker/src/index.ts`
- Create (optional): `apps/worker/src/scheduler.ts`

**Step 1:** Add env `MODE=replay|live` (default `replay`). If `MODE=replay`, keep current behavior (run replay only). If `MODE=live`, run a single ECN cycle: fetch ECN raw → parse → normalize → runEcnIngest(apiUrl, …). Use `API_URL` from env (same as replay). On parse/network error, POST source health with status `stale` or `error` and do not clear data.

**Step 2:** Optional: add a loop with `setInterval` to run ECN job every N minutes (e.g. `CRON_ECN_MINUTES=5`). If not in this task, document "run worker periodically via cron or process manager".

**Step 3:** Test: set `MODE=live`, ensure API is up, run worker; expect ingest calls (may be empty if ECN parser returns empty). Commit: `feat(worker): live mode ECN fetch and ingest`

---

## Phase 3 — News source and events (optional)

### Task 10: News crawler and normalizer

**Files:**
- Create: `apps/worker/src/sources/news.ts`
- Create: `apps/worker/src/normalizers/news.ts`

**Step 1:** In `sources/news.ts`, implement `fetchNewsRaw(options: { feedUrl?: string }): Promise<{ items: { title: string; link?: string; pubDate?: string; description?: string }[] }>`. Use a simple RSS/feed URL (e.g. a Kantipur or generic Nepal news RSS). Parse with regex or add dependency `rss-parser` if needed. Return array of items.

**Step 2:** In `normalizers/news.ts`, implement `normalizeNewsToEvents(items: { title: string; link?: string; pubDate?: string; description?: string }[], sourceId: string, sourceName: string): SignalEvent[]`. Map each item to `SignalEvent`: id (generate, e.g. `news-${hash(title+link)}`), type `"note"` or add `"news"` to SignalEventType in shared and use that, severity `"info"`, title, body (description or title), timestamp (from pubDate or now), source, url. Append to shared schema if new type.

**Step 3:** If adding `"news"` type: in `packages/shared/src/schemas.ts`, add `"news"` to `SignalEventTypeSchema`. Then in `apps/web` feed UI, add badge for "news" type. Commit: `feat(worker): news source and normalizer to SignalEvent`

---

### Task 11: Wire news job and source health

**Files:**
- Modify: `apps/worker/src/index.ts` (or scheduler)

**Step 1:** When `MODE=live`, after ECN job (or in parallel), run news fetch → normalize → post each event via ingest client; then POST source health for news source (e.g. `kantipur`).

**Step 2:** Commit: `feat(worker): run news ingest in live mode and update source health`

---

## Phase 4 — News Room page and nav

### Task 12: News Room page and nav entry

**Files:**
- Create: `apps/web/src/app/(dashboard)/news-room/page.tsx`
- Modify: `apps/web/src/components/layout/nav-rail.tsx`
- Modify: `apps/web/src/components/command-palette.tsx` (add News Room entry if applicable)

**Step 1:** Create `apps/web/src/app/(dashboard)/news-room/page.tsx`. Page title "News Room", subtitle "Election updates and news with source attribution". Render `SignalsFeed` or a dedicated feed view that shows events with type filter (e.g. official, news, note) and highlights source on each item (reuse feed component with optional filter prop or query param `?type=news,official,note`).

**Step 2:** In `nav-rail.tsx`, add `{ href: "/news-room", icon: Newspaper (from lucide-react), label: "News Room" }` to `NAV_ITEMS` (e.g. after Signals Feed).

**Step 3:** In command palette, add item for "News Room" linking to `/news-room`.

**Step 4:** Verify navigation and that feed shows sources. Commit: `feat(web): News Room page and nav entry`

---

### Task 13: Feed type "news" and source badge emphasis on News Room

**Files:**
- Modify: `apps/web/src/components/feed/signals-feed.tsx` (or create a wrapper for News Room)
- Modify: `packages/shared/src/schemas.ts` (if not done in Task 10)

**Step 1:** Ensure `SignalEvent` type `"news"` is in schema and that feed UI shows a distinct badge for it (e.g. "News"). Ensure each event displays source prominently ("Source: Kantipur" or "via Kantipur").

**Step 2:** On News Room page, either pass default filter to show official + news + note, or add a query param and read it in the feed component to set initial type filter. Commit: `feat(web): news event type and source emphasis on News Room`

---

## Completion checklist

- [ ] Phase 1: Source fields in schemas; ingest source-health; attribution on summary and constituency.
- [ ] Phase 2: ECN crawler (fetch + parse stub); normalizer; ingest client; worker live mode.
- [ ] Phase 3: News crawler + normalizer; news events; source health for news.
- [ ] Phase 4: News Room page; nav and command palette; feed type "news" and source badges.

---

## Execution handoff

Plan complete and saved to `docs/plans/2025-03-05-live-ingest-implementation-plan.md`.

**Two execution options:**

1. **Subagent-driven (this session)** — I dispatch a fresh subagent per task (or batch of small tasks), review between steps, and iterate quickly.
2. **Parallel session (separate)** — You open a new session with the executing-plans skill and run through the plan with checkpoint reviews.

Which approach do you want?
