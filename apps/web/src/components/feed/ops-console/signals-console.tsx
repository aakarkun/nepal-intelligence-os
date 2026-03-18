"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Radio, ListFilter, Search } from "lucide-react";
import type { SignalEvent, SignalEventType, SignalSeverity } from "@repo/shared";
import { fetchFeed } from "@/lib/api";
import { useRealtimeStore } from "@/stores/realtime-store";
import { cn } from "@/lib/utils";
import { SignalCard } from "./signal-card";
import { SignalDetail } from "./signal-detail";
import {
  loadMode,
  loadPinnedIds,
  loadReviewedIds,
  saveMode,
  savePinnedIds,
  saveReviewedIds,
  type SignalsConsoleMode,
} from "./state";

type ConsoleTab = "attention" | "all" | "pinned";

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
  const newestSeenIdRef = useRef<string | null>(null);

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
      if (query) {
        const haystack = `${e.title} ${e.body ?? ""} ${e.source ?? ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (tab === "pinned") return pinnedIds.has(e.id);
      if (tab === "attention") return !reviewedIds.has(e.id);
      return true;
    });
  }, [merged, q, tab, type, severity, pinnedIds, reviewedIds]);

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

  return (
    <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
      <div className="space-y-3">
        <div className="sticky top-12 z-10 rounded-xl border border-border bg-background/70 p-3 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onMode(mode === "live" ? "review" : "live")}
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                mode === "live"
                  ? "border-emerald-500/25 bg-emerald-500/8 text-emerald-300"
                  : "border-border bg-muted/20 text-muted-foreground hover:text-foreground"
              )}
            >
              <Radio className="h-3.5 w-3.5" />
              {mode === "live" ? "Live" : "Review"}
            </button>

            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground/70" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search signals…"
                  className="h-8 w-56 rounded-md border border-border bg-background/40 pl-7 pr-2 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-border/50"
                />
              </div>

              <div className="flex items-center gap-2">
                <ListFilter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as typeof severity)}
                  className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
                  aria-label="Severity filter"
                >
                  <option value="all">All severity</option>
                  <option value="critical">Critical</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                </select>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as typeof type)}
                  className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
                  aria-label="Type filter"
                >
                  <option value="all">All types</option>
                  {allowedTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("attention")}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium",
                tab === "attention"
                  ? "border-nepal-red/40 bg-nepal-red/10 text-nepal-red"
                  : "border-border bg-muted/10 text-muted-foreground hover:text-foreground"
              )}
            >
              Attention ({attentionCount})
            </button>
            <button
              type="button"
              onClick={() => setTab("all")}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium",
                tab === "all"
                  ? "border-nepal-red/40 bg-nepal-red/10 text-nepal-red"
                  : "border-border bg-muted/10 text-muted-foreground hover:text-foreground"
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setTab("pinned")}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium",
                tab === "pinned"
                  ? "border-nepal-red/40 bg-nepal-red/10 text-nepal-red"
                  : "border-border bg-muted/10 text-muted-foreground hover:text-foreground"
              )}
            >
              Pinned ({pinnedCount})
            </button>

            {newCount > 0 && (
              <button
                type="button"
                onClick={jumpToTop}
                className="ml-auto rounded-md border border-emerald-500/25 bg-emerald-500/8 px-2.5 py-1 text-xs font-medium text-emerald-300"
              >
                {newCount} new signals
              </button>
            )}
          </div>
        </div>

        <div
          ref={listRef}
          className="space-y-2 overflow-auto rounded-xl border border-border bg-card/20 p-3"
          style={{ maxHeight: "calc(100vh - 12rem)" }}
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
            <div className="py-10 text-center text-sm text-muted-foreground">
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

      <div className="sticky top-12 self-start" style={{ maxHeight: "calc(100vh - 4rem)" }}>
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
  );
}

