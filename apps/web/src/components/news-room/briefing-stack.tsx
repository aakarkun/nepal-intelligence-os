"use client";

import type { SignalEvent } from "@repo/shared";
import { timeAgo } from "@/lib/utils";

function tokenizeTitle(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 4 && t.length <= 18);
}

export type BriefingStackProps = {
  events: SignalEvent[];
};

export function BriefingStack({ events }: BriefingStackProps) {
  const top = events.slice(0, 5);

  const freq = new Map<string, number>();
  for (const e of events.slice(0, 60)) {
    for (const t of tokenizeTitle(e.title)) {
      freq.set(t, (freq.get(t) ?? 0) + 1);
    }
  }
  const trending = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <aside className="space-y-4">
      <div className="rounded-xl border border-border bg-card/30 p-4">
        <div className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
          Today&apos;s Brief
        </div>
        <div className="mt-3 space-y-2">
          {top.map((e) => (
            <div key={e.id} className="rounded-md bg-background/10 p-2">
              <div className="text-sm font-medium leading-snug line-clamp-2">
                {e.title}
              </div>
              <div className="mt-1 text-[13px] text-muted-foreground">
                {e.source ?? "Unknown"} · {timeAgo(e.timestamp)}
              </div>
            </div>
          ))}
          {top.length === 0 && (
            <div className="text-sm text-muted-foreground">Waiting for headlines…</div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/30 p-4">
        <div className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
          Trending keywords
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {trending.map(([term, count]) => (
            <span
              key={term}
              className="rounded-md border border-border/40 bg-background/10 px-2 py-1 text-xs text-muted-foreground"
              title={`${count} mentions`}
            >
              {term}
            </span>
          ))}
          {trending.length === 0 && (
            <div className="text-sm text-muted-foreground">No trend data yet.</div>
          )}
        </div>
      </div>
    </aside>
  );
}

