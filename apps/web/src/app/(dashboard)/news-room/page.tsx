"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SignalEvent, SignalEventType } from "@repo/shared";
import { fetchFeed } from "@/lib/api";
import { SourceRail } from "@/components/news-room/source-rail";
import { HeadlinesList } from "@/components/news-room/headlines-list";
import { BriefingStack } from "@/components/news-room/briefing-stack";
import { useLanguage } from "@/providers/language-provider";
import { shouldShowByLanguage } from "@/lib/language-filter";

export default function NewsRoomPage() {
  const allowedTypes: SignalEventType[] = [
    "news",
    "political",
    "security",
    "economic",
    "disaster",
    "diplomatic",
    "health",
  ];

  const { language } = useLanguage();

  const { data: feedData } = useQuery({
    queryKey: ["news-room", "feed"],
    queryFn: () => fetchFeed(160, 0),
    refetchInterval: 30_000,
  });

  const events: SignalEvent[] = useMemo(() => {
    const list = feedData?.events ?? [];
    return list
      .filter((e) => allowedTypes.includes(e.type))
      .filter((e) =>
        shouldShowByLanguage(language, [e.title, e.body ?? undefined, e.source ?? undefined])
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [feedData, allowedTypes, language]);

  const sources = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) set.add(e.source ?? "Unknown source");
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [events]);

  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!selectedSource) return events;
    return events.filter((e) => (e.source ?? "Unknown source") === selectedSource);
  }, [events, selectedSource]);

  const selected = useMemo(() => {
    if (!selectedId) return filtered[0]?.id ?? null;
    return filtered.some((e) => e.id === selectedId) ? selectedId : filtered[0]?.id ?? null;
  }, [filtered, selectedId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          News Room
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Editorial desk for browsing curated news by source and topic. For operational triage, use Signals Feed.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.6fr_1fr]">
        <SourceRail sources={sources} selected={selectedSource} onSelect={setSelectedSource} />
        <HeadlinesList events={filtered} selectedId={selected} onSelect={setSelectedId} />
        <BriefingStack events={filtered} />
      </div>
    </div>
  );
}
