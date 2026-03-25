"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronDown } from "@/components/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDiscoverFeed, filterAndSortFeed, type DiscoverTab, type DiscoverTopicFilter } from "@/hooks/use-discover-feed";
import { FeedItemCard } from "@/components/discover/feed-item-card";
import { TopicSelector, getPreferredTopics } from "@/components/discover/topic-selector";
import { SidebarWeather } from "@/components/discover/sidebar-weather";
import { SidebarMarket } from "@/components/discover/sidebar-market";
import { SidebarAlerts } from "@/components/discover/sidebar-alerts";
import { SidebarTrending } from "@/components/discover/sidebar-trending";
import { EmailPromptModal } from "@/components/discover/email-prompt-modal";
import { getReactionsBatch } from "@/lib/api";
import { getFingerprint } from "@/lib/fingerprint";
import type { ReactionStatus } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/providers/language-provider";
import { shouldShowByLanguage } from "@/lib/language-filter";

const TOPICS: { id: DiscoverTopicFilter; label: string }[] = [
  { id: "political", label: "Politics" },
  { id: "economic", label: "Economy" },
  { id: "disaster", label: "Crisis" },
  { id: "diplomatic", label: "Diplomatic" },
  { id: "security", label: "Security" },
  { id: "health", label: "Health" },
  { id: "world", label: "World" },
];

const TOPIC_COLORS: Record<DiscoverTopicFilter, string> = {
  political: "#60a5fa",
  economic: "#34d399",
  disaster: "#fb923c",
  diplomatic: "#a78bfa",
  security: "#f87171",
  health: "#f472b6",
  world: "#a78bfa",
};

function DiscoverSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-5 w-3/4 rounded bg-white/[0.06]" />
          <div className="h-3 w-1/2 rounded bg-white/[0.06]" />
          <div className="mt-2 h-3 w-full rounded bg-white/[0.06]" />
          <div className="h-3 w-2/3 rounded bg-white/[0.06]" />
        </div>
        <div className="h-40 w-48 shrink-0 rounded-lg bg-white/[0.06]" />
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="overflow-hidden"
          >
            <div className="h-32 rounded-lg bg-white/[0.03]" />
            <div className="space-y-2 px-4 pt-3 pb-4">
              <div className="h-3 w-full rounded bg-white/[0.06]" />
              <div className="h-3 w-2/3 rounded bg-white/[0.06]" />
              <div className="h-2.5 w-1/2 rounded bg-white/[0.06]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  const { items, loading, newCountSinceView, refreshAndScrollTop } = useDiscoverFeed();
  const { language } = useLanguage();
  const [tab, setTab] = useState<DiscoverTab>("for-you");
  const [topicFilter, setTopicFilter] = useState<DiscoverTopicFilter | null>(null);
  const [topicsOpen, setTopicsOpen] = useState(false);
  const [preferredTypes, setPreferredTypes] = useState<ReturnType<typeof getPreferredTopics>>([]);
  const [trendingKeyword, setTrendingKeyword] = useState<string | null>(null);
  const [reactionsMap, setReactionsMap] = useState<Record<string, ReactionStatus>>({});
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  useEffect(() => {
    setPreferredTypes(getPreferredTopics());
  }, []);

  const displayItems = useMemo(() => {
    const effectiveTab = topicFilter != null ? "topics" : tab;
    const languageFilteredItems = items.filter((i) =>
      shouldShowByLanguage(language, [i.title, i.summary, i.source])
    );
    let list = filterAndSortFeed(
      languageFilteredItems,
      effectiveTab,
      topicFilter,
      preferredTypes
    );
    if (trendingKeyword?.trim()) {
      const k = trendingKeyword.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(k) ||
          (i.summary?.toLowerCase().includes(k) ?? false)
      );
    }
    return list.slice(0, 30);
  }, [items, tab, topicFilter, preferredTypes, trendingKeyword, language]);

  const displayItemIds = useMemo(() => displayItems.map((i) => i.id), [displayItems]);
  const displayItemIdsKey = displayItemIds.join(",");

  const refetchReactions = useCallback(() => {
    if (displayItemIds.length === 0) return;
    const fp = getFingerprint();
    getReactionsBatch(displayItemIds, fp).then(setReactionsMap).catch(() => {});
  }, [displayItemIdsKey]);

  // Fetch reaction counts/liked state whenever we have visible item ids (e.g. after feed loads on reload)
  useEffect(() => {
    if (displayItemIds.length === 0) return;
    const fp = getFingerprint();
    getReactionsBatch(displayItemIds, fp).then(setReactionsMap).catch(() => {});
  }, [displayItemIdsKey, loading]);

  const heroItem = displayItems.find((i) => i.severity === "critical") ?? displayItems[0];
  const gridItems = displayItems.filter((i) => i.id !== heroItem?.id).slice(0, 30);

  return (
    <div
      className={cn(
        "-mx-4 flex w-full gap-6 px-4 pb-10 antialiased md:-mx-6 md:pl-6 md:pr-0",
        "min-h-full bg-background text-[#e5e5e5]"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="border-b border-white/10 pb-4 pt-2">
          <h1 className="font-mono text-lg uppercase tracking-[0.2em] text-[#e5e5e5]">
            Discover
          </h1>
          <p className="mt-1 font-mono text-[12px] uppercase tracking-wider text-[#888]">
            Curated signals · Nepal Intelligence OS
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 overflow-x-auto md:flex-nowrap">
          <button
            type="button"
            onClick={() => setTab("for-you")}
            className={cn(
              "rounded-md px-3 py-1.5 font-mono text-[13px] uppercase tracking-wider transition-colors",
              tab === "for-you" && !topicFilter
                ? "bg-emerald-500/15 text-emerald-400/90"
                : "text-[#888] hover:bg-white/[0.06] hover:text-[#ccc]"
            )}
          >
            For You
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("top");
              setTopicFilter(null);
            }}
            className={cn(
              "rounded-md px-3 py-1.5 font-mono text-[13px] uppercase tracking-wider transition-colors",
              tab === "top"
                ? "bg-emerald-500/15 text-emerald-400/90"
                : "text-[#888] hover:bg-white/[0.06] hover:text-[#ccc]"
            )}
          >
            Top
          </button>
          <Popover open={topicsOpen} onOpenChange={setTopicsOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex items-center gap-1 rounded-md px-3 py-1.5 font-mono text-[13px] uppercase tracking-wider transition-colors",
                  (tab === "topics" || topicFilter != null)
                    ? "bg-emerald-500/15 text-emerald-400/90"
                    : "text-[#888] hover:bg-white/[0.06] hover:text-[#ccc]"
                )}
                style={
                  topicFilter != null && TOPIC_COLORS[topicFilter]
                    ? { borderLeft: `3px solid ${TOPIC_COLORS[topicFilter]}` }
                    : undefined
                }
              >
                {topicFilter != null
                  ? TOPICS.find((t) => t.id === topicFilter)?.label ?? "Topics"
                  : "Topics"}{" "}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-48 bg-[#0c0c0c] p-0 text-[#ccc] shadow-xl shadow-black/50"
              align="start"
              sideOffset={4}
            >
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setTab("for-you");
                    setTopicFilter(null);
                    setTopicsOpen(false);
                  }}
                  className={cn(
                    "w-full px-3 py-2 text-left font-mono text-[13px]",
                    !topicFilter
                      ? "bg-emerald-500/10 text-emerald-400/90"
                      : "hover:bg-white/[0.06]"
                  )}
                >
                  All
                </button>
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
                      "w-full px-3 py-2 text-left font-mono text-[13px]",
                      topicFilter === id ? "" : "hover:bg-white/[0.06]"
                    )}
                    style={
                      topicFilter === id && TOPIC_COLORS[id]
                        ? {
                            backgroundColor: `${TOPIC_COLORS[id]}18`,
                            borderLeft: `3px solid ${TOPIC_COLORS[id]}`,
                          }
                        : undefined
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {newCountSinceView > 0 && (
          <button
            type="button"
            onClick={refreshAndScrollTop}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#181818]/60 px-3 py-1.5 font-mono text-[12px] uppercase tracking-wider text-[#a1a1aa] transition-colors hover:bg-white/[0.06] hover:text-[#e5e5e5]"
          >
            ↑ {newCountSinceView} new {newCountSinceView === 1 ? "story" : "stories"} — refresh
          </button>
        )}

        <div className="mt-6">
          {loading ? (
            <DiscoverSkeleton />
          ) : displayItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              {topicFilter != null ? (
                <>
                  <p className="font-mono text-[13px] uppercase tracking-wider text-[#a1a1aa]">
                    No {TOPICS.find((t) => t.id === topicFilter)?.label?.toLowerCase() ?? "topic"}{" "}
                    stories right now
                  </p>
                  <p className="mt-2 font-mono text-[12px] text-[#666]">
                    Try another topic or switch to For You.
                  </p>
                </>
              ) : (
                <>
                  <span className="text-2xl opacity-80" aria-hidden>
                    📡
                  </span>
                  <p className="mt-2 font-mono text-[13px] uppercase tracking-wider text-[#a1a1aa]">
                    No signals yet
                  </p>
                  <p className="mt-2 max-w-sm font-mono text-[12px] leading-relaxed text-[#666]">
                    The worker fetches data every few minutes. Check back shortly or visit{" "}
                    <Link href="/feed" className="text-emerald-400/90 underline-offset-2 hover:underline">
                      Signals Feed
                    </Link>
                    .
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {heroItem && (
                <FeedItemCard
                  item={heroItem}
                  variant="hero"
                  reactionInitial={reactionsMap[heroItem.id]}
                  onEmailPrompt={() => setEmailModalOpen(true)}
                  onReactionChange={refetchReactions}
                />
              )}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {gridItems.map((item) => (
                  <FeedItemCard
                    key={item.id}
                    item={item}
                    variant="grid"
                    reactionInitial={reactionsMap[item.id]}
                    onEmailPrompt={() => setEmailModalOpen(true)}
                    onReactionChange={refetchReactions}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <EmailPromptModal open={emailModalOpen} onOpenChange={setEmailModalOpen} />

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
