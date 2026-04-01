"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { fetchNationalSummary } from "@/lib/api";
import type { HorSeatMapMode, NationalSummary } from "@repo/shared";
import {
  horSeatCapForMode,
  mergeHor2082NationalSummaryIfNeeded,
  partySeatsForHorMode,
  partyTotalHorSeats,
} from "@repo/shared";
import { useElectionDatasetStore } from "@/stores/election-dataset-store";
import { discoverShellClass } from "@/components/discover/discover-rail-tokens";
import { FlatRailPanelHeader } from "@/components/layout/intel-rail";
import { cn, hexColorWithAlpha } from "@/lib/utils";

const panelBodyClass = "min-w-0 px-2 pb-2";

/** Base party hex from API; opacity applied for slices, dots, and labels. */
const PIE_COLOR_ALPHA = 0.72;
const PIE_COLOR_ALPHA_FOCUSED = 0.92;

type PieDatum = {
  name: string;
  seats: number;
  partyId: string;
  color: string;
};

function buildPieData(merged: NationalSummary, mode: HorSeatMapMode): PieDatum[] {
  if (mode === "fptp" || mode === "pr") {
    const rows = [...merged.partyResults]
      .map((p) => ({ p, seats: partySeatsForHorMode(p, mode) }))
      .filter(({ seats }) => seats > 0)
      .sort((a, b) => b.seats - a.seats);
    return rows.map(({ p, seats }) => ({
      name: p.partyShortName || p.partyName,
      seats,
      partyId: p.partyId,
      color: p.partyColor || "#888888",
    }));
  }
  const rows = [...merged.partyResults]
    .filter((p) => partyTotalHorSeats(p) > 0)
    .sort((a, b) => partyTotalHorSeats(b) - partyTotalHorSeats(a));
  return rows.map((p) => ({
    name: p.partyShortName || p.partyName,
    seats: partyTotalHorSeats(p),
    partyId: p.partyId,
    color: p.partyColor || "#888888",
  }));
}

function modeLabel(mode: HorSeatMapMode): string {
  switch (mode) {
    case "total":
      return "Total";
    case "fptp":
      return "FPTP";
    case "pr":
      return "PR";
    default: {
      const _e: never = mode;
      return _e;
    }
  }
}

