"use client";

import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector, useDispatch } from "react-redux";
import {
  Info,
  Database,
  AlertTriangle,
  StickyNote,
  Newspaper,
  Pin,
  MessageCircle,
  Landmark,
  Shield,
  TrendingUp,
  Mountain,
  Globe,
  Heart,
} from "@/components/icons";
import Link from "next/link";
import { fetchFeed, fetchSocialFeed } from "@/lib/api";
import { useRealtimeStore } from "@/stores/realtime-store";
import { cn, dedupeSignalEventsByTitle, timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RootState } from "@/store";
import { setTypeFilter } from "@/store/slices/uiSlice";
import type { SignalEvent, SignalSeverity, SignalEventType } from "@repo/shared";

const typeConfig: Record<
  SignalEventType,
  { color: string; icon: typeof Info; label: string }
> = {
  official: { color: "#3b82f6", icon: Info, label: "Official" },
  ingest: { color: "#6b7280", icon: Database, label: "Ingest" },
  anomaly: { color: "#ef4444", icon: AlertTriangle, label: "Anomaly" },
  note: { color: "#f59e0b", icon: StickyNote, label: "Social" },
  news: { color: "#94a3b8", icon: Newspaper, label: "News" },
  political: { color: "#60a5fa", icon: Landmark, label: "Political" },
  security: { color: "#f87171", icon: Shield, label: "Security" },
  economic: { color: "#34d399", icon: TrendingUp, label: "Economic" },
  disaster: { color: "#fb923c", icon: Mountain, label: "Disaster" },
  diplomatic: { color: "#a78bfa", icon: Globe, label: "Diplomatic" },
  health: { color: "#f472b6", icon: Heart, label: "Health" },
};

/** Resolve config for event type; fall back to news for unknown/legacy types. */
function getTypeConfig(type: string): (typeof typeConfig)[SignalEventType] {
  return typeConfig[type as SignalEventType] ?? typeConfig.news;
}

const severityVariant: Record<SignalSeverity, "default" | "stale" | "error"> = {
  info: "default",
  warning: "stale",
  critical: "error",
};

const DOMAIN_TYPES: SignalEventType[] = [
  "political",
  "security",
  "economic",
  "disaster",
  "diplomatic",
  "health",
  "news",
];

export function SignalsFeed(
  props: { allowedTypes?: SignalEventType[]; socialOnly?: boolean } = {}
) {
  const { allowedTypes, socialOnly } = props;
  const dispatch = useDispatch();
  const typeFilter = useSelector((s: RootState) => s.ui.typeFilter);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const visibleTypes = useMemo(
    () =>
      allowedTypes && allowedTypes.length > 0
        ? allowedTypes
        : ([
            "official",
            "ingest",
            "anomaly",
            "note",
            "news",
            "political",
            "security",
            "economic",
            "disaster",
            "diplomatic",
            "health",
          ] as SignalEventType[]),
    [allowedTypes]
  );
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const { data: feedData } = useQuery({
    queryKey: [
      socialOnly ? "social-feed" : "feed",
      typeFilter,
      severityFilter,
    ],
    queryFn: () =>
      socialOnly
        ? fetchSocialFeed(100, 0, typeFilter === "all" ? undefined : typeFilter, severityFilter === "all" ? undefined : severityFilter)
        : fetchFeed(100, 0, typeFilter === "all" ? undefined : typeFilter, severityFilter === "all" ? undefined : severityFilter),
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
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      if (severityFilter !== "all" && e.severity !== severityFilter) return false;
      if (sourceFilter !== "all" && (e.source ?? "unknown") !== sourceFilter) return false;
      return true;
    });
  }, [allEvents, typeFilter, severityFilter, allowedTypes, sourceFilter]);

  const displayEvents = useMemo(
    () => dedupeSignalEventsByTitle(filtered),
    [filtered]
  );

  const sourceOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const event of allEvents) {
      if (allowedTypes && !allowedTypes.includes(event.type)) continue;
      seen.add(event.source ?? "unknown");
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [allEvents, allowedTypes]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <Tabs value={severityFilter} onValueChange={setSeverityFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="critical">Critical</TabsTrigger>
            <TabsTrigger value="warning">Warning</TabsTrigger>
            <TabsTrigger value="info">Info</TabsTrigger>
          </TabsList>
        </Tabs>

        {sourceOptions.length > 1 && (
          <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
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
      </div>

      {visibleTypes.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => dispatch(setTypeFilter("all"))}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-sm border text-xs transition-colors",
              typeFilter === "all"
                ? "border-white/20 bg-white/5"
                : "border-border text-muted-foreground opacity-50 hover:opacity-80"
            )}
          >
            All Types
          </button>
          {DOMAIN_TYPES.filter((t) => visibleTypes.includes(t)).map((type) => {
            const config = typeConfig[type];
            const isActive = typeFilter === type;
            return (
              <button
                key={type}
                onClick={() => dispatch(setTypeFilter(type))}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-sm border text-xs transition-colors",
                  isActive
                    ? "border-white/20 bg-white/5"
                    : "border-border text-muted-foreground opacity-50 hover:opacity-80"
                )}
                style={isActive ? { borderColor: config.color } : undefined}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: config.color }}
                />
                {config.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="space-y-0">
        {displayEvents.map((event) => {
          const config = getTypeConfig(event.type);
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
                <div className="flex items-start gap-2 flex-wrap">
                  <Icon
                    className="h-3.5 w-3.5 mt-0.5 flex-shrink-0"
                    style={{ color: config.color }}
                  />
                  <p className="text-sm font-medium leading-tight min-w-0 flex-1">
                    {event.title}
                  </p>
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[12px] font-medium flex-shrink-0"
                    style={{
                      backgroundColor: `${config.color}20`,
                      color: config.color,
                      borderLeft: `2px solid ${config.color}`,
                    }}
                  >
                    {config.label}
                  </span>
                  <Badge
                    variant={severityVariant[event.severity]}
                    className="flex-shrink-0"
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

                <div className="flex items-center gap-3 pl-5.5 text-[12px] text-muted-foreground">
                  <span>{timeAgo(event.timestamp)}</span>
                  {redditMeta && (
                    <span className="font-sans text-[11px] tabular-nums text-muted-foreground">
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

        {displayEvents.length === 0 && (
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
