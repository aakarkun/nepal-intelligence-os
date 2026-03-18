"use client";

import { cn } from "@/lib/utils";

export type SourceRailProps = {
  sources: string[];
  selected: string | null;
  onSelect: (source: string | null) => void;
};

export function SourceRail({ sources, selected, onSelect }: SourceRailProps) {
  return (
    <aside className="rounded-xl border border-border bg-card/30 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Sources
      </div>
      <div className="mt-2 space-y-1">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            "w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors",
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
              "w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors",
              selected === s
                ? "bg-nepal-red/10 text-nepal-red"
                : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
            )}
            title={s}
          >
            <span className="block truncate">{s}</span>
          </button>
        ))}
        {sources.length === 0 && (
          <div className="rounded-md bg-background/10 p-3 text-sm text-muted-foreground">
            No sources yet.
          </div>
        )}
      </div>
    </aside>
  );
}

