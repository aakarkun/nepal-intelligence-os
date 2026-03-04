"use client";

import { cn } from "@/lib/utils";
import { formatNumber, timeAgo } from "@/lib/utils";

interface MapTooltipData {
  name: string;
  party?: string;
  partyColor?: string;
  votes?: number;
  lastUpdate?: string;
}

interface MapTooltipProps {
  visible: boolean;
  x: number;
  y: number;
  data: MapTooltipData;
}

export function MapTooltip({ visible, x, y, data }: MapTooltipProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-50",
        "bg-card border border-border rounded-sm px-3 py-2 text-xs shadow-lg",
        "transition-opacity duration-100",
        visible ? "opacity-100" : "opacity-0"
      )}
      style={{ left: x + 12, top: y - 12 }}
    >
      <p className="font-semibold text-foreground">{data.name}</p>

      {data.party && (
        <div className="mt-1 flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: data.partyColor ?? "#888" }}
          />
          <span className="text-muted-foreground">{data.party}</span>
        </div>
      )}

      {data.votes !== undefined && (
        <p className="mt-0.5 text-muted-foreground">
          {formatNumber(data.votes)} votes
        </p>
      )}

      {data.lastUpdate && (
        <p className="mt-0.5 text-muted-foreground/70">
          {timeAgo(data.lastUpdate)}
        </p>
      )}
    </div>
  );
}
