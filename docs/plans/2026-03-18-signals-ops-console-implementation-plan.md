# Signals Ops Console + News Room Desk Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace `/feed` with an ops/triage console UI and redesign `/news-room` into a distinct editorial desk UI.

**Architecture:** Keep existing API + `fetchFeed` plumbing. Implement a new Signals console component that uses client-side state (localStorage) for **Attention/Reviewed/Pinned** and a two-pane layout. Implement a separate News Room page shell that reuses the feed data but presents it source/topic-first.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind, TanStack Query, existing shared schemas.

---

### Task 1: Add console state utilities (localStorage)

**Files:**
- Create: `apps/web/src/components/feed/ops-console/state.ts`

**Step 1: Write small state helpers**

- Implement:
  - `loadReviewedIds()` / `saveReviewedIds()`
  - `loadPinnedIds()` / `savePinnedIds()`
  - `loadMode()` / `saveMode()` where mode ∈ `live | review`

**Step 2: Manual verify**

- In browser devtools, confirm localStorage keys exist after toggles.

---

### Task 2: Build Signals Ops Console UI (two-pane)

**Files:**
- Create: `apps/web/src/components/feed/ops-console/severity.ts`
- Create: `apps/web/src/components/feed/ops-console/signal-card.tsx`
- Create: `apps/web/src/components/feed/ops-console/signal-detail.tsx`
- Create: `apps/web/src/components/feed/ops-console/signals-console.tsx`
- Modify: `apps/web/src/app/(dashboard)/feed/page.tsx`

**Step 1: Implement severity mapping**

- Add helpers:
  - severity stripe color for `critical | warning | info`
  - type badge styles

**Step 2: Implement `SignalCard`**

- Render compact console-style item with:
  - severity stripe
  - title, source, time-ago
  - quick actions: `Mark Reviewed`, `Pin`, `Copy link`

**Step 3: Implement `SignalDetail`**

- Right panel showing:
  - title + metadata + actions
  - body
  - “Recent from same source” list (client-side filtered from currently loaded events)

**Step 4: Implement `SignalsConsole`**

- Fetch feed via `fetchFeed(limit, offset, type?, severity?)` (reuse current)
- Provide:
  - Tabs: `Attention` (default) / `All` / `Pinned`
  - Mode toggle: `Live` / `Review`
  - Search box (client-side)
  - Type filter (client-side multi-select can be simplified to single-select)
- Behavior:
  - `Attention` excludes reviewed ids
  - `Pinned` shows pinned ids
  - selection persists within session; deep-link by `?id=...` selects that item if present
  - “New signals” pill appears when in Review mode and new events arrive

**Step 5: Wire `/feed` page**

- Replace `<SignalsFeed />` with `<SignalsConsole allowedTypes={...} />`

**Step 6: Manual verify**

- Open `/feed`
- Confirm:
  - clicking a card updates detail panel
  - Mark Reviewed moves item out of Attention
  - Pin shows item under Pinned
  - refresh page preserves Reviewed/Pinned

---

### Task 3: Redesign News Room into Editorial Desk

**Files:**
- Create: `apps/web/src/components/news-room/source-rail.tsx`
- Create: `apps/web/src/components/news-room/headlines-list.tsx`
- Create: `apps/web/src/components/news-room/briefing-stack.tsx`
- Modify: `apps/web/src/app/(dashboard)/news-room/page.tsx`

**Step 1: Build Source Rail**

- Show sources derived from current events (unique by `source`)
- Allow clicking a source to filter center list

**Step 2: Build Headlines List**

- Center column, calmer typography:
  - headline
  - source + time ago
  - optional excerpt (body)

**Step 3: Briefing Stack**

- Right column:
  - “Top headlines” (first 5)
  - “Trending keywords” (simple token frequency from titles)

**Step 4: Wire News Room page**

- Fetch feed once (same query)
- Apply allowedTypes for News Room (news-like types only)
- Present the three-column layout

**Step 5: Manual verify**

- Open `/news-room`
- Confirm it looks distinct from `/feed` and source filtering works.

---

### Task 4: Styling + polish pass

**Files:**
- Modify: `apps/web/src/components/feed/ops-console/*` (as needed)
- Modify: `apps/web/src/app/(dashboard)/feed/page.tsx` (copy tweaks)
- Modify: `apps/web/src/app/(dashboard)/news-room/page.tsx` (copy tweaks)

**Steps**

- Ensure consistent labels:
  - `Attention`, `Reviewed`, `Pinned`
  - action `Mark Reviewed`
- Improve spacing, hover states, keyboard focus rings.

---

### Task 5: Verification (manual + lint)

**Step 1: Lint web**

Run:

```bash
bun run --cwd apps/web lint
```

**Step 2: Dev run**

Run:

```bash
bun run dev:web
```

Expected:
- `/feed` renders ops console
- `/news-room` renders editorial desk

