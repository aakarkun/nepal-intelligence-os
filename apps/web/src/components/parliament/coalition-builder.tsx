"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchNationalSummary } from "@/lib/api";
import { HOR_MAJORITY_THRESHOLD, mergeHor2082NationalSummaryIfNeeded, partyTotalHorSeats } from "@repo/shared";
import { PartyTableNameCell } from "@/components/parliament/party-table-name";
import { cn } from "@/lib/utils";
import { useElectionDatasetStore } from "@/stores/election-dataset-store";

export function CoalitionBuilder() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { selectedDatasetId } = useElectionDatasetStore();

  const { data: summary } = useQuery({
    queryKey: ["national-summary", selectedDatasetId],
    queryFn: () => fetchNationalSummary(selectedDatasetId),
    refetchInterval: 15_000,
  });

  const merged = useMemo(
    () => (summary ? mergeHor2082NationalSummaryIfNeeded(summary, selectedDatasetId) : undefined),
    [summary, selectedDatasetId]
  );

  const parties = (merged?.partyResults ?? [])
    .filter((p) => partyTotalHorSeats(p) > 0)
    .sort((a, b) => partyTotalHorSeats(b) - partyTotalHorSeats(a));

  function toggle(partyId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(partyId)) next.delete(partyId);
      else next.add(partyId);
      return next;
    });
  }

  const totalSeats = parties
    .filter((p) => selected.has(p.partyId))
    .reduce((sum, p) => sum + partyTotalHorSeats(p), 0);

  const hasMajority = totalSeats >= HOR_MAJORITY_THRESHOLD;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        {parties.map((p) => (
          <button
            key={p.partyId}
            type="button"
            onClick={() => toggle(p.partyId)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-xs transition-colors",
              selected.has(p.partyId)
                ? "border-white/[0.12] bg-white/[0.08]"
                : "border-white/[0.08] hover:bg-white/[0.05]"
            )}
          >
            <span
              className={cn(
                "h-3 w-3 flex-shrink-0 rounded-sm border-2",
                selected.has(p.partyId)
                  ? "border-white bg-white"
                  : "border-[#666]"
              )}
              style={
                selected.has(p.partyId)
                  ? { backgroundColor: p.partyColor, borderColor: p.partyColor }
                  : undefined
              }
            />
            <span
              className="h-2 w-2 flex-shrink-0 rounded-full"
              style={{ backgroundColor: p.partyColor }}
            />
            <PartyTableNameCell party={p} className="min-w-0 flex-1 font-medium" />
            <span className="shrink-0 text-[#888]">{partyTotalHorSeats(p)} seats</span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#888]">Coalition total</span>
          <span
            className={cn(
              "text-sm font-bold",
              hasMajority ? "text-emerald-400" : "text-[#888]"
            )}
          >
            {totalSeats} / {HOR_MAJORITY_THRESHOLD}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              hasMajority ? "bg-emerald-500" : "bg-nepal-red"
            )}
            style={{
              width: `${Math.min(100, (totalSeats / HOR_MAJORITY_THRESHOLD) * 100)}%`,
            }}
          />
        </div>
        {hasMajority && (
          <p className="text-center text-xs font-medium text-emerald-400">Majority achieved</p>
        )}
      </div>
    </div>
  );
}
