"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Radio, ListFilter, Search, ChevronDown } from "@/components/icons";
import type { SignalEvent, SignalEventType, SignalSeverity } from "@repo/shared";
import { fetchFeed } from "@/lib/api";
import { useRealtimeStore } from "@/stores/realtime-store";
import { cn } from "@/lib/utils";
import { SignalCard } from "./signal-card";
import { SignalDetail } from "./signal-detail";
import { FlatRailPanelHeader } from "@/components/layout/intel-rail";
import { discoverShellClass } from "@/components/discover/discover-rail-tokens";
import { useLanguage } from "@/providers/language-provider";
import { shouldShowByLanguage } from "@/lib/language-filter";
import {
  loadMode,
  loadPinnedIds,
  loadReviewedIds,
  saveMode,
  savePinnedIds,
  saveReviewedIds,
  type SignalsConsoleMode,
} from "./state";
import { titleForType } from "./severity";

type ConsoleTab = "attention" | "all" | "pinned";

/** Queue tabs — same strip pattern as `ConstituenciesTable` (FILTER_TABS UI). */
const QUEUE_TABS: { id: ConsoleTab; label: string }[] = [
  { id: "attention", label: "Attention" },
  { id: "all", label: "All" },
  { id: "pinned", label: "Pinned" },
];

type SignalsConsoleProps = {
  allowedTypes: SignalEventType[];
};

function uniqueMergeById(events: SignalEvent[]): SignalEvent[] {
  const m = new Map<string, SignalEvent>();
  for (const e of events) m.set(e.id, e);
  return Array.from(m.values());
}

