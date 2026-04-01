"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { cn, timeAgo } from "@/lib/utils";
import {
  discoverSidebarFooterStrip,
} from "@/components/discover/discover-rail-panel";
import {
  discoverShellClass,
  discoverInnerCardClass,
} from "@/components/discover/discover-rail-tokens";
import { FlatRailPanelHeader } from "@/components/layout/intel-rail";
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
import { Badge } from "@/components/ui/badge";
import { useElectionDatasetStore } from "@/stores/election-dataset-store";

const POLITICAL_ACCENT_HEX = "#60a5fa";
const POLITICAL_LEADING_DOT_CLASS = "bg-sky-500";

function PoliticalPulsePanel({
  title,
  footer,
  children,
}: {
  title: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={cn(discoverShellClass, "flex h-full flex-col")}>
      <FlatRailPanelHeader
        title={title}
        leadingDotClass={POLITICAL_LEADING_DOT_CLASS}
      />
      <div
        className={cn(
          discoverInnerCardClass,
          "flex min-h-0 flex-1 flex-col"
        )}
      >
        <div className="flex-1 space-y-2">{children}</div>
        {footer ? (
          <div className={discoverSidebarFooterStrip}>{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

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
    <div className="grid gap-4 sm:grid-cols-3 sm:auto-rows-fr">
      <PoliticalPulsePanel
        title="Cabinet Activity"
        footer={
          <Link
            href="/feed"
            className="font-sans text-[12px] uppercase tracking-wider text-blue-400/90 hover:underline"
          >
            View all →
          </Link>
        }
      >
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
      </PoliticalPulsePanel>

      <PoliticalPulsePanel title="Parliamentary Session">
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
      </PoliticalPulsePanel>

      <PoliticalPulsePanel title="Coalition Health">
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
              className="h-full rounded-full opacity-80"
              style={{
                width: `${Math.min(
                  100,
                  (currentFptpSeats / HOR_MAJORITY_THRESHOLD) * 100
                )}%`,
                backgroundColor: POLITICAL_ACCENT_HEX,
              }}
            />
          </div>
          <p className="text-[12px] text-muted-foreground">
            PR seats allocated proportionally after FPTP count.
          </p>
      </PoliticalPulsePanel>
    </div>
  );
}
