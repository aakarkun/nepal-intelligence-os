"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  fetchFeed,
  fetchWorldArticles,
  fetchCrisisIncidents,
} from "@/lib/api";
import { dedupeEventsByTitle } from "@/lib/utils";
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

function sortBySeverityThenTime(a: FeedItem, b: FeedItem): number {
  const sev = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
  if (sev !== 0) return sev;
  return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
}

/** Page size for `/v1/feed` on Discover (initial + each "load more" from API). */
export const DISCOVER_FEED_PAGE_SIZE = 30;
const WORLD_LIMIT = 15;
const CRISIS_SLICE = 10;
const REFRESH_INTERVAL_MS = 3 * 60 * 1000;

function mergeDiscoverItems(
  feed: FeedItem[],
  world: FeedItem[],
  crisis: FeedItem[]
): FeedItem[] {
  const merged: FeedItem[] = [];
  merged.push(...feed, ...world, ...crisis);
  const deduped = dedupeEventsByTitle(merged, (i) => new Date(i.publishedAt).getTime());
  return deduped.sort(sortBySeverityThenTime);
}

export function useDiscoverFeed() {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [worldItems, setWorldItems] = useState<FeedItem[]>([]);
  const [crisisItems, setCrisisItems] = useState<FeedItem[]>([]);
  const [feedNextOffset, setFeedNextOffset] = useState(0);
  const [feedTotal, setFeedTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newCountSinceView, setNewCountSinceView] = useState(0);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  /** For polling: detect newly appeared item ids vs previous merged snapshot. */
  const lastMergedIdsRef = useRef<Set<string>>(new Set());
  const feedItemsRef = useRef<FeedItem[]>([]);
  const worldItemsRef = useRef<FeedItem[]>([]);
  const crisisItemsRef = useRef<FeedItem[]>([]);
  useEffect(() => {
    feedItemsRef.current = feedItems;
  }, [feedItems]);
  useEffect(() => {
    worldItemsRef.current = worldItems;
  }, [worldItems]);
  useEffect(() => {
    crisisItemsRef.current = crisisItems;
  }, [crisisItems]);

  const items = useMemo(
    () => mergeDiscoverItems(feedItems, worldItems, crisisItems),
    [feedItems, worldItems, crisisItems]
  );

  const hasMoreFeed = feedNextOffset < feedTotal;

  const fetchAll = useCallback(async () => {
    const [feedResult, worldResult, crisisResult] = await Promise.allSettled([
      fetchFeed(DISCOVER_FEED_PAGE_SIZE, 0).then((r) => ({
        events: r.events.map(normalizeSignalEvent),
        total: r.total,
      })),
      fetchWorldArticles(undefined, WORLD_LIMIT).then((arr) => arr.map(normalizeWorldArticle)),
      fetchCrisisIncidents()
        .then((arr) => arr.slice(0, CRISIS_SLICE).map(normalizeCrisisIncident))
        .catch(() => [] as FeedItem[]),
    ]);

    const feedEvents =
      feedResult.status === "fulfilled"
        ? feedResult.value.events
        : feedItemsRef.current;
    const world =
      worldResult.status === "fulfilled"
        ? worldResult.value
        : worldItemsRef.current;
    const crisis =
      crisisResult.status === "fulfilled"
        ? crisisResult.value
        : crisisItemsRef.current;

    if (feedResult.status === "fulfilled") {
      setFeedItems(feedEvents);
      setFeedNextOffset(feedResult.value.events.length);
      setFeedTotal(feedResult.value.total);
    }
    if (worldResult.status === "fulfilled") setWorldItems(worldResult.value);
    if (crisisResult.status === "fulfilled") setCrisisItems(crisisResult.value);

    const merged = mergeDiscoverItems(feedEvents, world, crisis);

    if (merged.length > 0) {
      lastMergedIdsRef.current = new Set(merged.map((m) => m.id));
    }
    setLastFetchedAt(Date.now());
    setLoading(false);
    return merged;
  }, []);

  const loadMoreFeed = useCallback(async () => {
    if (loadingMore || feedNextOffset >= feedTotal) return;
    setLoadingMore(true);
    try {
      const res = await fetchFeed(DISCOVER_FEED_PAGE_SIZE, feedNextOffset);
      const normalized = res.events.map(normalizeSignalEvent);
      setFeedItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        const next = [...prev];
        for (const item of normalized) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            next.push(item);
          }
        }
        return next;
      });
      setFeedNextOffset((prev) => prev + res.events.length);
      setFeedTotal(res.total);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, feedNextOffset, feedTotal]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (loading) return;
    const t = setInterval(async () => {
      const [feedResult, worldResult, crisisResult] = await Promise.allSettled([
        fetchFeed(DISCOVER_FEED_PAGE_SIZE, 0).then((r) => ({
          events: r.events.map(normalizeSignalEvent),
          total: r.total,
        })),
        fetchWorldArticles(undefined, WORLD_LIMIT).then((arr) => arr.map(normalizeWorldArticle)),
        fetchCrisisIncidents()
          .then((arr) => arr.slice(0, CRISIS_SLICE).map(normalizeCrisisIncident))
          .catch(() => [] as FeedItem[]),
      ]);

      const feedEvents =
        feedResult.status === "fulfilled"
          ? feedResult.value.events
          : feedItemsRef.current;
      const world =
        worldResult.status === "fulfilled"
          ? worldResult.value
          : worldItemsRef.current;
      const crisis =
        crisisResult.status === "fulfilled"
          ? crisisResult.value
          : crisisItemsRef.current;

      if (feedResult.status === "fulfilled") {
        setFeedItems(feedEvents);
        setFeedNextOffset(feedResult.value.events.length);
        setFeedTotal(feedResult.value.total);
      }
      if (worldResult.status === "fulfilled") setWorldItems(worldResult.value);
      if (crisisResult.status === "fulfilled") setCrisisItems(crisisResult.value);

      const merged = mergeDiscoverItems(feedEvents, world, crisis);

      if (merged.length > 0) {
        const prev = lastMergedIdsRef.current;
        const delta = merged.filter((x) => !prev.has(x.id)).length;
        if (delta > 0) setNewCountSinceView((n) => n + delta);
        lastMergedIdsRef.current = new Set(merged.map((m) => m.id));
      }
      setLastFetchedAt(Date.now());
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(t);
  }, [loading]);

  const refreshAndScrollTop = useCallback(() => {
    setNewCountSinceView(0);
    fetchAll().then((merged) => {
      if (merged.length > 0) {
        lastMergedIdsRef.current = new Set(merged.map((m) => m.id));
      }
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, [fetchAll]);

  return {
    items,
    loading,
    loadingMore,
    hasMoreFeed,
    loadMoreFeed,
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
    return [...list].sort(sortBySeverityThenTime);
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

  return list.sort(sortBySeverityThenTime);
}
