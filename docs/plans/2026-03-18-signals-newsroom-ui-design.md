## Signals Feed vs News Room — UI Differentiation Design (Ops Console + Editorial Desk)

Date: 2026-03-18

### Goals

- Make **Signals Feed** and **News Room** feel like different modules with distinct jobs.
- Keep the underlying data model intact (same `SignalEvent` stream + filtering), but present it differently.
- Improve “what needs attention now?” workflow without requiring backend changes first.

### Non-goals

- No new ingestion sources or NLP classification changes in this phase.
- No authentication/roles, no team workflows.
- No long-term storage of ops actions in DB (initially local-only; can be persisted later).

---

## Product Definitions

### Signals Feed (Ops / Triage Console)

**Purpose:** Real-time situational awareness and triage: anomalies, ingest alerts, operational notes, and high-attention news.

**Default question it answers:** “What needs attention right now?”

### News Room (Editorial Desk)

**Purpose:** Calm browsing of curated news by source and topic, with clear attribution and readability.

**Default question it answers:** “What happened today, and what are the sources saying?”

---

## Naming (UI Language)

Signals Feed uses:

- **Attention**: items needing review (default)
- **Reviewed**: items marked as handled
- **Pinned**: items manually pinned for ongoing monitoring

Actions:

- **Mark Reviewed**
- **Pin / Unpin**

Views (tabs):

- **Attention (default)** · **All** · **Pinned**

---

## Information Architecture

### Signals Feed IA

- `/feed`
- Two-pane layout:
  - Left: stream
  - Right: detail panel (selection persists)

### News Room IA

- `/news-room`
- Three-column “editorial desk” layout:
  - Left: sources + topic filters
  - Center: headlines list
  - Right: briefing stack / highlights (optional)

---

## Signals Feed — UX Spec (Ops Console)

### Layout

- **Left (stream):** ~60%
- **Right (detail panel):** ~40% with sticky header and scrollable body

### Stream header (sticky)

- **Mode toggle**
  - **Live**: periodic refresh; if user is at top, auto-stays at top; if user scrolls, pause auto-scroll
  - **Review**: no auto-scroll; uses “new items” indicator instead
- **Tabs**
  - **Attention**: excludes Reviewed items
  - **All**: everything
  - **Pinned**: pinned items only
- **Filters**
  - Severity: `Critical / Warning / Info`
  - Type: `Anomaly / Official / Ingest / Note / News / Economic / Security / ...`
  - Search: title/body/source (client-side)
- **Sort**
  - Default: newest
  - Optional: severity-first (secondary)

### Stream item card (visual identity)

- Strong console feel: compact, monospace timestamp, “status chips”.
- Left vertical stripe indicates severity:
  - Critical: red
  - Warning: amber
  - Info: slate/neutral
- Content:
  - Title (1–2 lines)
  - Metadata row:
    - type chip
    - source label (if present)
    - time ago
    - optional location chips: district/constituency if present
- Quick actions (hover / trailing):
  - Mark Reviewed
  - Pin
  - Copy link

### “New items” indicator

- When not at top (or in Review mode), show a pill at top of stream:
  - “12 new signals”
  - Click scrolls to top and resets counter.

### Detail panel (right)

Header:

- Title + type + severity
- Timestamp + source (link if URL exists)
- Actions: Mark Reviewed, Pin, Open in News Room (for news-like items)

Body:

- Full content (title + body)
- Entities (if present)
- Links (source URL, related URLs if present)

Context:

- If constituency/district exists: quick links to `/constituencies/:id` or `/map`
- “Recent from same source” (last 5 items) for quick correlation

### State model (initial)

Local-only persistence (client):

- reviewedIds: Set<string>
- pinnedIds: Set<string>
- selectedSignalId: string | null
- mode: `live | review`

Storage:

- `localStorage` key namespace: `signalsConsole:*`

Future extension:

- Persist these to DB via `snapshots` or a dedicated table when multi-user workflows are needed.

---

## News Room — UX Spec (Editorial Desk)

### Layout

- Left rail:
  - Sources list with health badges (live/stale/error)
  - Topic chips (politics/economy/security/disaster/etc.)
  - Time range: last 24h / 7d (optional)
- Center:
  - Headline list with more whitespace
  - Strong attribution (source + published time)
  - Optional excerpt (body preview)
  - Optional “cluster” by source
- Right:
  - “Today’s Brief” (top headlines summary)
  - “Trending Topics” (keyword aggregation from titles)

### Visual identity

- Calmer typography, fewer severity signals.
- Focus on readability, source trust signals, and exploration.

---

## Shared Components vs Split Components

### Keep shared

- Data fetching hooks for `/v1/feed` + filters
- Signal event “type” chips and iconography
- Source attribution component

### Split

- Page shell/layout
- Feed item card styles
- Right-side panel behavior (Signals only)
- Editorial source browsing UI (News Room only)

---

## Accessibility & Interaction Notes

- Keyboard navigation in Signals stream:
  - Up/Down to move selection
  - Enter to open details
  - `r` to Mark Reviewed, `p` to Pin (optional)
- Ensure action buttons have aria-labels and don’t rely on color alone.
- Detail panel should be reachable and scrollable with keyboard.

---

## Success Criteria

- A user can explain the difference in 5 seconds:
  - **Signals = what needs attention**
  - **News Room = browse news**
- Signals feels “live” and actionable (Attention tab, Mark Reviewed, Pin).
- News Room feels calmer, source-first, and editorial.

