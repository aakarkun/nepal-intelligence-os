"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useRealtimeStore } from "@/stores/realtime-store";
import { cn, timeAgo } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchFeed } from "@/lib/api";
import type { SignalEvent, SignalEventType } from "@repo/shared";

const EVENT_DOT_COLORS: Record<SignalEventType, string> = {
  official: "bg-blue-500",
  ingest: "bg-gray-500",
  anomaly: "bg-red-500",
  note: "bg-yellow-500",
  news: "bg-purple-500",
};

const ELECTION_KEYWORDS = [
  "election",
  "vote",
  "voting",
  "poll",
  "ballot",
  "constituency",
  "parliament",
  "prime minister",
  "pm",
  "party",
  "seat",
] as const;

function isElectionRelated(event: SignalEvent): boolean {
  // Structural hints first: constituency / district-linked signals are always election-related.
  if (event.constituencyId || event.districtId !== undefined) {
    return true;
  }

  // Fallback to text search across title/body/source for both English and romanized hints.
  const haystack = `${event.title} ${event.body ?? ""} ${event.source ?? ""}`
    .toLowerCase()
    .trim();
  if (!haystack) return false;
  return ELECTION_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

export function LiveEventsMini() {
  const recentEvents = useRealtimeStore((s) => s.recentEvents);
  const { data: feedData } = useQuery({
    queryKey: ["live-mini-feed"],
    queryFn: () => fetchFeed(50, 0),
    refetchInterval: 15_000,
  });

  // Merge API feed (includes News Room content) with realtime SSE events.
  const apiEvents = feedData?.events ?? [];
  const mergedMap = new Map<string, SignalEvent>();
  for (const e of [...apiEvents, ...recentEvents]) {
    mergedMap.set(e.id, e);
  }
  const allEvents = Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const electionEvents = allEvents.filter(isElectionRelated);
  const events =
    electionEvents.length > 0 ? electionEvents.slice(0, 10) : allEvents.slice(0, 10);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base font-semibold">
          Live Signals
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No live election signals yet
          </p>
        ) : (
          <div className="space-y-1.5">
            {events.map((event) => (
              <Link
                key={event.id}
                href="/feed"
                className={cn(
                  "flex items-start gap-2 rounded-sm p-1.5 text-left transition-colors",
                  "hover:bg-muted/40"
                )}
              >
                <span
                  className={cn(
                    "mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full",
                    EVENT_DOT_COLORS[event.type]
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{event.title}</p>
                  <p className="font-mono text-[10px] tabular-nums text-muted-foreground">
                    {timeAgo(event.timestamp)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
        <Link
          href="/feed"
          className="mt-3 block text-center text-xs font-medium text-[#dc143c] hover:underline"
        >
          View all &rarr;
        </Link>
      </CardContent>
    </Card>
  );
}
