/**
 * Political Pulse — `/political-pulse`
 *
 * This route is intentionally minimal while the layout and components are rebuilt.
 * Add sections below (or new files under `components/`) one at a time; keep this file
 * as the composition layer only.
 *
 * Styling: use shadcn/ui primitives and CSS variables from `globals.css`
 * (`background`, `foreground`, `card`, `muted-foreground`, `border`, etc.).
 */

import { Card, CardContent } from "@/components/ui/card";

export default function PoliticalPulsePage() {
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-6 text-[#e5e5e5]">
      {/*
        -------------------------------------------------------------------------
        Page shell
        -------------------------------------------------------------------------
        The dashboard `AppShell` already applies `bg-background` and padding.
        Keep inner width constrained with `max-w-*` if the new design calls for it.
      */}

      {/*
        -------------------------------------------------------------------------
        Page header (optional — replace with tabs, breadcrumbs, or actions later)
        -------------------------------------------------------------------------
      */}
      {/*
        -------------------------------------------------------------------------
        Primary content region
        -------------------------------------------------------------------------
        Mount the first real component inside `CardContent` (or replace `Card`
        with a different layout primitive). Delete `min-h` when content defines height.
      */}
      <Card>
        <CardContent className="min-h-[min(50vh,28rem)] pt-6">
          {/* First component goes here */}
        </CardContent>
      </Card>

      {/*
        -------------------------------------------------------------------------
        Secondary column / rail (optional — only if the new layout needs it)
        -------------------------------------------------------------------------
      */}
    </div>
  );
}