export function ParliamentPartySeatsPie({
  mode,
  focusPartyId,
  onFocusParty,
}: {
  mode: HorSeatMapMode;
  focusPartyId: string | null;
  onFocusParty: (partyId: string | null) => void;
}) {
  const { selectedDatasetId } = useElectionDatasetStore();
  const { data: summary, isLoading } = useQuery({
    queryKey: ["national-summary", selectedDatasetId],
    queryFn: () => fetchNationalSummary(selectedDatasetId),
    refetchInterval: 15_000,
  });

  const merged = useMemo(
    () => (summary ? mergeHor2082NationalSummaryIfNeeded(summary, selectedDatasetId) : undefined),
    [summary, selectedDatasetId]
  );

  const pieData = useMemo(() => (merged ? buildPieData(merged, mode) : []), [merged, mode]);

  const totalSeats = useMemo(
    () => pieData.reduce((s, d) => s + d.seats, 0),
    [pieData]
  );

  const selectedSlice = useMemo(
    () =>
      focusPartyId ? pieData.find((d) => d.partyId === focusPartyId) ?? null : null,
    [focusPartyId, pieData]
  );

  const cap = horSeatCapForMode(mode);

  if (isLoading || !merged) {
    return (
      <div className={cn(discoverShellClass, "min-w-0")}>
        <FlatRailPanelHeader title="Seat share" leadingDotClass="bg-rose-500" />
        <div className={panelBodyClass}>
          <p className="font-sans text-[12px] text-[#555]">Loading chart…</p>
        </div>
      </div>
    );
  }

  if (pieData.length === 0) {
    return (
      <div className={cn(discoverShellClass, "min-w-0")}>
        <FlatRailPanelHeader title="Seat share" leadingDotClass="bg-rose-500" />
        <div className={panelBodyClass}>
          <p className="font-sans text-[12px] leading-relaxed text-[#a1a1aa]">
            No seat data for this view. Match the seat map mode or pick a full HoR dataset.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(discoverShellClass, "min-w-0")}>
      <FlatRailPanelHeader
        title="Seat share"
        leadingDotClass="bg-rose-500"
        right={
          <span className="font-sans text-[10px] uppercase tracking-wider text-[#666]">
            {modeLabel(mode)} · {cap} seats
          </span>
        }
      />
      <div className={panelBodyClass}>
        <p className="mb-2 font-sans text-[10px] text-[#555]">
          Click a slice to focus the seat map; click again to clear.
        </p>
        <div className="relative h-[200px] w-full [&_.recharts-surface]:outline-none">
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-3">
            <div className="flex max-w-[min(8rem,40%)] flex-col items-center text-center">
              {selectedSlice ? (
                <>
                  <p
                    className="truncate font-sans text-[11px] font-medium leading-tight"
                    style={{
                      color: hexColorWithAlpha(
                        selectedSlice.color,
                        PIE_COLOR_ALPHA_FOCUSED
                      ),
                    }}
                  >
                    {selectedSlice.name}
                  </p>
                  <p className="mt-0.5 font-sans text-[24px] font-semibold leading-none tracking-tight text-[#e5e5e5] tabular-nums">
                    {selectedSlice.seats}
                  </p>
                </>
              ) : (
                <p className="font-sans text-[26px] font-semibold leading-none tracking-tight text-[#e5e5e5] tabular-nums">
                  {totalSeats}
                </p>
              )}
            </div>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart
              accessibilityLayer={false}
              margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
            >
              <Pie
                data={pieData}
                dataKey="seats"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={78}
                paddingAngle={1}
                onClick={(data) => {
                  const row = data as PieDatum;
                  if (!row?.partyId) return;
                  const next = focusPartyId === row.partyId ? null : row.partyId;
                  onFocusParty(next);
                }}
              >
                {pieData.map((entry) => (
                  <Cell
                    key={entry.partyId}
                    fill={hexColorWithAlpha(
                      entry.color,
                      focusPartyId === entry.partyId
                        ? PIE_COLOR_ALPHA_FOCUSED
                        : PIE_COLOR_ALPHA
                    )}
                    stroke={
                      focusPartyId === entry.partyId
                        ? "rgba(255,255,255,0.55)"
                        : "rgba(0,0,0,0.18)"
                    }
                    strokeWidth={focusPartyId === entry.partyId ? 2 : 1}
                    className="cursor-pointer outline-none transition-[stroke-width] duration-150"
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as PieDatum;
                  const pct =
                    totalSeats > 0 ? ((p.seats / totalSeats) * 100).toFixed(1) : "0.0";
                  const capPct = cap > 0 ? ((p.seats / cap) * 100).toFixed(1) : "0.0";
                  return (
                    <div className="rounded-md border border-white/[0.12] bg-[#141414]/95 px-2.5 py-2 font-sans text-[11px] shadow-lg backdrop-blur-sm">
                      <p className="flex items-center gap-2 font-medium text-[#e5e5e5]">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{
                            backgroundColor: hexColorWithAlpha(
                              p.color,
                              PIE_COLOR_ALPHA_FOCUSED
                            ),
                          }}
                        />
                        {p.name}
                      </p>
                      <p className="tabular-nums text-[#a1a1aa]">
                        {p.seats} seats · {pct}% of parties shown · {capPct}% of chamber
                      </p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex max-h-28 flex-wrap gap-x-3 gap-y-1 overflow-y-auto font-sans text-[10px] leading-tight text-[#888]">
          {pieData.map((d) => (
            <button
              key={d.partyId}
              type="button"
              onClick={() =>
                onFocusParty(focusPartyId === d.partyId ? null : d.partyId)
              }
              className={cn(
                "inline-flex max-w-[10rem] items-center gap-1 rounded px-0.5 text-left transition-colors hover:text-[#ccc]",
                focusPartyId === d.partyId && "text-[#e5e5e5]"
              )}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-sm"
                style={{
                  backgroundColor: hexColorWithAlpha(
                    d.color,
                    focusPartyId === d.partyId
                      ? PIE_COLOR_ALPHA_FOCUSED
                      : PIE_COLOR_ALPHA
                  ),
                }}
              />
              <span className="truncate">{d.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
