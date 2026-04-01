"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchNationalSummary } from "@/lib/api";
import { useElectionDatasetStore } from "@/stores/election-dataset-store";
import { discoverShellClass } from "@/components/discover/discover-rail-tokens";
import { FlatRailPanelHeader } from "@/components/layout/intel-rail";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import { PartyTableNameCell } from "@/components/parliament/party-table-name";
import { cn, formatNumber } from "@/lib/utils";
import type { NationalSummary, PartyResult } from "@repo/shared";
import { HOR_PR_SEATS, mergeHor2082NationalSummaryIfNeeded } from "@repo/shared";

const panelBodyClass = "min-w-0 px-2 pb-2";

const PROPORTIONAL_PAGE_SIZE = 12;

type PrTableRow = PartyResult;

function prVoteShare(prVotes: number, total: number): string {
  if (total <= 0) return "0.0";
  return ((prVotes / total) * 100).toFixed(2);
}

function isBelowPrThreshold(prVotes: number, total: number, threshold: number): boolean {
  if (total <= 0) return false;
  return (prVotes / total) * 100 < threshold;
}

/** True when the proportional section would render (used for layout grid columns). */
function computeProportionalHorWouldRender(merged: NationalSummary | null): boolean {
  if (!merged) return false;
  const meta = merged.horProportional;
  const show =
    meta ||
    merged.partyResults.some((p) => p.prVotes !== undefined && p.prVotes > 0);
  if (!show) return false;
  const base = merged.partyResults.filter(
    (p) => p.prSeats !== undefined || (p.prVotes !== undefined && p.prVotes > 0)
  );
  const sorted = [...base].sort((a, b) => (b.prVotes ?? 0) - (a.prVotes ?? 0));
  if (sorted.length === 0 && !meta) return false;
  return true;
}

/** Matches {@link ParliamentProportionalHor} visibility; React Query dedupes with the same key. */
export function useParliamentProportionalHorVisible(): boolean {
  const { selectedDatasetId } = useElectionDatasetStore();
  const { data: summary, isLoading } = useQuery({
    queryKey: ["national-summary", selectedDatasetId],
    queryFn: () => fetchNationalSummary(selectedDatasetId),
    enabled: Boolean(selectedDatasetId),
    refetchInterval: 15_000,
  });
  const merged = useMemo(
    () => (summary ? mergeHor2082NationalSummaryIfNeeded(summary, selectedDatasetId) : null),
    [summary, selectedDatasetId]
  );
  if (isLoading) return false;
  return computeProportionalHorWouldRender(merged);
}

