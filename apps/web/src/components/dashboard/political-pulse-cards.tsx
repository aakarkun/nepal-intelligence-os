"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Building2, Users, Calendar } from "@/components/icons";
import {
  fetchCabinetEvents,
  fetchParliamentSession,
  fetchNationalSummary,
} from "@/lib/api";
import {
  HOR_MAJORITY_THRESHOLD,
  HOR_TOTAL_SEATS,
  HOR_PR_SEATS,
} from "@repo/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, timeAgo } from "@/lib/utils";
import { useElectionDatasetStore } from "@/stores/election-dataset-store";

export function PoliticalPulseCards() {
  const { selectedDatasetId } = useElectionDatasetStore();
  const { data: cabinetEvents = [] } = useQuery({
    queryKey: ["politics", "cabinet-events"],
    queryFn: () => fetchCabinetEvents(10),
    refetchInterval: 60_000,
  });
  const { data: parliamentSession } = useQuery({
    queryKey: ["politics", "parliament-session"],
    queryFn: fetchParliamentSession,
    refetchInterval: 60_000,
  });
  const { data: nationalSummary } = useQuery({
    queryKey: ["national-summary", selectedDatasetId],
    queryFn: () => fetchNationalSummary(selectedDatasetId),
    refetchInterval: 30_000,
  });

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisWeekCount = cabinetEvents.filter(
    (e) => new Date(e.publishedAt) >= weekAgo
  ).length;
  const lastCabinetMeeting = cabinetEvents
    .filter((e) => e.type === "meeting")
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )[0];
  const sessionStartDate = parliamentSession?.sessionStart
    ? new Date(parliamentSession.sessionStart)
    : null;
  const daysActive =
    sessionStartDate && !Number.isNaN(sessionStartDate.getTime())
      ? Math.max(
          0,
          Math.floor(
            (now.getTime() - sessionStartDate.getTime()) / (24 * 60 * 60 * 1000)
          )
        )
      : null;

  const partyResults = nationalSummary?.partyResults ?? [];
  const sortedParties = [...partyResults].sort(
    (a, b) => b.seatsWon + b.seatsLeading - (a.seatsWon + a.seatsLeading)
  );
  const currentFptpSeats = partyResults.reduce(
    (sum, p) => sum + p.seatsWon + p.seatsLeading,
    0
  );
  const leadingParty = sortedParties[0];
  const majorityShort = HOR_MAJORITY_THRESHOLD - currentFptpSeats;
  const coalitionLabel =
    majorityShort <= 0
      ? "Over majority pending PR allocation"
      : `${leadingParty?.partyShortName ?? "Leading"} — ${majorityShort} seats short of majority pending PR allocation`;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card className="border border-border bg-card/80">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">
              Cabinet Activity
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {lastCabinetMeeting ? (
            <p className="text-xs text-muted-foreground">
              Last cabinet meeting: {timeAgo(lastCabinetMeeting.publishedAt)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              No cabinet meetings in feed yet.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Recent decisions this week: {thisWeekCount}
          </p>
          <ul className="space-y-1">
            {cabinetEvents.slice(0, 3).map((e) => (
              <li key={e.id} className="text-xs">
                <span className="font-medium leading-tight">{e.title}</span>
                <span className="ml-1 text-muted-foreground">
                  {timeAgo(e.publishedAt)}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/feed"
            className="inline-block text-xs text-nepal-red hover:underline"
          >
            View all →
          </Link>
        </CardContent>
      </Card>

      <Card className="border border-border bg-card/80">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">
              Parliamentary Session
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {parliamentSession ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">
                  {parliamentSession.sessionName}
                </span>
                <Badge
                  className={cn(
                    parliamentSession.status === "active" &&
                      "border-emerald-500/20 bg-emerald-500/8 text-emerald-400",
                    parliamentSession.status === "recess" &&
                      "border-amber-500/20 bg-amber-500/8 text-amber-400"
                  )}
                >
                  {parliamentSession.status}
                </Badge>
              </div>
              {daysActive != null && (
                <p className="text-xs text-muted-foreground">
                  Days active: {daysActive}
                </p>
              )}
              {parliamentSession.nextSittingDate && (
                <p className="text-xs text-muted-foreground">
                  Next sitting: {parliamentSession.nextSittingDate}
                </p>
              )}
              {parliamentSession.pendingBills != null && (
                <p className="text-xs text-muted-foreground">
                  Pending bills: {parliamentSession.pendingBills}
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Session data unavailable. Parliament scrape runs daily.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border bg-card/80">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">
              Coalition Health
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Majority threshold: {HOR_MAJORITY_THRESHOLD} / {HOR_TOTAL_SEATS}
          </p>
          <p className="text-xs text-muted-foreground">
            Current FPTP seats: {currentFptpSeats} · PR seats pending:{" "}
            {HOR_PR_SEATS}
          </p>
          <p className="text-xs font-medium">{coalitionLabel}</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-nepal-red/80"
              style={{
                width: `${Math.min(
                  100,
                  (currentFptpSeats / HOR_MAJORITY_THRESHOLD) * 100
                )}%`,
              }}
            />
          </div>
          <p className="text-[12px] text-muted-foreground">
            PR seats allocated proportionally after FPTP count.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
