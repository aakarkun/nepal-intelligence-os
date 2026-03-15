"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  fetchFeed,
  fetchWorldArticles,
  fetchCrisisIncidents,
} from "@/lib/api";
import type { SignalEventType } from "@repo/shared";

export type FeedItemSeverity = "critical" | "warning" | "info";

export interface FeedItem {
  id: string;
  title: string;
  summary?: string;
  source: string;
  sourceCount?: number;
  publishedAt: string;
  type: SignalEventType;
  severity: FeedItemSeverity;
  imageUrl?: string;
  url?: string;
  panel?: string;
}

const SEVERITY_ORDER: Record<FeedItemSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

function normalizeSignalEvent(e: {
  id: string;
  title: string;
  body?: string;
  timestamp: string;
  type: string;
  severity: string;
  source?: string;
  url?: string;
}): FeedItem {
  return {
    id: e.id,
    title: e.title,
    summary: e.body?.slice(0, 280),
    source: e.source ?? "Unknown",
    sourceCount: 1,
    publishedAt: e.timestamp,
    type: e.type as SignalEventType,
    severity: (e.severity === "critical" || e.severity === "warning" ? e.severity : "info") as FeedItemSeverity,
    url: e.url,
  };
}

function normalizeWorldArticle(a: {
  id: string;
  title: string;
  url: string;
  source: string;
  panel: string;
  publishedAt: string;
  imageUrl?: string | null;
}): FeedItem {
  return {
    id: `world-${a.id}`,
    title: a.title,
    source: a.source,
    sourceCount: 1,
    publishedAt: a.publishedAt,
    type: "diplomatic",
    severity: "info",
    imageUrl: a.imageUrl ?? undefined,
    url: a.url,
    panel: a.panel,
  };
}

function normalizeCrisisIncident(c: {
  id: string;
  title: string;
  timestamp: string;
  sourceId: string;
  url?: string;
}): FeedItem {
  return {
    id: `crisis-${c.id}`,
    title: c.title,
    source: c.sourceId,
    sourceCount: 1,
    publishedAt: c.timestamp,
    type: "disaster",
    severity: "warning",
    url: c.url,
  };
}

function dedupeByTitle(items: FeedItem[], titleKeyLen = 40): FeedItem[] {
  const seen = new Map<string, FeedItem>();
  for (const item of items) {
    const key = item.title.slice(0, titleKeyLen).toLowerCase().trim();
    const existing = seen.get(key);
    if (!existing || new Date(item.publishedAt) > new Date(existing.publishedAt)) {
      seen.set(key, item);
    }
  }
  return Array.from(seen.values());
}

function sortBySeverityThenTime(a: FeedItem, b: FeedItem): number {
  const sev = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
  if (sev !== 0) return sev;
  return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
}

const FEED_LIMIT = 30;
const REFRESH_INTERVAL_MS = 3 * 60 * 1000;

export function useDiscoverFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCountSinceView, setNewCountSinceView] = useState(0);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);

  const fetchAll = useCallback(async () => {
    const controller = new AbortController();
    const signal = controller.signal;

    const [feedResult, worldResult, crisisResult] = await Promise.allSettled([
      fetchFeed(FEED_LIMIT, 0).then((r) => r.events.map(normalizeSignalEvent)),
      fetchWorldArticles(undefined, 15).then((arr) => arr.map(normalizeWorldArticle)),
      fetchCrisisIncidents()
        .then((arr) => arr.slice(0, 10).map(normalizeCrisisIncident))
        .catch(() => [] as FeedItem[]),
    ]);

    const merged: FeedItem[] = [];
    if (feedResult.status === "fulfilled") merged.push(...feedResult.value);
    if (worldResult.status === "fulfilled") merged.push(...worldResult.value);
    if (crisisResult.status === "fulfilled") merged.push(...crisisResult.value);

    const deduped = dedupeByTitle(merged);
    const sorted = deduped.sort(sortBySeverityThenTime);

    setItems(sorted);
    setLastFetchedAt(Date.now());
    setLoading(false);
    return sorted;
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (loading) return;
    const t = setInterval(async () => {
      const controller = new AbortController();
      const [feedResult, worldResult, crisisResult] = await Promise.allSettled([
        fetchFeed(FEED_LIMIT, 0).then((r) => r.events.map(normalizeSignalEvent)),
        fetchWorldArticles(undefined, 15).then((arr) => arr.map(normalizeWorldArticle)),
        fetchCrisisIncidents()
          .then((arr) => arr.slice(0, 10).map(normalizeCrisisIncident))
          .catch(() => [] as FeedItem[]),
      ]);
      const merged: FeedItem[] = [];
      if (feedResult.status === "fulfilled") merged.push(...feedResult.value);
      if (worldResult.status === "fulfilled") merged.push(...worldResult.value);
      if (crisisResult.status === "fulfilled") merged.push(...crisisResult.value);
      const deduped = dedupeByTitle(merged);
      const sorted = deduped.sort(sortBySeverityThenTime);
      setItems((prev) => {
        const prevIds = new Set(prev.map((i) => i.id));
        const newItems = sorted.filter((x) => !prevIds.has(x.id));
        setNewCountSinceView((n) => n + newItems.length);
        return sorted;
      });
      setLastFetchedAt(Date.now());
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(t);
  }, [loading]);

  const refreshAndScrollTop = useCallback(() => {
    setNewCountSinceView(0);
    fetchAll().then(() => {
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, [fetchAll]);

  return {
    items,
    loading,
    newCountSinceView,
    lastFetchedAt,
    refreshAndScrollTop,
    refetch: fetchAll,
  };
}

export type DiscoverTab = "for-you" | "top" | "topics";
export type DiscoverTopicFilter =
  | "political"
  | "economic"
  | "disaster"
  | "diplomatic"
  | "security"
  | "health"
  | "world";

const TOPIC_TO_TYPE: Record<Exclude<DiscoverTopicFilter, "world">, SignalEventType> = {
  political: "political",
  economic: "economic",
  disaster: "disaster",
  diplomatic: "diplomatic",
  security: "security",
  health: "health",
};

export function filterAndSortFeed(
  items: FeedItem[],
  tab: DiscoverTab,
  topicFilter: DiscoverTopicFilter | null,
  preferredTypes: SignalEventType[]
): FeedItem[] {
  let list = items;

  if (tab === "topics" && topicFilter) {
    if (topicFilter === "world") {
      list = items.filter((i) => i.panel != null);
    } else {
      const type = TOPIC_TO_TYPE[topicFilter];
      list = items.filter((i) => i.type === type);
    }
  }

  if (tab === "top") {
    return list.slice(0, FEED_LIMIT).sort(sortBySeverityThenTime);
  }

  if (tab === "for-you" && preferredTypes.length > 0) {
    list = [...list].sort((a, b) => {
      const aPrefer = preferredTypes.indexOf(a.type);
      const bPrefer = preferredTypes.indexOf(b.type);
      if (aPrefer >= 0 && bPrefer < 0) return -1;
      if (aPrefer < 0 && bPrefer >= 0) return 1;
      if (aPrefer >= 0 && bPrefer >= 0) return aPrefer - bPrefer;
      return sortBySeverityThenTime(a, b);
    });
  }

  return list.slice(0, FEED_LIMIT);
}