export function ParliamentProportionalHor() {
  const { selectedDatasetId } = useElectionDatasetStore();
  const { data: summary, isLoading } = useQuery({
    queryKey: ["national-summary", selectedDatasetId],
    queryFn: () => fetchNationalSummary(selectedDatasetId),
    enabled: Boolean(selectedDatasetId),
    refetchInterval: 15_000,
  });

  const merged = useMemo(
    () => (summary ? mergeHor2082NationalSummaryIfNeeded(summary, selectedDatasetId) : null),
    [summary, selectedDatasetId]
  );

  const meta = merged?.horProportional;
  const threshold = meta?.thresholdPercent ?? 3;

  const tableRows = useMemo((): PrTableRow[] => {
    if (!merged?.partyResults?.length) return [];
    const base = merged.partyResults.filter(
      (p) => p.prSeats !== undefined || (p.prVotes !== undefined && p.prVotes > 0)
    );
    return [...base].sort((a, b) => (b.prVotes ?? 0) - (a.prVotes ?? 0));
  }, [merged?.partyResults]);

  const [page, setPage] = useState(0);
  useEffect(() => {
    setPage(0);
  }, [selectedDatasetId, tableRows.length]);

  const totalPages = Math.max(1, Math.ceil(tableRows.length / PROPORTIONAL_PAGE_SIZE));
  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, totalPages - 1)));
  }, [totalPages]);

  const pageIndex = Math.min(page, Math.max(0, totalPages - 1));
  const pageRows = useMemo(() => {
    const start = pageIndex * PROPORTIONAL_PAGE_SIZE;
    return tableRows.slice(start, start + PROPORTIONAL_PAGE_SIZE);
  }, [tableRows, pageIndex]);

  if (isLoading || !merged || !computeProportionalHorWouldRender(merged)) {
    return null;
  }

  const totalVotes =
    meta && meta.totalVotesCast > 0
      ? meta.totalVotesCast
      : merged.partyResults.reduce((s, p) => s + (p.prVotes ?? 0), 0);
  const prCap = meta?.prSeatCap ?? HOR_PR_SEATS;

  return (
    <div className={cn(discoverShellClass, "min-w-0")}>
      <FlatRailPanelHeader
        title="Proportional (HoR)"
        leadingDotClass="bg-amber-500"
        right={
          meta?.lastUpdated ? (
            <span className="font-sans text-[10px] uppercase tracking-wider text-[#666]">
              Last updated{" "}
              {new Date(meta.lastUpdated).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          ) : null
        }
      />
      <div className={panelBodyClass}>
        {meta ? (
          <div className="mb-3 flex flex-wrap gap-3 border-b border-white/[0.06] pb-3 font-sans text-[11px] uppercase tracking-wider text-[#888]">
            <div>
              <span className="text-[#555]">Total votes </span>
              <span className="tabular-nums text-[#ccc]">{formatNumber(meta.totalVotesCast)}</span>
            </div>
            <div>
              <span className="text-[#555]">PR seats </span>
              <span className="tabular-nums text-[#ccc]">{prCap}</span>
            </div>
            {meta.partiesInTally != null ? (
              <div>
                <span className="text-[#555]">Parties </span>
                <span className="tabular-nums text-[#ccc]">{meta.partiesInTally}</span>
              </div>
            ) : null}
            {meta.countingStatus === "completed" ? (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-400/90">
                Counting completed
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="min-w-0 overflow-x-auto rounded-lg border border-white/[0.06] bg-white/[0.06]">
          <table className="w-full border-collapse font-sans text-[12px]">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.04] text-left text-[11px] uppercase tracking-wide text-[#666]">
                <th className="px-2 py-2 font-medium">Party</th>
                <th className="px-2 py-2 text-right font-medium tabular-nums">Votes received</th>
                <th className="px-2 py-2 text-right font-medium tabular-nums">PR seats</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((p) => {
                const votes = p.prVotes ?? 0;
                const pct =
                  totalVotes > 0 ? prVoteShare(votes, totalVotes) : "—";
                const prSeatCell = p.prSeats ?? 0;
                const below =
                  totalVotes > 0 &&
                  isBelowPrThreshold(votes, totalVotes, threshold) &&
                  prSeatCell === 0;
                return (
                  <tr
                    key={p.partyId}
                    className="border-b border-white/[0.04] transition-colors last:border-b-0"
                  >
                    <td className="min-w-0 max-w-[12rem] px-2 py-1.5 md:max-w-none">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: p.partyColor }}
                        />
                        <PartyTableNameCell party={p} className="flex-1" />
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-right align-top tabular-nums">
                      <div className="text-[#e5e5e5]">{formatNumber(votes)}</div>
                      <div className="text-[11px] text-[#666]">
                        {pct === "—" ? "—" : `${pct}%`}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-right align-top tabular-nums">
                      <span className="text-[#e5e5e5]">{prSeatCell}</span>
                      {below ? (
                        <div className="text-[10px] text-[#666]">&lt; {threshold}%</div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {tableRows.length > PROPORTIONAL_PAGE_SIZE ? (
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
            <span className="font-sans text-[11px] text-[#555]">
              PAGE {pageIndex + 1} OF {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={pageIndex === 0}
                className="rounded p-1 transition-colors hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-3 w-3 text-[#888]" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={pageIndex >= totalPages - 1}
                className="rounded p-1 transition-colors hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
                aria-label="Next page"
              >
                <ChevronRight className="h-3 w-3 text-[#888]" />
              </button>
            </div>
          </div>
        ) : null}

        {meta?.thresholdPercent != null ? (
          <p className="mt-2 font-sans text-[10px] leading-snug text-[#555]">
            Parties below {meta.thresholdPercent}% of valid proportional votes are not allocated PR
            seats.
          </p>
        ) : null}
      </div>
    </div>
  );
}
