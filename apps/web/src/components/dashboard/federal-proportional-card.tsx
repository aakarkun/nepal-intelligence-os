"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import { useElectionDatasetStore } from "@/stores/election-dataset-store";
import { fetchNationalSummary } from "@/lib/api";
import { PartyMark } from "@/components/party/party-mark";
import type { NationalSummary } from "@repo/shared";

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
      <Card className="animate-pulse">
        <CardContent className="h-40" />
      </Card>
    );
  }

  const sorted = [...data.partyResults].sort(
    (a, b) => b.totalVotes - a.totalVotes || b.seatsWon + b.seatsLeading - (a.seatsWon + a.seatsLeading)
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="font-display text-base font-semibold">
            Federal proportional results
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Party vote totals in the selected dataset
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.slice(0, 9).map((party) => (
            <div
              key={party.partyId}
              className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-xs"
            >
              <div className="flex items-center gap-2">
                <PartyMark
                  partyId={party.partyId}
                  partyName={party.partyName}
                  partyShortName={party.partyShortName}
                  partyColor={party.partyColor}
                  size="sm"
                />
                <div>
                  <div className="font-medium text-foreground leading-tight">
                    {party.partyShortName || party.partyName}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {formatNumber(party.totalVotes)} votes
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-semibold tabular-nums">
                  {party.seatsWon + party.seatsLeading}
                </p>
                <p className="text-[11px] text-muted-foreground">seats (won + lead)</p>
              </div>
            </div>
          ))}
        </div>
        {sorted.length > 9 && (
          <p className="text-[11px] text-muted-foreground">
            Showing top 9 parties by votes. Use the Parliament and Constituencies views for full
            board detail.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

