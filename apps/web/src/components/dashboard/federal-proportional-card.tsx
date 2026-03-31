"use client";

import { useQuery } from "@tanstack/react-query";
import { formatNumber } from "@/lib/utils";
import { useElectionDatasetStore } from "@/stores/election-dataset-store";
import { fetchNationalSummary } from "@/lib/api";
import { PartyMark } from "@/components/party/party-mark";
import type { NationalSummary } from "@repo/shared";
import { cn } from "@/lib/utils";

export function FederalProportionalCard() {
  const { selectedDatasetId, datasets } = useElectionDatasetStore();
  const selectedDataset = datasets.find((dataset) => dataset.id === selectedDatasetId);
  const isCurrentDataset = selectedDataset?.isCurrent ?? true;

  const { data, isLoading } = useQuery<NationalSummary>({
    queryKey: ["national-summary", selectedDatasetId, "federal-proportional"],
    queryFn: () => fetchNationalSummary(selectedDatasetId),
    enabled: Boolean(selectedDatasetId),
    refetchInterval: isCurrentDataset ? 15_000 : false,
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <div className="h-5 w-2/5 animate-pulse rounded bg-white/[0.06]" />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-md bg-white/[0.06]" />
          ))}
        </div>
      </div>
    );
  }

  const sorted = [...data.partyResults].sort(
    (a, b) => b.totalVotes - a.totalVotes || b.seatsWon + b.seatsLeading - (a.seatsWon + a.seatsLeading)
  );

  return (
    <div className="flex h-full flex-col space-y-3">
      <div className="font-sans text-[13px] uppercase tracking-wider text-[#a1a1aa]">
        Federal proportional results
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.slice(0, 9).map((party) => (
          <div
            key={party.partyId}
            className={cn(
              "flex items-center justify-between rounded-md bg-[#181818]/60 px-3 py-2 text-xs",
              "transition-colors hover:bg-white/[0.04]"
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <PartyMark
                partyId={party.partyId}
                partyName={party.partyName}
                partyShortName={party.partyShortName}
                partyColor={party.partyColor}
                size="sm"
              />
              <div className="min-w-0">
                <div className="font-medium leading-tight text-[#e5e5e5] truncate">
                  {party.partyShortName || party.partyName}
                </div>
                <p className="text-[12px] text-[#888] truncate">
                  {formatNumber(party.totalVotes)} votes
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-sans text-sm font-semibold tabular-nums text-[#e5e5e5]">
                {party.seatsWon + party.seatsLeading}
              </p>
              <p className="text-[12px] text-[#555]">seats</p>
            </div>
          </div>
        ))}
      </div>

      {sorted.length > 9 && (
        <p className="text-[13px] text-muted-foreground">
          Showing top 9 parties by votes. Use the Parliament and Constituencies views for full
          board detail.
        </p>
      )}

      <p className="mt-auto text-[13px] text-muted-foreground">
        Party vote totals in the selected dataset
      </p>
    </div>
  );
}

