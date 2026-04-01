"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchNationalSummary } from "@/lib/api";
import type { HorSeatMapMode } from "@repo/shared";
import {
  horSeatCapForMode,
  mergeHor2082NationalSummaryIfNeeded,
  partySeatsForHorMode,
  partyTotalHorSeats,
} from "@repo/shared";
import { useElectionDatasetStore } from "@/stores/election-dataset-store";
import { PartyTableNameCell } from "@/components/parliament/party-table-name";
import { cn } from "@/lib/utils";

export function ParliamentPartyDetails({
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

  if (isLoading || !merged) {
    return (
      <p className="font-sans text-[12px] text-[#555]">Loading party details…</p>
    );
  }

  const hasBreakdown = merged.partyResults.some(
    (p) => p.fptpSeats !== undefined && p.prSeats !== undefined
  );

  const cap = horSeatCapForMode(mode);

  /** Slice view (FPTP or PR): Party | Seats | % of chamber cap — matches seat map mode. */
  if (mode === "fptp" || mode === "pr") {
    const rows = [...merged.partyResults]
      .map((p) => ({
        p,
        seats: partySeatsForHorMode(p, mode),
      }))
      .filter(({ seats }) => seats > 0)
      .sort((a, b) => b.seats - a.seats);

    const sumSeats = rows.reduce((s, r) => s + r.seats, 0);

    if (rows.length === 0) {
      return (
        <div className="flex flex-col">
          <p className="font-sans text-[12px] leading-relaxed text-[#a1a1aa]">
            {mode === "pr" && !hasBreakdown ? (
              <>
                <span className="text-[#ccc]">PR seats aren’t in this feed.</span> Constituency-derived
                summaries don’t include the 110 proportional list seats per party. Pick the dataset with
                the full HoR FPTP + PR breakdown, or use Total / FPTP for what’s available here.
              </>
            ) : (
              <>
                No FPTP seat breakdown for this dataset. Choose a full HoR snapshot or use Total.
              </>
            )}
          </p>
        </div>
      );
    }

    const modeLabel = mode === "fptp" ? "FPTP" : "PR";

    return (
      <div className="flex flex-col">
        <p className="mb-2 font-sans text-[10px] text-[#555]">
          Click a row to show only that party in the seat map. Click again to clear.
        </p>
        <div className="min-w-0 overflow-x-auto rounded-lg border border-white/[0.06] bg-white/[0.06]">
          <table className="w-full border-collapse font-sans text-[12px]">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.04] text-left text-[11px] uppercase tracking-wide text-[#666]">
                <th className="px-2 py-2 font-medium">Party</th>
                <th className="px-2 py-2 text-right font-medium tabular-nums">
                  {modeLabel} seats
                </th>
                <th className="px-2 py-2 text-right font-medium tabular-nums">
                  % of {cap}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, seats }) => {
                const pct =
                  cap > 0 ? ((seats / cap) * 100).toFixed(1) : "0.0";
                const selected = focusPartyId === p.partyId;
                return (
                  <tr
                    key={p.partyId}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      onFocusParty(selected ? null : p.partyId)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onFocusParty(selected ? null : p.partyId);
                      }
                    }}
                    className={cn(
                      "cursor-pointer border-b border-white/[0.04] transition-colors last:border-b-0",
                      "hover:bg-white/[0.04]",
                      selected && "bg-white/[0.08]"
                    )}
                  >
                    <td className="min-w-0 max-w-[11rem] px-2 py-1.5 md:max-w-none">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: p.partyColor }}
                        />
                        <PartyTableNameCell party={p} className="flex-1" />
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-[#e5e5e5]">
                      {seats}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-[#a1a1aa]">
                      {pct}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {sumSeats !== cap && hasBreakdown ? (
          <p className="mt-2 font-sans text-[10px] text-[#555]">
            Listed seats {sumSeats} / {cap} (rounding or independent allocation).
          </p>
        ) : null}
        {!hasBreakdown ? (
          <p className="mt-2 font-sans text-[11px] leading-snug text-[#666]">
            FPTP/PR split needs the official HoR dataset (e.g. 2082 final). Showing
            constituency-style counts only.
          </p>
        ) : null}
      </div>
    );
  }

  /** Total mode: full FPTP + PR + Total when available. */
  const rows = [...merged.partyResults]
    .filter((p) => partyTotalHorSeats(p) > 0)
    .sort((a, b) => partyTotalHorSeats(b) - partyTotalHorSeats(a));

  const grandTotal = rows.reduce((s, p) => s + partyTotalHorSeats(p), 0);

  return (
    <div className="flex flex-col">
      <p className="mb-2 font-sans text-[10px] text-[#555]">
        Click a row to show only that party in the seat map. Click again to clear.
      </p>
      <div className="min-w-0 overflow-x-auto rounded-lg border border-white/[0.06] bg-white/[0.06]">
        <table className="w-full border-collapse font-sans text-[12px]">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.04] text-left text-[11px] uppercase tracking-wide text-[#666]">
              <th className="px-2 py-2 font-medium">Party</th>
              {hasBreakdown ? (
                <>
                  <th className="px-2 py-2 text-right font-medium tabular-nums">FPTP</th>
                  <th className="px-2 py-2 text-right font-medium tabular-nums">PR</th>
                </>
              ) : null}
              <th className="px-2 py-2 text-right font-medium tabular-nums">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const total = partyTotalHorSeats(p);
              const pct =
                grandTotal > 0 ? ((total / grandTotal) * 100).toFixed(1) : "0.0";
              const fptp = p.fptpSeats ?? p.seatsWon;
              const pr = p.prSeats ?? 0;
              const selected = focusPartyId === p.partyId;
              return (
                <tr
                  key={p.partyId}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    onFocusParty(selected ? null : p.partyId)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onFocusParty(selected ? null : p.partyId);
                    }
                  }}
                  className={cn(
                    "cursor-pointer border-b border-white/[0.04] transition-colors last:border-b-0",
                    "hover:bg-white/[0.04]",
                    selected && "bg-white/[0.08]"
                  )}
                >
                  <td className="min-w-0 max-w-[11rem] px-2 py-1.5 md:max-w-none">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ backgroundColor: p.partyColor }}
                      />
                      <PartyTableNameCell party={p} className="flex-1" />
                    </div>
                  </td>
                  {hasBreakdown ? (
                    <>
                      <td className="px-2 py-1.5 text-right tabular-nums text-[#a1a1aa]">
                        {fptp}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-[#a1a1aa]">
                        {pr}
                      </td>
                    </>
                  ) : null}
                  <td className="px-2 py-1.5 text-right tabular-nums text-[#e5e5e5]">
                    {total}{" "}
                    <span className="text-[#666]">({pct}%)</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!hasBreakdown ? (
        <p className="mt-2 font-sans text-[11px] leading-snug text-[#666]">
          FPTP / PR columns appear when the dataset includes a full HoR breakdown (e.g.{" "}
          <span className="text-[#888]">Election 2026</span>).
        </p>
      ) : null}
    </div>
  );
}
