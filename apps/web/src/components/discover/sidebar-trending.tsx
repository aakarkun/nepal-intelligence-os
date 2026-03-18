"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchFeed } from "@/lib/api";
import { useMemo } from "react";
import type { SignalEventEntities } from "@repo/shared";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const MIN_ENTITIES = 3;

export function SidebarTrending({
  onTopicClick,
}: {
  onTopicClick?: (topic: string) => void;
}) {
  const { data } = useQuery({
    queryKey: ["feed", "trending"],
    queryFn: () => fetchFeed(100, 0),
    refetchInterval: 5 * 60 * 1000,
  });

  const trending = useMemo(() => {
    const events = data?.events ?? [];
    const cutoff = Date.now() - SIX_HOURS_MS;
    const recent = events.filter(
      (e) => new Date(e.timestamp).getTime() >= cutoff
    );
    const count = new Map<string, number>();

    function add(entity: string) {
      if (!entity?.trim()) return;
      const key = entity.trim();
      count.set(key, (count.get(key) ?? 0) + 1);
    }

    recent.forEach((e) => {
      const entities = (e as { entities?: SignalEventEntities }).entities;
      if (entities) {
        entities.people?.forEach(add);
        entities.parties?.forEach(add);
        entities.districts?.forEach(add);
      }
    });

    return Array.from(count.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, n]) => ({ name, count: n }));
  }, [data?.events]);

  if (trending.length < MIN_ENTITIES) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-medium text-foreground">Trending</h3>
      <p className="mt-0.5 text-[10px] text-muted-foreground">
        Based on signals from the last 6 hours
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {trending.map(({ name, count: n }) => (
          <button
            key={name}
            type="button"
            onClick={() => onTopicClick?.(name)}
            className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-nepal-red/50 hover:bg-nepal-red/10"
          >
            {name} × {n}
          </button>
        ))}
      </div>
    </div>
  );
}
