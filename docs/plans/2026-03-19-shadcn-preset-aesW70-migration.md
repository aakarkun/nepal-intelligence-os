# shadcn Preset `aesW70` Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Adopt shadcn preset `aesW70` as the new source-of-truth for global design tokens and shadcn CLI config in `apps/web`, then refactor existing UI styles to use semantic tokens (e.g. `bg-primary`) instead of brand-hardcoded classes (e.g. `bg-nepal-red`).

**Architecture:** Re-run shadcn CLI `init` with `--preset aesW70` inside `apps/web` to establish baseline config and token CSS. Then refactor only the shadcn-layer and app UI variants to reference semantic tokens so future shadcn updates and component additions remain consistent.

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS v3, shadcn/ui + Radix, `class-variance-authority`, `tailwindcss-animate`, Bun.

---

### Task 1: Create isolated workspace baseline

**Files:**
- None

**Step 1: Install dependencies**

Run:
- `bun install`

Expected: lockfile/node_modules updated, no fatal errors.

**Step 2: Verify current `apps/web` builds before changes**

Run:
- `bun run --cwd apps/web build`

Expected: build succeeds (or at minimum, errors are captured before shadcn changes so we can distinguish regressions).

---

### Task 2: Apply preset `aesW70` via shadcn CLI

**Files:**
- Modify/Create (via CLI): `apps/web/components.json` (or repo-root `components.json` if CLI uses root)
- Modify: `apps/web/src/app/globals.css` (token CSS)
- Potentially modify: Tailwind config (keep content globs and app-specific extensions)

**Step 1: Run shadcn init using preset**

Run (from `apps/web`):
- `npx shadcn@latest init --preset aesW70`

Expected:
- `components.json` exists and matches monorepo paths/aliases
- `globals.css` token block updated to preset defaults
- No destructive deletion of existing `src/components/ui/*`

**Step 2: Re-run build**

Run:
- `bun run --cwd apps/web build`

Expected: build succeeds; if not, fix config/paths first (before any UI refactor).

---

### Task 3: Refactor shadcn-layer components to semantic tokens (preset-first)

**Files:**
- Modify: `apps/web/src/components/ui/button.tsx` (remove hard-coded brand colors for core variants)
- Modify: any other `apps/web/src/components/ui/*` using hard-coded colors instead of semantic tokens
- Modify (as needed): app components that rely on hard-coded shadcn variants

**Step 1: Update `Button` variants**

Goal:
- `default` uses `bg-primary text-primary-foreground hover:bg-primary/90`
- `secondary` uses `bg-secondary text-secondary-foreground hover:bg-secondary/80`
- Keep `destructive/outline/ghost/link` aligned with shadcn semantics

**Step 2: Scan other `ui/*` for brand-hardcoded colors**

Replace brand-hardcoded colors with semantic tokens where the component is part of the design system layer.

**Step 3: Re-run build**

Run:
- `bun run --cwd apps/web build`

Expected: build succeeds.

---

### Task 4: Preserve non-UI brand palette for data viz (optional, minimal)

**Files:**
- Modify: `apps/web/tailwind.config.ts` (only if needed for maps/charts)

**Step 1: Decide whether `nepal.*` and `status.*` colors are still used outside UI layer**

If used for map/charts/status indicators, keep them in Tailwind config but avoid using them for core UI components (buttons/cards).

**Step 2: Re-run build**

Run:
- `bun run --cwd apps/web build`

---

### Task 5: Verification + diff review

**Step 1: Lint (if available)**

Run:
- `bun run --cwd apps/web lint`

Expected: no new lint errors introduced.

**Step 2: Summarize change set**

Provide:
- List of files changed by shadcn CLI
- List of UI components refactored
- Any known follow-ups for app-level styling adjustments

