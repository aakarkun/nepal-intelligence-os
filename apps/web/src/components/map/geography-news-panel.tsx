"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SignalEvent, SignalEventType, SignalSeverity } from "@repo/shared";
import { PROVINCES } from "@repo/shared";
import { fetchFeed } from "@/lib/api";
import { useLanguage } from "@/providers/language-provider";
import { shouldShowByLanguage } from "@/lib/language-filter";
import { useRealtimeStore } from "@/stores/realtime-store";
import { cn, dedupeSignalEventsByTitle, timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type GeographySelection =
  | { type: "district"; districtName: string }
  | { type: "province"; provinceId: number }
  | null;

const typeConfig: Record<
  SignalEventType,
  { color: string; label: string }
> = {
  official: { color: "#3b82f6", label: "Official" },
  ingest: { color: "#6b7280", label: "Ingest" },
  anomaly: { color: "#ef4444", label: "Anomaly" },
  note: { color: "#f59e0b", label: "Social" },
  news: { color: "#94a3b8", label: "News" },
  political: { color: "#60a5fa", label: "Political" },
  security: { color: "#f87171", label: "Security" },
  economic: { color: "#34d399", label: "Economic" },
  disaster: { color: "#fb923c", label: "Disaster" },
  diplomatic: { color: "#a78bfa", label: "Diplomatic" },
  health: { color: "#f472b6", label: "Health" },
};

const ALL_TYPES: SignalEventType[] = [
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
];

const severityVariant: Record<SignalSeverity, "default" | "stale" | "error"> = {
  info: "default",
  warning: "stale",
  critical: "error",
};

function normalizeText(input: string | null | undefined): string {
  return (input ?? "").toLowerCase().trim();
}

function eventHaystack(event: SignalEvent): string {
  return normalizeText(`${event.title} ${event.body ?? ""} ${event.source ?? ""}`);
}

function eventMatchesDistrict(event: SignalEvent, districtName: string): boolean {
  const district = normalizeText(districtName);
  if (!district) return false;

  const entities = event.entities?.districts ?? [];
  if (entities.some((d) => normalizeText(d) === district)) return true;

  return eventHaystack(event).includes(district);
}

function eventMatchesProvince(event: SignalEvent, provinceId: number): boolean {
  // Frontend model: `districtId` is used to carry `province` from the DB layer.
  if (event.districtId === provinceId) return true;
  const province = PROVINCES.find((p) => p.id === provinceId)?.name;
  if (!province) return false;
  return eventHaystack(event).includes(normalizeText(province));
}

function matchesFocusedGeography(event: SignalEvent, selection: Exclude<GeographySelection, null>): boolean {
  if (selection.type === "district") return eventMatchesDistrict(event, selection.districtName);
  return eventMatchesProvince(event, selection.provinceId);
}

export function GeographyNewsPanel({ selection }: { selection: GeographySelection }) {
  const { language } = useLanguage();
  const sseEvents = useRealtimeStore((s) => s.recentEvents);

  const { data: feedData } = useQuery({
    queryKey: ["map-geography-news", "feed"],
    queryFn: () => fetchFeed(200, 0),
    refetchInterval: 30_000,
  });

  type NewsBadge = "focused_all" | "economic" | SignalEventType;
  const [badge, setBadge] = useState<NewsBadge>("focused_all");

  const allEvents: SignalEvent[] = useMemo(() => {
    const apiEvents = feedData?.events ?? [];
    const merged = new Map<string, SignalEvent>();
    for (const e of [...apiEvents, ...sseEvents]) merged.set(e.id, e);
    return dedupeSignalEventsByTitle(
      Array.from(merged.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    );
  }, [feedData, sseEvents]);

  const filteredEvents: SignalEvent[] = useMemo(() => {
    if (!selection) return [];

    const focusedSelection = selection as Exclude<GeographySelection, null>;

    return allEvents.filter((event) => {
      if (!shouldShowByLanguage(language, [event.title, event.body, event.source]))
        return false;

      const isEconomic = event.type === "economic";
      const matchesType = (() => {
        if (badge === "focused_all") return !isEconomic;
        if (badge === "economic") return isEconomic;
        return event.type === badge;
      })();

      if (!matchesType) return false;

      // Geography focus applies to everything except economic (NEPSE-like global items).
      if (badge === "economic" || isEconomic) return true;

      return matchesFocusedGeography(event, focusedSelection);
    });
  }, [allEvents, selection, badge, language]);

  const badgeButtons: Array<{ key: NewsBadge; label: string; color?: string }> = useMemo(
    () => [
      { key: "focused_all", label: "Focused All" },
      ...ALL_TYPES.map((t) => ({
        key: t,
        label: typeConfig[t].label,
        color: typeConfig[t].color,
      })),
    ],
    []
  );

  if (!selection) {
    return (
      <div className="text-sm text-muted-foreground">
        Select a district or province to see focused signals.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="text-sm font-semibold">News & signals</div>
        <div className="text-xs text-muted-foreground">
          Filtered to the selected geography (economic is global and controlled by the badge).
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {badgeButtons.map((b) => {
          const active = badge === b.key;
          const color = b.color ?? "#94a3b8";

          return (
            <button
              key={b.key}
              type="button"
              onClick={() => setBadge(b.key)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-nepal-red/60 bg-nepal-red/10 text-nepal-red"
                  : "border-border bg-background/0 text-muted-foreground hover:bg-muted/40"
              )}
              style={
                active && b.color
                  ? { borderColor: color, color: color, backgroundColor: `${color}20` }
                  : undefined
              }
            >
              {b.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-0">
        {filteredEvents.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No events match the current filter.
          </div>
        ) : (
          filteredEvents.map((event) => {
            const config = typeConfig[event.type];
            const severity = severityVariant[event.severity];
            return (
              <div
                key={event.id}
                className="flex gap-4 py-3 border-b border-border"
              >
                <div className="flex flex-col items-center gap-1 pt-0.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: config.color }}
                  />
                  <div className="w-px flex-1 bg-border" />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-start gap-2">
                    <span
                      className="rounded-md border px-2 py-0.5 text-[12px] font-semibold uppercase tracking-wide"
                      style={{ borderColor: config.color, color: config.color }}
                    >
                      {config.label}
                    </span>
                    <Badge variant={severity}>{event.severity}</Badge>
                    <p className="text-sm font-medium leading-tight min-w-0 flex-1">
                      {event.title}
                    </p>
                  </div>

                  {event.body ? (
                    <p
                      className="text-xs text-muted-foreground overflow-hidden"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 5,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {event.body}
                    </p>
                  ) : null}

                  <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
                    <span>{timeAgo(event.timestamp)}</span>
                    {event.source ? <span>via {event.source}</span> : null}
                    {event.url ? (
                      <a
                        href={event.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-nepal-red hover:underline"
                      >
                        Read more
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

