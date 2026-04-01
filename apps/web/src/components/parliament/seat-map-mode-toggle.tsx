"use client";

import type { HorSeatMapMode } from "@repo/shared";
import { cn } from "@/lib/utils";

const MODES: { id: HorSeatMapMode; label: string }[] = [
  { id: "total", label: "Total" },
  { id: "fptp", label: "FPTP" },
  { id: "pr", label: "PR" },
];

export function SeatMapModeToggle({
  mode,
  onModeChange,
}: {
  mode: HorSeatMapMode;
  onModeChange: (m: HorSeatMapMode) => void;
}) {
  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-full border border-white/[0.08] bg-white/[0.04] p-1"
      role="tablist"
      aria-label="Seat map breakdown"
    >
      {MODES.map(({ id, label }) => {
        const active = mode === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onModeChange(id)}
            className={cn(
              "rounded-full px-3 py-1.5 font-sans text-[11px] font-medium uppercase tracking-wide transition-colors",
              active
                ? "bg-white/[0.14] text-[#e5e5e5] shadow-sm shadow-black/20"
                : "text-[#888] hover:bg-white/[0.06] hover:text-[#ccc]"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
