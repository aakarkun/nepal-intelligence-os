"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import {
  useGetWatchlistQuery,
  useCreateWatchlistItemMutation,
  useDeleteWatchlistItemMutation,
  useToggleWatchlistItemMutation,
} from "@/store/api/watchlistApi";
import type { WatchlistItemType } from "@repo/shared";
import { cn, timeAgo } from "@/lib/utils";
import { useRealtimeStore } from "@/stores/realtime-store";
import {
  fetchAnomalies,
  fetchConstituency,
  fetchSourceHealth,
  type AnomalyContextFilter,
} from "@/lib/api";
import { Plus, X, ChevronLeft, ChevronRight } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Intel Rail — locked mini-card surface (shared with Source Health)     */
/* ------------------------------------------------------------------ */

/** Shared intel / economy terminal card surface — matches rail sections (inset p-1). */
export const railShell = "overflow-hidden rounded-xl bg-[#0c0c0c] p-1";
export const railListBody = "min-w-0 overflow-hidden rounded-t-xl bg-[#0c0c0c]";
export const railRow =
  "bg-[#181818]/60 px-3 py-3 transition-colors duration-150 hover:bg-white/[0.06]";
/** Footer bar for paginated rail lists (Source Health, watchlist, etc.). */
export const railPagination = "bg-[#0c0c0c] px-3 py-2";

/** Inner inset for rail list bodies — matches economy Intelligence Signals card (`p-1`). */
export const railCardInset = "p-1";

/** Top strip inside each rail card: title (+ optional section dot) | optional right indicators */
export function RailPanelHeader({
  title,
  leadingDotClass,
  right,
}: {
  title: string;
  /** When set, small colored dot before title (section accent). Omit for title-only (e.g. Source Health). */
  leadingDotClass?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 bg-[#0c0c0c] px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        {leadingDotClass ? (
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-sm", leadingDotClass)} />
        ) : null}
        <span className="truncate font-mono text-[11px] leading-none text-[#a1a1aa]">
          {title}
        </span>
      </div>
      {right ? (
        <div className="flex min-w-0 shrink-0 items-center justify-end gap-2.5">{right}</div>
      ) : null}
    </div>
  );
}

/** Compact “As of · date” for rail card headers (right column, same row as title). */
export function RailPanelAsOf({ date }: { date?: string | null }) {
  const formatted = formatPortalAsOfLabel(date);
  return (
    <span className="max-w-[min(100%,11rem)] text-right font-mono text-[10px] leading-none tabular-nums">
      {formatted ? (
        <>
          <span className="uppercase tracking-[0.12em] text-[#666]">As of</span>{" "}
          <span className="text-[#a1a1aa]">{formatted}</span>
        </>
      ) : (
        <span className="text-[#555]">—</span>
      )}
    </span>
  );
}

