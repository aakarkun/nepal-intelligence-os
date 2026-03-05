"use client";

import Link from "next/link";
import { useRealtimeStore } from "@/stores/realtime-store";
import { cn, timeAgo } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SignalEventType } from "@repo/shared";

const EVENT_DOT_COLORS: Record<SignalEventType, string> = {
  official: "bg-blue-500",
  ingest: "bg-gray-500",
  anomaly: "bg-red-500",
  note: "bg-yellow-500",
  news: "bg-purple-500",
};

export function LiveEventsMini() {
  const recentEvents = useRealtimeStore((s) => s.recentEvents);
  const events = recentEvents.slice(0, 10);

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
            No events yet
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
