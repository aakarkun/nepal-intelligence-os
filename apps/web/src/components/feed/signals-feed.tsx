"use client";

import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Info,
  Database,
  AlertTriangle,
  StickyNote,
  Newspaper,
  Pin,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { fetchFeed, fetchSocialFeed } from "@/lib/api";
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
  note: { color: "#f59e0b", icon: StickyNote, label: "Social" },
  news: { color: "#10b981", icon: Newspaper, label: "News" },
};

const severityVariant: Record<SignalSeverity, "default" | "stale" | "error"> = {
  info: "default",
  warning: "stale",
  critical: "error",
};

export function SignalsFeed(
  props: { allowedTypes?: SignalEventType[]; socialOnly?: boolean } = {}
) {
  const { allowedTypes, socialOnly } = props;
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const visibleTypes = useMemo(
    () =>
      allowedTypes && allowedTypes.length > 0
        ? allowedTypes
        : (["official", "ingest", "anomaly", "note", "news"] as SignalEventType[]),
    [allowedTypes]
  );
  const [typeFilters, setTypeFilters] = useState<Set<SignalEventType>>(
    new Set(visibleTypes)
  );
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  useEffect(() => {
    setTypeFilters(new Set(visibleTypes));
    setSourceFilter("all");
  }, [visibleTypes]);

  const { data: feedData } = useQuery({
    queryKey: [socialOnly ? "social-feed" : "feed"],
    queryFn: () =>
      socialOnly ? fetchSocialFeed(100, 0) : fetchFeed(100, 0),
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
      if (allowedTypes && !allowedTypes.includes(e.type)) return false;
      if (!typeFilters.has(e.type)) return false;
      if (severityFilter !== "all" && e.severity !== severityFilter) return false;
      if (sourceFilter !== "all" && (e.source ?? "unknown") !== sourceFilter) return false;
      return true;
    });
  }, [allEvents, typeFilters, severityFilter, allowedTypes, sourceFilter]);

  const sourceOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const event of allEvents) {
      if (allowedTypes && !allowedTypes.includes(event.type)) continue;
      seen.add(event.source ?? "unknown");
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [allEvents, allowedTypes]);

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

        <div className="ml-auto flex items-center gap-2">
          {sourceOptions.length > 1 && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Source</span>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
              >
                <option value="all">All sources</option>
                {sourceOptions.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </label>
          )}

          {visibleTypes.length > 1 && (
            <div className="flex gap-1.5">
              {visibleTypes.map((type) => {
                const config = typeConfig[type];
                return (
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
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-0">
        {filtered.map((event) => {
          const config = typeConfig[event.type];
          let Icon = config.icon;

          const isRedditSource = event.source?.startsWith("Reddit:");
          if (event.type === "note" && isRedditSource) {
            // Lucide doesn't ship a dedicated Reddit icon in this version,
            // so use a chat/message bubble to visually distinguish Reddit.
            Icon = MessageCircle;
          }

          const isReddit = isRedditSource;
          let redditMeta: string | null = null;
          let displayBody = event.body;

          if (isReddit && event.body) {
            const lines = event.body
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean);
            if (lines.length > 1) {
              const last = lines[lines.length - 1];
              if (last.startsWith("↑")) {
                redditMeta = last;
                displayBody = lines.slice(0, -1).join("\n");
              }
            }
          }

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

                <p
                  className="text-xs text-muted-foreground pl-5.5 overflow-hidden"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 10,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {displayBody}
                </p>

                <div className="flex items-center gap-3 pl-5.5 text-[10px] text-muted-foreground">
                  <span>{timeAgo(event.timestamp)}</span>
                  {redditMeta && (
                    <span className="font-mono text-[9px] tabular-nums text-muted-foreground">
                      {redditMeta}
                    </span>
                  )}
                  {event.constituencyId && (
                    <Link
                      href={`/constituencies/${event.constituencyId}`}
                      className="text-nepal-red hover:underline"
                    >
                      {event.constituencyId}
                    </Link>
                  )}
                  {event.source && <span>via {event.source}</span>}
                  {event.url && (
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-nepal-red hover:underline"
                    >
                      Read more
                    </a>
                  )}
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
