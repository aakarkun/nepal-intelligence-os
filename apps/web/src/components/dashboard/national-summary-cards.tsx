"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchNationalSummary } from "@/lib/api";
import { formatNumber, formatNepalDateTime, timeAgo } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PartyMark } from "@/components/party/party-mark";
import { useElectionDatasetStore } from "@/stores/election-dataset-store";
import { env } from "@/lib/env";
import type { NationalSummary } from "@repo/shared";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function StatCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">{children}</CardContent>
    </Card>
  );
}

export function NationalSummaryCards() {
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-24 p-4" />
          </Card>
        ))}
      </div>
    );
  }

  const leadingParty = [...data.partyResults].sort(
    (a, b) => b.seatsWon + b.seatsLeading - (a.seatsWon + a.seatsLeading)
  )[0];

  const pct = Math.round(
    (data.countedConstituencies / data.totalConstituencies) * 100
  );
  const hasPrComponent = data.totalSeats > data.totalConstituencies;
  const cronMinutes = env.NEXT_PUBLIC_CRON_ECN_MINUTES;
  const nextUpdateAt =
    isCurrentDataset && cronMinutes > 0
      ? new Date(
          new Date(data.timestamp).getTime() + cronMinutes * 60 * 1000
        )
      : null;

  return (
    <>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <TooltipProvider delayDuration={0}>
        <StatCard label="Seats Counted">
          <div className="font-mono text-2xl font-bold tabular-nums">
            {data.countedConstituencies}
            <span className="text-base text-muted-foreground">
              /{data.totalConstituencies}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-[#dc143c] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{pct}% reported</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {pct < 100
              ? `Vote counting: In progress — ${pct}% of ${data.totalConstituencies} constituencies reported.`
              : `Vote counting: All ${data.countedConstituencies} constituencies reported.`}
          </p>
          {hasPrComponent && (
            <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
              <span>
                House: {data.totalSeats} seats (
                {data.totalConstituencies} FPTP +{" "}
                {data.totalSeats - data.totalConstituencies} PR)
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="h-4 w-4 rounded-full border border-border text-[10px] flex items-center justify-center leading-none"
                    aria-label="Seat breakdown details"
                  >
                    i
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  This view currently shows constituency (FPTP) seats. Proportional
                  representation seat allocation is tracked separately by the Election
                  Commission and may still be pending, even when all constituencies are reported.
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </StatCard>
      </TooltipProvider>

      <StatCard label="Leading Party">
        {leadingParty && (
          <>
            <div className="flex items-center gap-2">
              <PartyMark
                partyId={leadingParty.partyId}
                partyName={leadingParty.partyName}
                partyShortName={leadingParty.partyShortName}
                partyColor={leadingParty.partyColor}
                size="md"
              />
              <span className="font-display text-lg font-semibold">
                {leadingParty.partyShortName}
              </span>
            </div>
            <p className="font-mono text-2xl font-bold tabular-nums">
              {leadingParty.seatsWon + leadingParty.seatsLeading}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                seats
              </span>
            </p>
          </>
        )}
      </StatCard>

      <StatCard label="Total Votes Cast">
        <p className="font-mono text-2xl font-bold tabular-nums">
          {formatNumber(data.totalVotesCast)}
        </p>
      </StatCard>

      <StatCard label="Last Update">
        <p className="font-mono text-2xl font-bold tabular-nums">
          {isCurrentDataset ? timeAgo(data.timestamp) : formatNepalDateTime(data.timestamp)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {isCurrentDataset ? "NPT freshness clock" : "Archived snapshot timestamp"}
        </p>
      </StatCard>
    </div>
    {(data.sourceName ?? data.sourceId) && (
      <p className="mt-2 text-xs text-muted-foreground">
        Source: {data.sourceName ?? data.sourceId}
        {" · "}
        {isCurrentDataset
          ? `Updated ${timeAgo(data.sourceFetchedAt ?? data.timestamp)} ago`
          : `Archived snapshot from ${formatNepalDateTime(
              data.sourceFetchedAt ?? data.timestamp
            )}`}
        {isCurrentDataset && nextUpdateAt && (
          <>
            {" · "}
            {(() => {
              const diffMs = nextUpdateAt.getTime() - Date.now();
              const diffMinutes = Math.abs(Math.round(diffMs / 60_000));

              if (diffMs > 0) {
                return `Next worker run ~${diffMinutes} min`;
              }

              return `Last worker slot ~${diffMinutes} min ago`;
            })()}
          </>
        )}
      </p>
    )}
    </>
  );
}
