"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useDiscoverFeed, filterAndSortFeed, type DiscoverTab, type DiscoverTopicFilter } from "@/hooks/use-discover-feed";
import { FeedItemCard } from "@/components/discover/feed-item-card";
import { TopicSelector, getPreferredTopics } from "@/components/discover/topic-selector";
import { SidebarWeather } from "@/components/discover/sidebar-weather";
import { SidebarMarket } from "@/components/discover/sidebar-market";
import { SidebarAlerts } from "@/components/discover/sidebar-alerts";
import { SidebarTrending } from "@/components/discover/sidebar-trending";
import { cn } from "@/lib/utils";

const TOPICS: { id: DiscoverTopicFilter; label: string }[] = [
  { id: "political", label: "Politics" },
  { id: "economic", label: "Economy" },
  { id: "disaster", label: "Crisis" },
  { id: "diplomatic", label: "Diplomatic" },
  { id: "security", label: "Security" },
  { id: "health", label: "Health" },
  { id: "world", label: "World" },
];

function DiscoverSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-48 animate-pulse rounded bg-muted" />
      <div className="flex gap-2">
        <div className="h-9 w-24 animate-pulse rounded bg-muted" />
        <div className="h-9 w-16 animate-pulse rounded bg-muted" />
        <div className="h-9 w-20 animate-pulse rounded bg-muted" />
      </div>
      <div
        className="animate-shimmer rounded-lg border border-border bg-card p-5"
        style={{
          background: "linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%)",
          backgroundSize: "200% 100%",
        }}
      >
        <div className="flex gap-4">
          <div className="flex-1 space-y-2">
            <div className="h-6 w-3/4 rounded bg-white/10" />
            <div className="h-4 w-1/2 rounded bg-white/10" />
            <div className="mt-2 h-4 w-full rounded bg-white/10" />
            <div className="h-4 w-2/3 rounded bg-white/10" />
          </div>
          <div className="h-40 w-48 rounded-md bg-white/10" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="animate-shimmer overflow-hidden rounded-lg border border-border bg-card"
            style={{
              background: "linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%)",
              backgroundSize: "200% 100%",
            }}
          >
            <div className="h-32 bg-white/10" />
            <div className="space-y-2 p-3">
              <div className="h-4 w-full rounded bg-white/10" />
              <div className="h-4 w-2/3 rounded bg-white/10" />
              <div className="h-3 w-1/2 rounded bg-white/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  const { items, loading, newCountSinceView, refreshAndScrollTop } = useDiscoverFeed();
  const [tab, setTab] = useState<DiscoverTab>("for-you");
  const [topicFilter, setTopicFilter] = useState<DiscoverTopicFilter | null>(null);
  const [topicsOpen, setTopicsOpen] = useState(false);
  const [preferredTypes, setPreferredTypes] = useState<ReturnType<typeof getPreferredTopics>>([]);
  const [trendingKeyword, setTrendingKeyword] = useState<string | null>(null);

  useEffect(() => {
    setPreferredTypes(getPreferredTopics());
  }, []);

  const displayItems = useMemo(() => {
    let list = filterAndSortFeed(items, tab, topicFilter, preferredTypes);
    if (trendingKeyword?.trim()) {
      const k = trendingKeyword.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(k) ||
          (i.summary?.toLowerCase().includes(k) ?? false)
      );
    }
    return list.slice(0, 30);
  }, [items, tab, topicFilter, preferredTypes, trendingKeyword]);

  const heroItem = displayItems.find((i) => i.severity === "critical") ?? displayItems[0];
  const gridItems = displayItems.filter((i) => i.id !== heroItem?.id).slice(0, 30);

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-6">
      {/* Center column: Discover feed */}
      <div className="min-w-0 flex-1 max-w-3xl">
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
          Discover
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-2 overflow-x-auto md:flex-nowrap">
          <button
            type="button"
            onClick={() => setTab("for-you")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === "for-you"
                ? "bg-nepal-red/15 text-nepal-red"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            For You
          </button>
          <button
            type="button"
            onClick={() => setTab("top")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === "top"
                ? "bg-nepal-red/15 text-nepal-red"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Top
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setTopicsOpen((o) => !o)}
              className={cn(
                "flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                tab === "topics"
                  ? "bg-nepal-red/15 text-nepal-red"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Topics <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {topicsOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  aria-hidden
                  onClick={() => setTopicsOpen(false)}
                />
                <div className="absolute left-0 top-full z-50 mt-1 min-w-[10rem] rounded-md border border-border bg-card py-1 shadow-md">
                  {TOPICS.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setTab("topics");
                        setTopicFilter(id);
                        setTopicsOpen(false);
                      }}
                      className={cn(
                        "w-full px-3 py-2 text-left text-sm",
                        topicFilter === id ? "bg-nepal-red/10 text-nepal-red" : "hover:bg-muted"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {newCountSinceView > 0 && (
          <button
            type="button"
            onClick={refreshAndScrollTop}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          >
            ↑ {newCountSinceView} new {newCountSinceView === 1 ? "story" : "stories"} — click to refresh
          </button>
        )}

        {loading ? (
          <DiscoverSkeleton />
        ) : displayItems.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-4 py-12 text-center">
            {tab === "topics" && topicFilter ? (
              <>
                <p className="font-medium text-foreground">No items in this topic</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try another topic or switch to For You.
                </p>
              </>
            ) : (
              <>
                <span className="text-2xl" aria-hidden>📡</span>
                <p className="mt-2 font-medium text-foreground">No signals yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  The worker fetches data every few minutes. Check back shortly or visit{" "}
                  <Link href="/feed" className="text-nepal-red hover:underline">Signals Feed</Link>.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {heroItem && (
              <FeedItemCard item={heroItem} variant="hero" />
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {gridItems.map((item) => (
                <FeedItemCard key={item.id} item={item} variant="grid" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right sidebar: widgets (hidden below lg) */}
      <aside className="hidden w-[320px] flex-shrink-0 space-y-4 lg:block">
        <TopicSelector
          onSave={(tops) => setPreferredTypes(tops)}
        />
        <SidebarWeather />
        <SidebarMarket />
        <SidebarAlerts />
        <SidebarTrending onTopicClick={(keyword) => setTrendingKeyword(keyword)} />
      </aside>
    </div>
  );
}
