"use client";

import type { SignalEvent } from "@repo/shared";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

export type HeadlinesListProps = {
  events: SignalEvent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function HeadlinesList({ events, selectedId, onSelect }: HeadlinesListProps) {
  return (
    <div className="rounded-xl border border-border bg-card/30">
      <div className="border-b border-border p-4">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold">Headlines</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse by source and topic. For triage, use Signals Feed.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">{events.length} items</div>
        </div>
      </div>

      <div className="divide-y divide-border">
        {events.slice(0, 80).map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => onSelect(e.id)}
            className={cn(
              "w-full px-4 py-3 text-left transition-colors hover:bg-muted/30",
              selectedId === e.id && "bg-nepal-red/5"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold leading-snug line-clamp-2">
                  {e.title}
                </div>
                {e.body && (
                  <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {e.body}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
                  <span>{e.source ?? "Unknown source"}</span>
                  <span className="font-sans tabular-nums">{timeAgo(e.timestamp)}</span>
                  <span className="rounded border border-border/40 bg-background/10 px-1.5 py-0.5 text-[12px] uppercase tracking-wide">
                    {e.type}
                  </span>
                </div>
              </div>
              <span className="shrink-0 text-[12px] font-sans tabular-nums text-muted-foreground">
                {new Date(e.timestamp).toISOString().slice(11, 16)}
              </span>
            </div>
          </button>
        ))}

        {events.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground">
            No headlines match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}

