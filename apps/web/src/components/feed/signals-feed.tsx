"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Info,
  Database,
  AlertTriangle,
  StickyNote,
  Pin,
} from "lucide-react";
import Link from "next/link";
import { fetchFeed } from "@/lib/api";
import { useRealtimeStore } from "@/stores/realtime-store";
import { cn, timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SignalEvent, SignalSeverity, SignalEventType } from "@repo/shared";

const typeConfig: Record<
  SignalEventType,
  { color: string; icon: typeof Info; label: string }
> = {
  official: { color: "#3b82f6", icon: Info, label: "Official" },
  ingest: { color: "#6b7280", icon: Database, label: "Ingest" },
  anomaly: { color: "#ef4444", icon: AlertTriangle, label: "Anomaly" },
  note: { color: "#f59e0b", icon: StickyNote, label: "Note" },
};

const severityVariant: Record<SignalSeverity, "default" | "stale" | "error"> = {
  info: "default",
  warning: "stale",
  critical: "error",
};

export function SignalsFeed() {
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [typeFilters, setTypeFilters] = useState<Set<SignalEventType>>(
    new Set(["official", "ingest", "anomaly", "note"])
  );

  const { data: feedData } = useQuery({
    queryKey: ["feed"],
    queryFn: () => fetchFeed(100, 0),
    refetchInterval: 15_000,
  });

  const sseEvents = useRealtimeStore((s) => s.recentEvents);
  const addToWatchlist = useRealtimeStore((s) => s.addToWatchlist);

  const allEvents = useMemo(() => {
    const apiEvents = feedData?.events ?? [];
    const merged = new Map<string, SignalEvent>();
    for (const e of [...apiEvents, ...sseEvents]) {
      merged.set(e.id, e);
    }
    return Array.from(merged.values()).sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [feedData, sseEvents]);

  const filtered = useMemo(() => {
    return allEvents.filter((e) => {
      if (!typeFilters.has(e.type)) return false;
      if (severityFilter !== "all" && e.severity !== severityFilter) return false;
      return true;
    });
  }, [allEvents, typeFilters, severityFilter]);

  function toggleType(type: SignalEventType) {
    setTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Tabs value={severityFilter} onValueChange={setSeverityFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="critical">Critical</TabsTrigger>
            <TabsTrigger value="warning">Warning</TabsTrigger>
            <TabsTrigger value="info">Info</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-1.5 ml-auto">
          {(
            Object.entries(typeConfig) as [
              SignalEventType,
              (typeof typeConfig)[SignalEventType],
            ][]
          ).map(([type, config]) => (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-sm border text-xs transition-colors",
                typeFilters.has(type)
                  ? "border-white/20 bg-white/5"
                  : "border-border text-muted-foreground opacity-50"
              )}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              {config.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-0">
        {filtered.map((event) => {
          const config = typeConfig[event.type];
          const Icon = config.icon;

          return (
            <div key={event.id} className="flex gap-4 py-3 border-b border-border">
              <div className="flex flex-col items-center gap-1 pt-0.5">
                <span
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: config.color }}
                />
                <div className="w-px flex-1 bg-border" />
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start gap-2">
                  <Icon
                    className="h-3.5 w-3.5 mt-0.5 flex-shrink-0"
                    style={{ color: config.color }}
                  />
                  <p className="text-sm font-medium leading-tight">
                    {event.title}
                  </p>
                  <Badge
                    variant={severityVariant[event.severity]}
                    className="ml-auto flex-shrink-0"
                  >
                    {event.severity}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground pl-5.5">
                  {event.body}
                </p>

                <div className="flex items-center gap-3 pl-5.5 text-[10px] text-muted-foreground">
                  <span>{timeAgo(event.timestamp)}</span>
                  {event.constituencyId && (
                    <Link
                      href={`/constituencies/${event.constituencyId}`}
                      className="text-nepal-red hover:underline"
                    >
                      {event.constituencyId}
                    </Link>
                  )}
                  {event.source && <span>via {event.source}</span>}
                  {event.constituencyId && (
                    <button
                      onClick={() => addToWatchlist(event.constituencyId!)}
                      className="flex items-center gap-1 hover:text-nepal-red transition-colors"
                    >
                      <Pin className="h-3 w-3" />
                      Pin
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No events match the current filters
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
