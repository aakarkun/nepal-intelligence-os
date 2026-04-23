"use client";

import { cn } from "@/lib/utils";

export type SourceRailProps = {
  sources: string[];
  selected: string | null;
  onSelect: (source: string | null) => void;
};

export function SourceRail({ sources, selected, onSelect }: SourceRailProps) {
  return (
    <aside className="min-w-0 rounded-xl border border-border bg-card/30 p-3">
      <div className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
        Sources
      </div>
      <div className="mt-2 flex flex-col gap-1 sm:block sm:space-y-1">
        <div className="flex gap-1.5 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] sm:flex-col sm:overflow-visible sm:pb-0">
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={cn(
              "shrink-0 touch-manipulation rounded-md px-2.5 py-1.5 text-left text-sm transition-colors sm:w-full",
              selected == null
                ? "bg-nepal-red/10 text-nepal-red"
                : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
            )}
          >
            All sources
          </button>
          {sources.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSelect(s)}
              className={cn(
                "max-w-[min(100%,14rem)] shrink-0 touch-manipulation truncate rounded-md px-2.5 py-1.5 text-left text-sm transition-colors sm:w-full sm:max-w-none",
                selected === s
                  ? "bg-nepal-red/10 text-nepal-red"
                  : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
              )}
              title={s}
            >
              <span className="block truncate">{s}</span>
            </button>
          ))}
        </div>
        {sources.length === 0 && (
          <div className="rounded-md bg-background/10 p-3 text-sm text-muted-foreground">
            No sources yet.
          </div>
        )}
      </div>
    </aside>
  );
}

