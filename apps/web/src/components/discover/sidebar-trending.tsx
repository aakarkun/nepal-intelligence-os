"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchFeed } from "@/lib/api";
import { useMemo } from "react";
import { dedupeSignalEventsByTitle, cn } from "@/lib/utils";
import {
  DiscoverRailPanel,
  discoverSidebarSurface,
} from "@/components/discover/discover-rail-panel";
import type { SignalEventEntities } from "@repo/shared";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const MIN_ENTITIES = 3;

export function SidebarTrending({
  onTopicClick,
}: {
  onTopicClick?: (topic: string) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["feed", "trending"],
    queryFn: () => fetchFeed(100, 0),
    refetchInterval: 5 * 60 * 1000,
  });

  const trending = useMemo(() => {
    const events = dedupeSignalEventsByTitle(data?.events ?? []);
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

  if (isLoading) {
    return (
      <DiscoverRailPanel title="Trending" leadingDotClass="bg-fuchsia-500">
        <div className={cn(discoverSidebarSurface, "px-3 pt-2.5 pb-3")}>
          <div className="mb-2 h-3 w-36 rounded bg-white/[0.06]" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 7 }).map((_, idx) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={idx}
                className="h-7 w-24 rounded-md bg-white/[0.06]"
              />
            ))}
          </div>
        </div>
      </DiscoverRailPanel>
    );
  }

  if (trending.length < MIN_ENTITIES) return null;

  return (
    <DiscoverRailPanel title="Trending" leadingDotClass="bg-fuchsia-500">
      <div className={cn(discoverSidebarSurface, "px-3 pt-2.5 pb-3")}>
        <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-[#555]">
          Entities · last 6 hours
        </p>
        <div className="flex flex-wrap gap-2">
          {trending.map(({ name, count: n }) => (
            <button
              key={name}
              type="button"
              onClick={() => onTopicClick?.(name)}
              className={cn(
                "rounded-md bg-[#0c0c0c]/90 px-2 py-1 font-mono text-[12px] text-[#ccc] transition-colors",
                "hover:bg-emerald-500/15 hover:text-emerald-400/90"
              )}
            >
              {name} × {n}
            </button>
          ))}
        </div>
      </div>
    </DiscoverRailPanel>
  );
}
