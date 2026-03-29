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
        "rounded-xl border border-violet-400/25 bg-zinc-950/92 px-3 py-2 text-xs text-violet-50/95 shadow-lg shadow-violet-950/40 backdrop-blur-md",
        "transition-opacity duration-100",
        visible ? "opacity-100" : "opacity-0"
      )}
      style={{ left: x + 12, top: y - 12 }}
    >
      <p className="font-semibold text-violet-50">{data.name}</p>

      {data.party && (
        <div className="mt-1 flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: data.partyColor ?? "#888" }}
          />
          <span className="text-violet-200/80">{data.party}</span>
        </div>
      )}

      {data.votes !== undefined && (
        <p className="mt-0.5 text-violet-200/75">
          {formatNumber(data.votes)} votes
        </p>
      )}

      {data.lastUpdate && (
        <p className="mt-0.5 text-violet-300/65">
          {timeAgo(data.lastUpdate)}
        </p>
      )}
    </div>
  );
}