export function SignalsConsole({ allowedTypes }: SignalsConsoleProps) {
  const sseEvents = useRealtimeStore((s) => s.recentEvents);
  const { language } = useLanguage();
  const listRef = useRef<HTMLDivElement | null>(null);
  const [tab, setTab] = useState<ConsoleTab>("attention");
  const [mode, setMode] = useState<SignalsConsoleMode>("live");
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(() => new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [severity, setSeverity] = useState<"all" | SignalSeverity>("all");
  const [type, setType] = useState<"all" | SignalEventType>("all");
  const [q, setQ] = useState("");
  const [newCount, setNewCount] = useState(0);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const newestSeenIdRef = useRef<string | null>(null);

  const hasAdvancedFilters = severity !== "all" || type !== "all";

  useEffect(() => {
    setMode(loadMode());
    setReviewedIds(loadReviewedIds());
    setPinnedIds(loadPinnedIds());
  }, []);

  const { data: feedData } = useQuery({
    queryKey: ["feed-console", severity, type],
    queryFn: () =>
      fetchFeed(
        120,
        0,
        type === "all" ? undefined : type,
        severity === "all" ? undefined : severity
      ),
    refetchInterval: 15_000,
  });

  const apiEvents = feedData?.events ?? [];
  const merged = useMemo(() => {
    const combined = uniqueMergeById([...apiEvents, ...sseEvents]);
    return combined
      .filter((e) => allowedTypes.includes(e.type))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [apiEvents, sseEvents, allowedTypes]);

  // Track new items while in Review mode (or when user scrolled away).
  useEffect(() => {
    const newestId = merged[0]?.id ?? null;
    if (!newestId) return;
    if (!newestSeenIdRef.current) {
      newestSeenIdRef.current = newestId;
      return;
    }
    if (newestSeenIdRef.current === newestId) return;

    const isAtTop = (() => {
      const el = listRef.current;
      if (!el) return true;
      return el.scrollTop < 12;
    })();

    if (mode === "review" || !isAtTop) {
      setNewCount((c) => c + 1);
    } else {
      // Live mode and at top: auto-reset to newest
      newestSeenIdRef.current = newestId;
      setNewCount(0);
    }
  }, [merged, mode]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return merged.filter((e) => {
      if (type !== "all" && e.type !== type) return false;
      if (severity !== "all" && e.severity !== severity) return false;
      if (
        !shouldShowByLanguage(language, [
          e.title,
          e.body ?? undefined,
          e.source ?? undefined,
        ])
      ) {
        return false;
      }
      if (query) {
        const haystack = `${e.title} ${e.body ?? ""} ${e.source ?? ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (tab === "pinned") return pinnedIds.has(e.id);
      if (tab === "attention") return !reviewedIds.has(e.id);
      return true;
    });
  }, [merged, q, tab, type, severity, pinnedIds, reviewedIds, language]);

  const selected = useMemo(() => {
    if (selectedId) return filtered.find((e) => e.id === selectedId) ?? null;
    return filtered[0] ?? null;
  }, [filtered, selectedId]);

  // Keep selectedId synced if the filtered list changes.
  useEffect(() => {
    if (selected?.id && selectedId !== selected.id) setSelectedId(selected.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  const attentionCount = useMemo(() => merged.filter((e) => !reviewedIds.has(e.id)).length, [merged, reviewedIds]);
  const pinnedCount = useMemo(() => merged.filter((e) => pinnedIds.has(e.id)).length, [merged, pinnedIds]);

  function toggleReviewed(id: string) {
    setReviewedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveReviewedIds(next);
      return next;
    });
  }

  function togglePinned(id: string) {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      savePinnedIds(next);
      return next;
    });
  }

  async function copyLink(id: string) {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("id", id);
    try {
      await navigator.clipboard.writeText(url.toString());
    } catch {
      // ignore; clipboard permissions vary
    }
  }

  function onMode(next: SignalsConsoleMode) {
    setMode(next);
    saveMode(next);
    if (next === "live") {
      setNewCount(0);
      newestSeenIdRef.current = merged[0]?.id ?? null;
      const el = listRef.current;
      if (el) el.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function jumpToTop() {
    const el = listRef.current;
    if (el) el.scrollTo({ top: 0, behavior: "smooth" });
    newestSeenIdRef.current = merged[0]?.id ?? null;
    setNewCount(0);
  }

  const related = useMemo(() => {
    if (!selected?.source) return [];
    return merged.filter((e) => e.source && e.source === selected.source && e.id !== selected.id);
  }, [merged, selected]);

  /** Secondary pill row inside Advanced panel (severity). */
  const filterPillTrackClass =
    "inline-flex max-w-full flex-wrap items-center gap-1 rounded-full bg-white/[0.06] p-px px-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";

  const pillBtn = (active: boolean) =>
    cn(
      "rounded-full px-2.5 py-1 font-sans text-[11px] tracking-tight transition-colors sm:text-[12px]",
      active ? "bg-white/[0.14] text-white shadow-sm shadow-black/20" : "text-[#6b6b6b] hover:text-[#b4b4b4]"
    );

  const severityOptions = [
    ["all", "All"] as const,
    ["critical", "Critical"] as const,
    ["warning", "Warning"] as const,
    ["info", "Info"] as const,
  ];

  function clearAdvancedFilters() {
    setSeverity("all");
    setType("all");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
      <div className="flex min-h-0 min-w-0 flex-col gap-3">
        <div className="relative w-full min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666]" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search signals…"
            className="h-10 w-full min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.04] pl-10 pr-3 font-sans text-[13px] text-[#e5e5e5] placeholder:text-[#5c5c5c] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] focus:outline-none focus:ring-1 focus:ring-white/20"
            aria-label="Search signals"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div
            className="inline-flex w-max max-w-full min-w-0 flex-wrap items-center gap-0.5 rounded-full border border-white/[0.08] bg-white/[0.04] p-1"
            role="tablist"
            aria-label="Signal queue"
          >
            {QUEUE_TABS.map(({ id, label }) => {
              const active = tab === id;
              const count =
                id === "attention" ? attentionCount : id === "all" ? merged.length : pinnedCount;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(id)}
                  className={cn(
                    "rounded-full px-2.5 py-1.5 font-sans text-[11px] font-medium uppercase tracking-wide transition-colors",
                    active
                      ? "bg-white/[0.14] text-[#e5e5e5] shadow-sm shadow-black/20"
                      : "text-[#888] hover:bg-white/[0.06] hover:text-[#ccc]"
                  )}
                >
                  {label}{" "}
                  <span className="tabular-nums text-[10px] text-[#666]">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:ml-auto">
            <button
              type="button"
              onClick={() => setAdvancedOpen((o) => !o)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-sans text-[11px] tracking-tight transition-colors sm:text-[12px]",
                advancedOpen
                  ? "border-white/[0.14] bg-white/[0.1] text-[#e5e5e5]"
                  : "border-white/[0.08] bg-white/[0.03] text-[#a1a1a1] hover:bg-white/[0.06] hover:text-[#e5e5e5]",
                hasAdvancedFilters && !advancedOpen && "ring-1 ring-amber-500/35"
              )}
              aria-expanded={advancedOpen}
              aria-controls="signals-advanced-filters"
            >
              <ListFilter className="h-3.5 w-3.5 shrink-0 opacity-80" />
              Advanced filters
              {hasAdvancedFilters && !advancedOpen ? (
                <span className="font-sans tabular-nums text-[10px] text-amber-400/90">· on</span>
              ) : null}
              <ChevronDown
                className={cn("h-3.5 w-3.5 shrink-0 opacity-70 transition-transform", advancedOpen && "rotate-180")}
              />
            </button>
            <button
              type="button"
              onClick={() => onMode(mode === "live" ? "review" : "live")}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-sans text-[11px] tracking-tight transition-colors sm:text-[12px]",
                mode === "live"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200/95"
                  : "border-white/[0.08] bg-white/[0.04] text-[#a1a1aa] hover:bg-white/[0.08] hover:text-[#e5e5e5]"
              )}
            >
              <Radio
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  mode === "live" ? "text-emerald-400" : "text-[#666]"
                )}
              />
              {mode === "live" ? "Live" : "Review"}
            </button>
          </div>
        </div>

        {advancedOpen ? (
          <div
            id="signals-advanced-filters"
            className="space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          >
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-sans text-[10px] uppercase tracking-[0.14em] text-[#666]">Severity</span>
                {hasAdvancedFilters ? (
                  <button
                    type="button"
                    onClick={clearAdvancedFilters}
                    className="font-sans text-[11px] text-[#888] underline-offset-2 hover:text-[#ccc] hover:underline"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              <div className={filterPillTrackClass}>
                {severityOptions.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSeverity(id)}
                    className={pillBtn(severity === id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="font-sans text-[10px] uppercase tracking-[0.14em] text-[#666]">Type</span>
              <div className="-mx-0.5 flex max-h-[5.5rem] flex-wrap gap-1.5 overflow-y-auto overscroll-y-contain px-0.5 pb-0.5 sm:max-h-none">
                <button type="button" onClick={() => setType("all")} className={pillBtn(type === "all")}>
                  All
                </button>
                {allowedTypes.map((t) => (
                  <button key={t} type="button" onClick={() => setType(t)} className={pillBtn(type === t)}>
                    {titleForType(t)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <div className={cn(discoverShellClass, "flex min-h-0 flex-col")}>
          <FlatRailPanelHeader
            title="Signal queue"
            leadingDotClass="bg-emerald-400"
            right={
              newCount > 0 ? (
                <button
                  type="button"
                  onClick={jumpToTop}
                  className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-sans text-[11px] font-medium text-emerald-300 sm:text-[12px]"
                >
                  {newCount} new
                </button>
              ) : null
            }
          />

          <div
            ref={listRef}
            className={cn(
              "mx-3 mb-3 mt-1 min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden rounded-xl bg-white/[0.06] px-2 pb-3 pt-2.5 text-[#ccc]",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            )}
            style={{ maxHeight: "calc(100vh - 14rem)" }}
            onScroll={() => {
              if (mode !== "live") return;
              const el = listRef.current;
              if (!el) return;
              if (el.scrollTop < 12) {
                newestSeenIdRef.current = merged[0]?.id ?? null;
                setNewCount(0);
              }
            }}
          >
            {filtered.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/[0.1] px-4 py-10 text-center font-sans text-[13px] text-[#888]">
                No signals match the current view.
              </div>
            ) : (
              filtered.map((e) => (
                <SignalCard
                  key={e.id}
                  event={e}
                  selected={selected?.id === e.id}
                  isPinned={pinnedIds.has(e.id)}
                  isReviewed={reviewedIds.has(e.id)}
                  onSelect={() => setSelectedId(e.id)}
                  onTogglePinned={() => togglePinned(e.id)}
                  onMarkReviewed={() => toggleReviewed(e.id)}
                  onCopyLink={() => copyLink(e.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <div
        className={cn(
          discoverShellClass,
          "sticky top-12 flex max-h-[calc(100vh-4rem)] min-h-0 flex-col self-start overflow-hidden"
        )}
      >
        <FlatRailPanelHeader title="Detail" leadingDotClass="bg-violet-400" />
        <div className="min-h-0 flex-1 overflow-auto px-2 pb-3 pt-0">
          <SignalDetail
            event={selected}
            isPinned={selected ? pinnedIds.has(selected.id) : false}
            isReviewed={selected ? reviewedIds.has(selected.id) : false}
            onMarkReviewed={() => selected && toggleReviewed(selected.id)}
            onTogglePinned={() => selected && togglePinned(selected.id)}
            related={related}
          />
        </div>
      </div>
    </div>
  );
}