function formatPortalAsOfLabel(raw: string | null | undefined): string | null {
  if (raw == null || String(raw).trim() === "") return null;
  const s = String(raw).trim();
  const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    const y = Number(ymd[1]);
    const mo = Number(ymd[2]) - 1;
    const d = Number(ymd[3]);
    const dt = new Date(y, mo, d);
    if (!Number.isNaN(dt.getTime())) {
      return dt.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
  }
  const dt = new Date(s);
  if (!Number.isNaN(dt.getTime())) {
    return dt.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  return s;
}

function railRowClass(i: number, len: number) {
  return cn(
    railRow,
    i === 0 && "rounded-t-xl",
    i === len - 1 && "rounded-b-xl"
  );
}

/* ------------------------------------------------------------------ */
/* Panel mini-card (economy rail)                                       */
/* ------------------------------------------------------------------ */

function PanelSection({
  title,
  dotClass,
  children,
  headerRight,
  subHeader,
}: {
  title: string;
  /** Leading accent dot; omit when using only `headerRight` (e.g. Watchlist status dots). */
  dotClass?: string;
  children: ReactNode;
  headerRight?: ReactNode;
  subHeader?: ReactNode;
}) {
  return (
    <div className={railShell}>
      <RailPanelHeader
        title={title}
        leadingDotClass={dotClass}
        right={headerRight}
      />
      {subHeader ? (
        <div className="mb-1 bg-[#0c0c0c] px-3 py-0.5">{subHeader}</div>
      ) : null}
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Anomalies Section                                                    */
/* ------------------------------------------------------------------ */

const ANOMALY_VIEW_LABELS: Record<AnomalyContextFilter, string> = {
  operational: "Live",
  election: "Election",
  all: "All",
};

function AnomaliesSection() {
  const [anomalyView, setAnomalyView] = useState<AnomalyContextFilter>("operational");
  const [page, setPage] = useState(0);
  const itemsPerPage = 6;
  const realtimeAnomalies = useRealtimeStore((s) => s.anomalies);
  const { data: apiAnomalies = [] } = useQuery({
    queryKey: ["anomalies", anomalyView],
    queryFn: () => fetchAnomalies(anomalyView),
    refetchInterval: 30_000,
  });

  const merged = useMemo(() => {
    const byId = new Map<string, typeof apiAnomalies[number]>();
    for (const a of apiAnomalies) {
      byId.set(a.id, a);
    }
    if (anomalyView === "election" || anomalyView === "all") {
      for (const a of realtimeAnomalies) {
        byId.set(a.id, a);
      }
    }
    const severityOrder: Record<string, number> = {
      critical: 3,
      warning: 2,
      info: 1,
    };
    return Array.from(byId.values()).sort((a, b) => {
      const ta = new Date(a.timestamp).getTime();
      const tb = new Date(b.timestamp).getTime();
      if (tb !== ta) return tb - ta;
      const sa = severityOrder[a.severity] ?? 0;
      const sb = severityOrder[b.severity] ?? 0;
      return sb - sa;
    });
  }, [apiAnomalies, realtimeAnomalies, anomalyView]);

  const totalPages = Math.ceil(merged.length / itemsPerPage);
  const paginatedItems = merged.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  const dotSeverities = useMemo(() => {
    const total = merged.length || 1;
    const infoCount = merged.filter((a) => a.severity === "info").length;
    const warningCount = merged.filter((a) => a.severity === "warning").length;
    const criticalCount = merged.filter((a) => a.severity === "critical").length;
    const count = Math.max(1, Math.min(5, merged.length || 1));
    const arr: ("info" | "warning" | "critical")[] = Array(count).fill("info");

    if (warningCount > 0) {
      arr[0] = "warning";
      if (warningCount / total > 0.3 && count > 2) arr[1] = "warning";
    }

    if (criticalCount > 0) {
      arr[count - 1] = "critical";
      if (criticalCount / total > 0.3 && count > 3) arr[count - 2] = "critical";
    }

    // If only info-level anomalies, keep them all as info.
    return arr;
  }, [merged]);

  return (
    <PanelSection
      title="Anomalies"
      dotClass="bg-rose-500"
      headerRight={
        merged.length > 0 && (
          <div className="flex gap-[3px]">
            {dotSeverities.map((sev, idx) => (
              <span
                key={idx}
                className={cn(
                  "h-1.5 w-1.5 rounded-sm bg-muted/40 animate-health-dot",
                  sev === "info" && "bg-muted/80",
                  sev === "warning" && "bg-amber-500/80",
                  sev === "critical" && "bg-rose-500/80"
                )}
                style={{ animationDelay: `${(idx * 0.9) % 4.5}s` }}
              />
            ))}
          </div>
        )
      }
      subHeader={
        <div className="mx-auto flex w-full max-w-[min(100%,13.75rem)] flex-row rounded-full bg-[#121212] p-px shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          {(["operational", "election", "all"] as const).map((ctx) => (
            <button
              key={ctx}
              type="button"
              onClick={() => setAnomalyView(ctx)}
              className={cn(
                "min-w-0 flex-1 rounded-full px-1.5 py-1 font-mono text-[9px] uppercase tracking-[0.08em] transition-colors duration-150",
                anomalyView === ctx
                  ? "bg-[#2e2e2e] text-white shadow-sm"
                  : "text-[#6b6b6b] hover:text-[#9ca3af]"
              )}
            >
              {ANOMALY_VIEW_LABELS[ctx].toUpperCase()}
            </button>
          ))}
        </div>
      }
    >
      {paginatedItems.length === 0 ? (
        <div className={railListBody}>
          <div className={railCardInset}>
            <div className="flex flex-col">
              <div className={cn(railRow, "rounded-t-xl rounded-b-xl")}>
                <p className="font-mono text-[10px] text-[#555] uppercase">
                  {anomalyView === "operational"
                    ? "NO SOURCE ISSUES"
                    : "NO ANOMALIES DETECTED"}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className={railListBody}>
            <div className={railCardInset}>
              <div className="flex flex-col">
              {paginatedItems.map((a, i) => {
                const hasViewMore = merged.length > itemsPerPage;
                const isLast = i === paginatedItems.length - 1;
                const lastRowRoundedB =
                  isLast && (totalPages > 1 || !hasViewMore);

                return (
                  <div
                    key={a.id ?? i}
                    className={cn(
                      railRow,
                      i === 0 && "rounded-t-xl",
                      lastRowRoundedB && "rounded-b-xl"
                    )}
                  >
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <span
                        className={cn(
                          "shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                          a.severity === "critical" &&
                            "bg-rose-500/10 text-rose-400",
                          a.severity === "warning" &&
                            "bg-amber-500/10 text-amber-400",
                          a.severity === "info" &&
                            "bg-white/5 text-[#888]"
                        )}
                      >
                        {a.type === "source_stale"
                          ? "STALE"
                          : a.type === "source_error"
                            ? "ERROR"
                            : a.type.replace(/_/g, " ")}
                      </span>
                      <span className="shrink-0 font-mono text-[9px] text-[#555]">
                        [{timeAgo(a.timestamp).toUpperCase()}]
                      </span>
                    </div>
                    <p
                      className="mt-1 text-[11px] font-sans leading-snug text-[#ccc]"
                      title={a.details}
                    >
                      {a.details}
                    </p>
                  </div>
                );
              })}
              </div>
            </div>
          </div>
          {totalPages > 1 && (
            <div
              className={cn(
                railPagination,
                "flex items-center justify-between",
                merged.length <= itemsPerPage && "rounded-b-xl"
              )}
            >
              <span className="font-mono text-[9px] text-[#555]">
                PAGE {page + 1} OF {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded p-1 transition-colors hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="h-3 w-3 text-[#888]" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  className="rounded p-1 transition-colors hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="h-3 w-3 text-[#888]" />
                </button>
              </div>
            </div>
          )}
          {merged.length > itemsPerPage && (
            <div className="mt-3 flex justify-end rounded-b-xl bg-[#0c0c0c] px-1 pb-3 pt-1">
              <Link
                href="/disasters?focus=anomalies"
                className="font-mono text-[9px] uppercase tracking-wider text-rose-400 hover:underline"
              >
                VIEW MORE &rarr;
              </Link>
            </div>
          )}
        </>
      )}
    </PanelSection>
  );
}

/* ------------------------------------------------------------------ */
/* Watchlist Section                                                     */
/* ------------------------------------------------------------------ */

function WatchlistSection() {
  const [page, setPage] = useState(0);
  const itemsPerPage = 6;
  const watchlist = useRealtimeStore((s) => s.watchlist);
  const candidateWatchlist = useRealtimeStore((s) => s.candidateWatchlist);

  const mergedWatchlist = useMemo(() => {
    const items: Array<{ type: 'constituency'; id: string } | { type: 'candidate'; candidate: typeof candidateWatchlist[0] }> = [
      ...watchlist.map(id => ({ type: 'constituency' as const, id })),
      ...candidateWatchlist.map(candidate => ({ type: 'candidate' as const, candidate }))
    ];
    return items;
  }, [watchlist, candidateWatchlist]);

  const totalPages = Math.ceil(mergedWatchlist.length / itemsPerPage);
  const paginatedItems = mergedWatchlist.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  /** Same query keys as WatchlistItem / CandidateWatchItem — one dot per item, shared cache. */
  const watchlistDetailQueries = useQueries({
    queries: mergedWatchlist.map((item) =>
      item.type === "constituency"
        ? {
            queryKey: ["watchlist-constituency", item.id] as const,
            queryFn: () => fetchConstituency(item.id),
          }
        : {
            queryKey: ["watchlist-candidate", item.candidate.constituencyId] as const,
            queryFn: () => fetchConstituency(item.candidate.constituencyId),
          }
    ),
  });

  /** Per-item: green = details loaded, red = unavailable (matches row “DETAILS UNAVAILABLE”), amber = loading. */
  const watchlistDotsUi =
    mergedWatchlist.length === 0 ? null : (
      <div className="flex shrink-0 gap-[3px]">
        {watchlistDetailQueries.map((q, idx) => {
          const tone = q.isPending
            ? "bg-amber-500/80"
            : q.isError || !q.data
              ? "bg-rose-500/80"
              : "bg-emerald-500/80";
          return (
            <span
              key={idx}
              className={cn("h-1.5 w-1.5 rounded-sm animate-health-dot", tone)}
              style={{ animationDelay: `${(idx * 0.9) % 2.7}s` }}
            />
          );
        })}
      </div>
    );

  return (
    <PanelSection
      title="Watchlist"
      dotClass="bg-blue-500"
      headerRight={watchlistDotsUi}
    >
      {mergedWatchlist.length === 0 ? (
        <div className={railListBody}>
          <div className={railCardInset}>
            <div className="flex flex-col">
              <div className={cn(railRow, "rounded-t-xl rounded-b-xl")}>
                <p className="font-mono text-[10px] text-[#555] uppercase">NO WATCHLIST ITEMS</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className={railListBody}>
            <div className={railCardInset}>
              <div className="flex flex-col">
              {paginatedItems.map((item, idx) =>
                item.type === "constituency" ? (
                  <WatchlistItem
                    key={`const-${item.id}`}
                    id={item.id}
                    rowIndex={idx}
                    rowCount={paginatedItems.length}
                  />
                ) : (
                  <CandidateWatchItem
                    key={`cand-${item.candidate.candidateId}`}
                    candidate={item.candidate}
                    rowIndex={idx}
                    rowCount={paginatedItems.length}
                  />
                )
              )}
              </div>
            </div>
          </div>
          {totalPages > 1 && (
            <div className={cn(railPagination, "flex items-center justify-between rounded-b-xl")}>
              <span className="font-mono text-[9px] text-[#555]">
                PAGE {page + 1} OF {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded p-1 transition-colors hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="h-3 w-3 text-[#888]" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  className="rounded p-1 transition-colors hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="h-3 w-3 text-[#888]" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </PanelSection>
  );
}

function WatchlistItem({
  id,
  rowIndex,
  rowCount,
}: {
  id: string;
  rowIndex: number;
  rowCount: number;
}) {
  const router = useRouter();
  const removeFromWatchlist = useRealtimeStore((s) => s.removeFromWatchlist);
  const { data, isLoading } = useQuery({
    queryKey: ["watchlist-constituency", id],
    queryFn: () => fetchConstituency(id),
  });

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/constituencies/${id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/constituencies/${id}`);
        }
      }}
      className={cn(
        railRowClass(rowIndex, rowCount),
        "group flex w-full cursor-pointer items-center justify-between text-left"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-[#888]">
            {id}
          </span>
          <span className="truncate font-sans text-[11px] font-medium text-[#e5e5e5]">
            {data?.constituencyName ?? id}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeFromWatchlist(id);
            }}
            className="text-[#555] opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
            title="Remove from watchlist"
          >
            <EyeOff className="h-3 w-3" />
          </button>
        </div>
        <div className="truncate font-mono text-[9px] text-[#555] uppercase mt-0.5">
          {data
            ? `${data.districtName} · ${
                data.status === "final"
                  ? "FINAL"
                  : data.status === "counting"
                    ? "COUNTING"
                    : data.status.toUpperCase()
              }`
            : isLoading
              ? "LOADING…"
              : "DETAILS UNAVAILABLE"}
        </div>
      </div>
      {data && (
        <span className="ml-2 font-mono text-[10px] text-[#888]">
          {data.totalVotes.toLocaleString("en-IN")}
        </span>
      )}
    </div>
  );
}

function CandidateWatchItem({
  candidate,
  rowIndex,
  rowCount,
}: {
  candidate: {
    candidateId: string;
    constituencyId: string;
    candidateName: string;
    partyName: string;
  };
  rowIndex: number;
  rowCount: number;
}) {
  const router = useRouter();
  const removeCandidateFromWatchlist = useRealtimeStore(
    (s) => s.removeCandidateFromWatchlist
  );
  const { data } = useQuery({
    queryKey: ["watchlist-candidate", candidate.constituencyId],
    queryFn: () => fetchConstituency(candidate.constituencyId),
  });

  const candidateVotes =
    data?.candidates.find((c) => c.candidateId === candidate.candidateId)?.votes ??
    null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/constituencies/${candidate.constituencyId}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/constituencies/${candidate.constituencyId}`);
        }
      }}
      className={cn(
        railRowClass(rowIndex, rowCount),
        "group flex w-full cursor-pointer items-center justify-between text-left"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-[#888]">
            {candidate.constituencyId}
          </span>
          <span className="truncate font-sans text-[11px] font-medium text-[#e5e5e5]">
            {candidate.candidateName}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeCandidateFromWatchlist(candidate.candidateId);
            }}
            className="text-[#555] opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
            title="Remove candidate from watchlist"
          >
            <EyeOff className="h-3 w-3" />
          </button>
        </div>
        <div className="truncate font-mono text-[9px] text-[#555] uppercase mt-0.5">
          SEAT: {candidate.constituencyId}
          {" · "}
          {candidate.partyName
            .split(" ")
            .filter(Boolean)
            .map((word) => word[0])
            .join("")
            .toUpperCase()}
        </div>
      </div>
      {candidateVotes !== null && (
        <span className="ml-2 font-mono text-[10px] text-[#888]">
          {candidateVotes.toLocaleString("en-IN")}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Alert rules (watchlist with Telegram) — RTK Query                    */
/* ------------------------------------------------------------------ */

const WATCHLIST_TYPES: { value: WatchlistItemType; label: string }[] = [
  { value: "keyword", label: "Keyword" },
  { value: "constituency", label: "Constituency" },
  { value: "district", label: "District" },
  { value: "price_threshold", label: "Price %" },
  { value: "crisis_severity", label: "Crisis" },
];

function AlertRulesSection() {
  const { data: items = [], isLoading } = useGetWatchlistQuery(undefined, {
    pollingInterval: 30_000,
  });
  const [createItem] = useCreateWatchlistItemMutation();
  const [deleteItem] = useDeleteWatchlistItemMutation();
  const [toggleItem] = useToggleWatchlistItemMutation();
  const [addOpen, setAddOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<WatchlistItemType>("keyword");
  const [value, setValue] = useState("");
  const [threshold, setThreshold] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [page, setPage] = useState(0);
  const itemsPerPage = 6;

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const paginatedItems = items.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  const handleAdd = () => {
    if (!label.trim() || !value.trim()) return;
    createItem({
      label: label.trim(),
      type,
      value: value.trim(),
      ...(type === "price_threshold" && threshold !== ""
        ? { threshold: Number(threshold) }
        : {}),
      ...(telegramChatId.trim() ? { telegramChatId: telegramChatId.trim() } : {}),
      active: true,
    });
    setLabel("");
    setValue("");
    setThreshold("");
    setTelegramChatId("");
    setAddOpen(false);
  };

  return (
    <PanelSection title="Alert rules" dotClass="bg-amber-500">
      {isLoading ? (
        <div className={railListBody}>
          <div className={railCardInset}>
            <div className="flex flex-col">
              <div className={cn(railRow, "rounded-t-xl rounded-b-xl")}>
                <p className="font-mono text-[10px] text-[#555] uppercase">LOADING…</p>
              </div>
            </div>
          </div>
        </div>
      ) : items.length === 0 && !addOpen ? (
        <div className={railListBody}>
          <div className={railCardInset}>
            <div className="flex flex-col">
              <div className={cn(railRow, "rounded-t-xl rounded-b-xl")}>
                <p className="font-mono text-[10px] text-[#555] uppercase">
                  NO ACTIVE ALERTS
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className={railListBody}>
            <div className={railCardInset}>
              <div className="flex flex-col">
          {paginatedItems.map((item, idx) => {
            const isLast = idx === paginatedItems.length - 1;
            const lastRowRoundedB = isLast && totalPages > 1 && !addOpen;

            return (
            <div
              key={item.id}
              className={cn(
                railRow,
                "group flex items-center gap-1.5",
                idx === 0 && "rounded-t-xl",
                lastRowRoundedB && "rounded-b-xl"
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-sans text-[11px] font-medium text-[#e5e5e5]">
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                      item.active
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-white/5 text-[#888]"
                    )}
                  >
                    {item.type.replace("_", " ")}
                  </span>
                </div>
                <p className="mt-0.5 font-mono text-[9px] text-[#555] uppercase">
                  {item.lastTriggeredAt
                    ? `LAST: ${timeAgo(item.lastTriggeredAt)}`
                    : "NEVER TRIGGERED"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleItem(item.id)}
                className="shrink-0 rounded p-1 text-[#555] hover:text-[#e5e5e5]"
                title={item.active ? "Pause" : "Resume"}
              >
                {item.active ? (
                  <Eye className="h-3 w-3" />
                ) : (
                  <EyeOff className="h-3 w-3 opacity-60" />
                )}
              </button>
                <button
                  type="button"
                  onClick={() => deleteItem(item.id)}
                  className="shrink-0 rounded p-1 text-[#555] hover:text-rose-400"
                  title="Remove"
                >
                <X className="h-3 w-3" />
              </button>
            </div>
            );
          })}
              </div>
            </div>
          </div>

          {totalPages > 1 && !addOpen && (
            <div
              className={cn(railPagination, "flex items-center justify-between")}
            >
              <span className="font-mono text-[9px] text-[#555]">
                PAGE {page + 1} OF {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded p-1 transition-colors hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="h-3 w-3 text-[#888]" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  className="rounded p-1 transition-colors hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="h-3 w-3 text-[#888]" />
                </button>
              </div>
            </div>
          )}
          {addOpen && (
            <div className={cn("space-y-2 rounded-b-xl bg-[#0c0c0c]", railCardInset)}>
              <input
                type="text"
                placeholder="LABEL"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-[#111] px-2 py-1.5 font-mono text-[10px] text-[#e5e5e5] placeholder:text-[#555] focus:outline-none focus:ring-1 focus:ring-white/20"
              />
              <select
                value={type}
                onChange={(e) => setType(e.target.value as WatchlistItemType)}
                className="w-full rounded-md border border-white/10 bg-[#111] px-2 py-1.5 font-mono text-[10px] text-[#e5e5e5] focus:outline-none focus:ring-1 focus:ring-white/20"
              >
                {WATCHLIST_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label.toUpperCase()}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="VALUE (E.G. NABIL, DANGER)"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-[#111] px-2 py-1.5 font-mono text-[10px] text-[#e5e5e5] placeholder:text-[#555] focus:outline-none focus:ring-1 focus:ring-white/20"
              />
              {type === "price_threshold" && (
                <input
                  type="number"
                  placeholder="THRESHOLD %"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-[#111] px-2 py-1.5 font-mono text-[10px] text-[#e5e5e5] placeholder:text-[#555] focus:outline-none focus:ring-1 focus:ring-white/20"
                />
              )}
              <input
                type="text"
                placeholder="TELEGRAM CHAT ID (OPTIONAL)"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-[#111] px-2 py-1.5 font-mono text-[10px] text-[#e5e5e5] placeholder:text-[#555] focus:outline-none focus:ring-1 focus:ring-white/20"
              />
              <p className="font-mono text-[9px] text-[#555]">
                GET CHAT ID FROM @USERINFOBOT
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleAdd}
                  className="rounded-md bg-white text-black px-2.5 py-1.5 font-mono text-[10px] uppercase font-semibold hover:bg-white/90"
                >
                  ADD
                </button>
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="rounded-md border border-white/10 px-2.5 py-1.5 font-mono text-[10px] uppercase text-[#888] hover:text-[#e5e5e5]"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}
          {!addOpen && (
            <div className={cn("rounded-b-xl bg-[#0c0c0c]", railCardInset)}>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/10 px-2.5 py-2 font-mono text-[10px] uppercase tracking-wider text-[#555] hover:border-white/20 hover:text-[#888]"
              >
                <Plus className="h-3 w-3" />
                NEW ALERT
              </button>
            </div>
          )}
        </>
      )}
    </PanelSection>
  );
}

/* ------------------------------------------------------------------ */
/* Source Health Section                                                 */
/* ------------------------------------------------------------------ */

function SourceHealthSection() {
  const [page, setPage] = useState(0);
  const itemsPerPage = 6;

  const { data: sources } = useQuery({
    queryKey: ["source-health"],
    queryFn: fetchSourceHealth,
    refetchInterval: 30_000,
  });

  const staleCount = sources?.filter((s) => s.status === "stale").length ?? 0;
  const errorCount = sources?.filter((s) => s.status === "error").length ?? 0;
  const sourceCount = sources?.length ?? 0;
  const total = sourceCount || 1;

  // Build up to 5 squares summarizing overall health from good (green) to bad (red).
  const dots = useMemo(() => {
    const count = Math.max(1, Math.min(5, sourceCount || 1));
    const arr: ("live" | "stale" | "error")[] = Array(count).fill("live");
    const errorRatio = errorCount / total;
    const staleRatio = staleCount / total;

    if (staleCount === 0 && errorCount === 0) {
      return arr;
    }

    if (staleCount > 0) {
      arr[2] = "stale";
      if (staleRatio > 0.3) arr[1] = "stale";
    }

    if (errorCount > 0) {
      arr[4] = "error";
      if (errorRatio > 0.3) arr[3] = "error";
    }

    return arr;
  }, [errorCount, staleCount, total, sourceCount]);

  const sortedSources = useMemo(() => {
    if (!sources?.length) return [];
    return [...sources].sort((a, b) => b.updateCount - a.updateCount);
  }, [sources]);

  const totalPages = Math.ceil(sortedSources.length / itemsPerPage);
  const paginatedSources = sortedSources.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  const healthDots =
    dots.length > 0 ? (
      <div className="flex shrink-0 gap-[3px]">
        {dots.map((status, idx) => (
          <span
            key={idx}
            className={cn(
              "h-1.5 w-1.5 rounded-sm bg-muted/40 animate-health-dot",
              status === "live" && "bg-emerald-500/80",
              status === "stale" && "bg-amber-500/80",
              status === "error" && "bg-rose-500/80"
            )}
            style={{ animationDelay: `${(idx * 0.9) % 2.7}s` }}
          />
        ))}
      </div>
    ) : null;

  /* Toolbar header (flex) + list body (flex rows) — avoids table column math in a ~300px rail */
  const showPaginationFooter =
    Boolean(sources?.length) && totalPages > 1;

  /* Parent clips rounded-xl, but the *body* block must opt into top radius or inner top corners stay square */
  const hasList = Boolean(sources?.length);
  const bodyClosesCard = !showPaginationFooter && hasList;
  const emptyBody = !sources || sources.length === 0;

  return (
    <div className={railShell}>
      <RailPanelHeader title="Source Health" right={healthDots} />

      <div
        className={cn(
          railListBody,
          (bodyClosesCard || emptyBody) && "rounded-b-xl"
        )}
      >
        {!sources || sources.length === 0 ? (
          <div className={railCardInset}>
            <div className="flex flex-col">
              <div className={cn(railRow, "rounded-t-xl rounded-b-xl")}>
                <p className="font-mono text-[10px] text-[#555] uppercase">NO SOURCE DATA</p>
              </div>
            </div>
          </div>
        ) : (
          <div className={railCardInset}>
            <div className="flex flex-col">
            {paginatedSources.map((s, i) => {
              const isFirstRow = i === 0;
              const isLastRow = i === paginatedSources.length - 1;

              return (
                <div
                  key={s.sourceId}
                  className={cn(
                    railRow,
                    "grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(2.75rem,4rem)_auto] items-start gap-x-2",
                    isFirstRow && "rounded-t-xl",
                    isLastRow && "rounded-b-xl"
                  )}
                >
                  <div className="min-w-0">
                    <div className="truncate font-sans text-[11px] font-medium text-[#e5e5e5]">
                      {s.sourceName}
                    </div>
                    <div className="mt-0.5 font-mono text-[9px] uppercase text-[#555]">
                      LAST: {s.lastUpdate ? timeAgo(s.lastUpdate) : "—"}
                      {s.sourceId === "social" && " · X + REDDIT"}
                    </div>
                    {"suspended" in s && s.suspended && (
                      <div className="mt-0.5 font-mono text-[9px] text-rose-400">
                        SUSPENDED · FAILED {(s as { failureCount?: number }).failureCount ?? 0}X
                        {(s as { suspendedAt?: string }).suspendedAt && (
                          <>
                            {" "}
                            · RETRY IN{" "}
                            {Math.max(
                              0,
                              60 -
                                Math.round(
                                  (Date.now() -
                                    new Date((s as { suspendedAt: string }).suspendedAt).getTime()) /
                                    60000
                                )
                            )}M
                          </>
                        )}
                      </div>
                    )}
                    {"failureCount" in s &&
                      (s as { failureCount?: number }).failureCount != null &&
                      (s as { failureCount: number }).failureCount > 0 &&
                      !(s as { suspended?: boolean }).suspended && (
                        <div className="mt-0.5 font-mono text-[9px] text-amber-400">
                          DEGRADED ({(s as { failureCount: number }).failureCount} FAILS)
                        </div>
                      )}
                    {s.errorRate > 0 && !("suspended" in s && s.suspended) && (
                      <div className="mt-0.5 font-mono text-[9px] text-rose-400">
                        {Math.round(s.errorRate * 100)}% ERROR
                      </div>
                    )}
                  </div>
                  <div className="flex justify-center pt-0.5 tabular-nums">
                    <div className="whitespace-nowrap text-center font-mono text-[10px] text-[#888]">
                      {s.updateCount}
                    </div>
                  </div>
                  <div className="flex shrink-0 justify-end pt-0.5">
                    <span
                      className={cn(
                        "inline-flex whitespace-nowrap rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                        s.status === "live" &&
                          "bg-emerald-500/10 text-emerald-400",
                        s.status === "error" &&
                          "bg-rose-500/10 text-rose-400",
                        s.status === "stale" &&
                          "bg-amber-500/10 text-amber-400"
                      )}
                    >
                      {s.status}
                    </span>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}

        {sources && sources.length > 0 && totalPages > 1 && (
          <div className={cn(railPagination, "rounded-b-xl")}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] text-[#555]">
                PAGE {page + 1} OF {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded p-1 transition-colors hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="h-3 w-3 text-[#888]" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  className="rounded p-1 transition-colors hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="h-3 w-3 text-[#888]" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Notes Section                                                        */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Shared sections (exported)                                          */
/* ------------------------------------------------------------------ */

export function IntelRailSections() {
  return (
    <>
      <AnomaliesSection />
      <WatchlistSection />
      <AlertRulesSection />
      <SourceHealthSection />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Intel Rail (exported)                                               */
/* ------------------------------------------------------------------ */

export function IntelRail() {
  const isOpen = useSelector((s: RootState) => s.ui.intelRailOpen);

  return (
    <>
      <aside
        className={cn(
          "fixed inset-x-0 bottom-14 top-12 z-40 overflow-y-auto border-t border-white/10 bg-[#050505] px-3 pb-3 pt-3 scrollbar-thin transition-[transform,opacity] duration-200 ease-out md:hidden",
          isOpen
            ? "translate-x-0 opacity-100"
            : "pointer-events-none translate-x-full opacity-0"
        )}
      >
        <div className="space-y-3">
          <IntelRailSections />
        </div>
      </aside>

      <aside
        className={cn(
          "fixed bottom-8 right-0 top-12 z-40 hidden w-[300px] overflow-y-auto border-l border-white/10 bg-[#050505] scrollbar-thin transition-[transform,opacity] duration-200 ease-out md:block",
          isOpen
            ? "translate-x-0 opacity-100"
            : "pointer-events-none translate-x-full opacity-0"
        )}
      >
        <div className="space-y-3 p-3">
          <IntelRailSections />
        </div>
      </aside>
    </>
  );
}
