"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchNationalSummary } from "@/lib/api";
import { cn, formatNumber } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PartyMark, resolvePartyColor } from "@/components/party/party-mark";
import { useElectionDatasetStore } from "@/stores/election-dataset-store";
import { HOR_MAJORITY_THRESHOLD } from "@repo/shared";
import type { NationalSummary, PartyResult } from "@repo/shared";

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
      <Card className="animate-pulse">
        <CardContent className="h-48 p-6" />
      </Card>
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-base font-semibold">
            Party Standings
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            Majority: {HOR_MAJORITY_THRESHOLD} seats
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stacked bar */}
        <div className="relative">
          <div className="flex h-8 w-full overflow-hidden rounded-sm">
            {sorted.map((party) => {
              const seats = party.seatsWon + party.seatsLeading;
              if (seats === 0) return null;
              const widthPct = (seats / data.totalSeats) * 100;
              return (
                <div
                  key={party.partyId}
                  className="relative flex items-center justify-center text-[10px] font-bold text-white transition-all duration-500"
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
                  {widthPct > 6 && party.partyShortName}
                </div>
              );
            })}
            {totalAllocated < data.totalSeats && (
              <div
                className="bg-muted/50"
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
            <span className="absolute -top-5 left-1 text-[10px] text-muted-foreground">
              {HOR_MAJORITY_THRESHOLD}
            </span>
          </div>
        </div>

        {/* Party cards grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {sorted
            .filter((p) => p.seatsWon + p.seatsLeading > 0 || p.totalVotes > 0)
            .map((party) => (
              <PartyCard key={party.partyId} party={party} />
            ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PartyCard({ party }: { party: PartyResult }) {
  const total = party.seatsWon + party.seatsLeading;
  return (
    <div
      className={cn(
        "rounded-sm border border-border p-2.5 transition-colors",
        "hover:bg-muted/40"
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
      <p className="mt-1 font-mono text-lg font-bold tabular-nums">{total}</p>
      <div className="flex gap-2 text-[10px] text-muted-foreground">
        <span>Won {party.seatsWon}</span>
        <span>Lead {party.seatsLeading}</span>
      </div>
      <p className="mt-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
        {formatNumber(party.totalVotes)} votes
      </p>
    </div>
  );
}
