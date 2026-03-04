"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchNationalSummary } from "@/lib/api";
import { formatNumber, timeAgo } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NationalSummary } from "@repo/shared";

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
  const { data, isLoading } = useQuery<NationalSummary>({
    queryKey: ["national-summary"],
    queryFn: fetchNationalSummary,
    refetchInterval: 15_000,
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-4 gap-4">
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

  return (
    <div className="grid grid-cols-4 gap-4">
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
      </StatCard>

      <StatCard label="Leading Party">
        {leadingParty && (
          <>
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: leadingParty.partyColor }}
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
          {timeAgo(data.timestamp)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {new Date(data.timestamp).toLocaleTimeString("en-US", {
            timeZone: "Asia/Kathmandu",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}{" "}
          NPT
        </p>
      </StatCard>
    </div>
  );
}
