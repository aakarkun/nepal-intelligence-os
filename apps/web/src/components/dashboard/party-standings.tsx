"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchNationalSummary } from "@/lib/api";
import { cn, formatNumber } from "@/lib/utils";
import { PartyMark, resolvePartyColor } from "@/components/party/party-mark";
import { useElectionDatasetStore } from "@/stores/election-dataset-store";
import { HOR_MAJORITY_THRESHOLD } from "@repo/shared";
import type { NationalSummary, PartyResult } from "@repo/shared";
import { discoverSidebarSurface } from "@/components/discover/discover-rail-panel";

export function PartyStandings() {
  const { selectedDatasetId, datasets } = useElectionDatasetStore();
  const selectedDataset = datasets.find((dataset) => dataset.id === selectedDatasetId);
  const isCurrentDataset = selectedDataset?.isCurrent ?? true;
  const { data, isLoading } = useQuery<NationalSummary>({
    queryKey: ["national-summary", selectedDatasetId],
    queryFn: () => fetchNationalSummary(selectedDatasetId),
    refetchInterval: isCurrentDataset ? 15_000 : false,
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-full animate-pulse rounded-xl bg-white/[0.06]" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-[84px] animate-pulse rounded-lg bg-white/[0.06]"
            />
          ))}
        </div>
      </div>
    );
  }

  const sorted = [...data.partyResults].sort(
    (a, b) => b.seatsWon + b.seatsLeading - (a.seatsWon + a.seatsLeading)
  );

  const totalAllocated = sorted.reduce(
    (sum, p) => sum + p.seatsWon + p.seatsLeading,
    0
  );

  const majorityPct = (HOR_MAJORITY_THRESHOLD / data.totalSeats) * 100;

  return (
    <div className="space-y-4">
      {/* Stacked bar */}
      <div className="relative">
        <div className="flex h-9 w-full overflow-hidden rounded-xl bg-[#0c0c0c]/60">
          {sorted.map((party) => {
            const seats = party.seatsWon + party.seatsLeading;
            if (seats === 0) return null;
            const widthPct = (seats / data.totalSeats) * 100;
            return (
              <div
                key={party.partyId}
                className="relative flex items-center justify-center px-1 text-[12px] font-bold text-white transition-all duration-500"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: resolvePartyColor(
                    party.partyId,
                    party.partyColor
                  ),
                  minWidth: seats > 0 ? "2px" : undefined,
                }}
                title={`${party.partyShortName}: ${seats}`}
              >
                {widthPct > 6 ? party.partyShortName : null}
              </div>
            );
          })}
          {totalAllocated < data.totalSeats && (
            <div
              className="bg-white/[0.04]"
              style={{
                width: `${((data.totalSeats - totalAllocated) / data.totalSeats) * 100}%`,
              }}
            />
          )}
        </div>

        {/* Majority threshold line */}
        <div
          className="absolute top-0 h-full border-l-2 border-dashed border-white/40"
          style={{ left: `${majorityPct}%` }}
        >
          <span className="absolute -top-6 left-1 font-mono text-[12px] text-[#888]">
            {HOR_MAJORITY_THRESHOLD}
          </span>
        </div>
      </div>

      {/* Party tiles */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {sorted
          .filter((p) => p.seatsWon + p.seatsLeading > 0 || p.totalVotes > 0)
          .map((party) => (
            <PartyCard key={party.partyId} party={party} />
          ))}
      </div>
    </div>
  );
}

function PartyCard({ party }: { party: PartyResult }) {
  const total = party.seatsWon + party.seatsLeading;
  return (
    <div
      className={cn(
        "rounded-lg p-3 transition-colors",
        discoverSidebarSurface,
        "hover:bg-white/[0.04]"
      )}
    >
      <div className="flex items-center gap-1.5">
        <PartyMark
          partyId={party.partyId}
          partyName={party.partyName}
          partyShortName={party.partyShortName}
          partyColor={party.partyColor}
          size="sm"
        />
        <span className="text-xs font-semibold">{party.partyShortName}</span>
      </div>
      <p className="mt-1 font-mono text-[20px] font-bold leading-none tabular-nums text-[#e5e5e5]">
        {total}
      </p>
      <div className="mt-2 flex gap-2 text-[12px] text-[#888]">
        <span>Won {party.seatsWon}</span>
        <span>Lead {party.seatsLeading}</span>
      </div>
      <p className="mt-0.5 font-mono text-[12px] tabular-nums text-[#555]">
        {formatNumber(party.totalVotes)} votes
      </p>
    </div>
  );
}
