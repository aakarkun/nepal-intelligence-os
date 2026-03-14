"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Wifi,
  ShieldAlert,
  Eye,
  EyeOff,
  Activity,
  StickyNote,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn, timeAgo } from "@/lib/utils";
import { useRealtimeStore } from "@/stores/realtime-store";
import { useFilterStore } from "@/stores/filter-store";
import { fetchAnomalies, fetchConstituency, fetchSourceHealth } from "@/lib/api";

/* ------------------------------------------------------------------ */
/* Collapsible Section                                                  */
/* ------------------------------------------------------------------ */

function Section({
  title,
  icon: Icon,
  defaultOpen = true,
  trailing,
  children,
}: {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left">{title}</span>
        {trailing && <span className="flex items-center gap-0.5 mr-1">{trailing}</span>}
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Connection Section                                                   */
/* ------------------------------------------------------------------ */

function ConnectionSection() {
  const connectionStatus = useRealtimeStore((s) => s.connectionStatus);
  const lastHeartbeat = useRealtimeStore((s) => s.lastHeartbeat);

  const heartbeatAge = lastHeartbeat
    ? Math.round((Date.now() - lastHeartbeat) / 1000)
    : null;

  return (
    <Section title="Connection" icon={Wifi}>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-block h-2 w-2 rounded-full animate-pulse-live",
            connectionStatus === "live" && "bg-status-live",
            connectionStatus === "stale" && "bg-status-stale",
            connectionStatus === "error" && "bg-status-error"
          )}
        />
        <span className="text-xs capitalize text-foreground">
          {connectionStatus === "error" ? "Disconnected" : connectionStatus}
        </span>
      </div>
      <p className="mt-1 font-mono text-[10px] tabular-nums text-muted-foreground">
        {heartbeatAge !== null
          ? `Last heartbeat: ${heartbeatAge}s ago`
          : "No heartbeat received"}
      </p>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Anomalies Section                                                    */
/* ------------------------------------------------------------------ */

function AnomaliesSection() {
  const realtimeAnomalies = useRealtimeStore((s) => s.anomalies);
  const { data: apiAnomalies = [] } = useQuery({
    queryKey: ["anomalies"],
    queryFn: fetchAnomalies,
    refetchInterval: 30_000,
  });

  const merged = useMemo(() => {
    const byId = new Map<string, typeof realtimeAnomalies[number]>();
    for (const a of apiAnomalies) {
      byId.set(a.id, a);
    }
    for (const a of realtimeAnomalies) {
      byId.set(a.id, a);
    }
    // Sort primarily by recency (latest first), severity as tiebreaker.
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
  }, [apiAnomalies, realtimeAnomalies]);

  const topItems = merged.slice(0, 5);

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
    <Section
      title="Anomalies"
      icon={ShieldAlert}
      trailing={
        merged.length > 0 && (
          <span className="flex gap-[3px]">
            {dotSeverities.map((sev, idx) => (
              <span
                key={idx}
                className={cn(
                  "h-2 w-2 rounded-[2px] bg-muted/40 animate-health-dot",
                  sev === "info" && "bg-muted/80",
                  sev === "warning" && "bg-status-stale/80",
                  sev === "critical" && "bg-status-error/80"
                )}
                style={{ animationDelay: `${(idx * 0.9) % 4.5}s` }}
              />
            ))}
          </span>
        )
      }
    >
      {topItems.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">No anomalies detected</p>
      ) : (
        <>
          <ul className="space-y-2">
            {topItems.map((a, i) => (
              <li key={a.id ?? i} className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "rounded px-1 py-0.5 text-[9px] font-semibold uppercase leading-none",
                      a.severity === "critical" && "bg-status-error/20 text-status-error",
                      a.severity === "warning" && "bg-status-stale/20 text-status-stale",
                      a.severity === "info" && "bg-muted text-muted-foreground"
                    )}
                  >
                    {a.type}
                  </span>
                </div>
                <p
                  className="text-[10px] text-foreground/80"
                  title={a.details}
                >
                  {a.details}
                </p>
                <p className="font-mono text-[9px] tabular-nums text-muted-foreground">
                  {timeAgo(a.timestamp)}
                </p>
              </li>
            ))}
          </ul>
          {merged.length > topItems.length && (
            <div className="mt-2 flex justify-end">
              <Link
                href="/disasters?focus=anomalies"
                className="text-[10px] font-medium text-nepal-red hover:underline"
              >
                View more &rarr;
              </Link>
            </div>
          )}
        </>
      )}
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Watchlist Section                                                     */
/* ------------------------------------------------------------------ */

function WatchlistSection() {
  const watchlist = useRealtimeStore((s) => s.watchlist);
  const candidateWatchlist = useRealtimeStore((s) => s.candidateWatchlist);

  return (
    <Section title="Watchlist" icon={Eye}>
      {watchlist.length === 0 && candidateWatchlist.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">
          No constituencies or candidates watched
        </p>
      ) : (
        <div className="space-y-1.5">
          {watchlist.length > 0 && (
            <ul className="space-y-1.5">
              {watchlist.map((id) => (
                <WatchlistItem key={id} id={id} />
              ))}
            </ul>
          )}
          {candidateWatchlist.length > 0 && (
            <ul className="space-y-1.5 pt-1 border-t border-white/10">
              {candidateWatchlist.map((c) => (
                <CandidateWatchItem key={c.candidateId} candidate={c} />
              ))}
            </ul>
          )}
        </div>
      )}
    </Section>
  );
}

function WatchlistItem({ id }: { id: string }) {
  const router = useRouter();
  const removeFromWatchlist = useRealtimeStore((s) => s.removeFromWatchlist);
  const { data, isLoading } = useQuery({
    queryKey: ["watchlist-constituency", id],
    queryFn: () => fetchConstituency(id),
  });

  return (
    <li>
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
        className="group flex w-full items-center justify-between rounded-md px-1.5 py-1 text-left text-[11px] hover:bg-muted/60 transition-colors cursor-pointer"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-foreground/90 font-medium">
              {data?.constituencyName ?? id}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeFromWatchlist(id);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-nepal-red"
              title="Remove from watchlist"
            >
              <EyeOff className="h-3 w-3" />
            </button>
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            {data
              ? `${data.districtName} · ${
                  data.status === "final"
                    ? "Final"
                    : data.status === "counting"
                      ? "Counting"
                      : data.status
                }`
              : isLoading
                ? "Loading…"
                : "Details unavailable"}
          </div>
        </div>
        {data && (
          <span className="ml-2 font-mono text-[10px] text-foreground/80">
            {data.totalVotes.toLocaleString("en-IN")} votes
          </span>
        )}
      </div>
    </li>
  );
}

function CandidateWatchItem({
  candidate,
}: {
  candidate: {
    candidateId: string;
    constituencyId: string;
    candidateName: string;
    partyName: string;
  };
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
    <li>
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
        className="group flex w-full items-center justify-between rounded-md px-1.5 py-1 text-left text-[11px] hover:bg-muted/60 transition-colors cursor-pointer"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-foreground/90 font-medium">
              {candidate.candidateName}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeCandidateFromWatchlist(candidate.candidateId);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-nepal-red"
              title="Remove candidate from watchlist"
            >
              <EyeOff className="h-3 w-3" />
            </button>
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            Seat: {candidate.constituencyId}
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
          <span className="ml-2 font-mono text-[10px] text-foreground/80">
            {candidateVotes.toLocaleString("en-IN")} votes
          </span>
        )}
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Source Health Section                                                 */
/* ------------------------------------------------------------------ */

function SourceHealthSection() {
  const { data: sources } = useQuery({
    queryKey: ["source-health"],
    queryFn: fetchSourceHealth,
    refetchInterval: 30_000,
  });

  const liveCount = sources?.filter((s) => s.status === "live").length ?? 0;
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

  return (
    <Section
      title="Source Health"
      icon={Activity}
      trailing={
        <span className="flex gap-[3px]">
          {dots.map((status, idx) => (
            <span
              key={idx}
              className={cn(
                "h-2 w-2 rounded-[2px] bg-muted/40 animate-health-dot",
                status === "live" && "bg-status-live/80",
                status === "stale" && "bg-status-stale/80",
                status === "error" && "bg-status-error/80"
              )}
              style={{ animationDelay: `${(idx * 0.9) % 2.7}s` }}
            />
          ))}
        </span>
      }
    >
      {!sources || sources.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">No source data</p>
      ) : (
        <ul className="space-y-1.5">
          {sources
            .slice()
            .sort((a, b) => b.updateCount - a.updateCount)
            .map((s) => (
            <li key={s.sourceId} className="space-y-0.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "inline-block h-1.5 w-1.5 rounded-full",
                      s.status === "live" && "bg-status-live",
                      s.status === "stale" && "bg-status-stale",
                      s.status === "error" && "bg-status-error"
                    )}
                  />
                  <span className="text-xs text-foreground/80">
                    {s.sourceName}
                  </span>
                </div>
                <span className="font-mono text-[9px] tabular-nums text-muted-foreground">
                  Last success: {s.lastUpdate ? timeAgo(s.lastUpdate) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between pl-3">
                <span className="font-mono text-[9px] tabular-nums text-muted-foreground">
                  {s.updateCount} updates
                  {s.sourceId === "social" && " • X + Reddit"}
                </span>
                {s.errorRate > 0 && (
                  <span className="font-mono text-[9px] tabular-nums text-status-error">
                    {Math.round(s.errorRate * 100)}% error
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Notes Section                                                        */
/* ------------------------------------------------------------------ */

function NotesSection() {
  const [notes, setNotes] = useState("");

  return (
    <Section title="Notes" icon={StickyNote} defaultOpen={false}>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Scratch notes…"
        className="h-24 w-full resize-none rounded-md border border-border bg-background p-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-nepal-red/50"
      />
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Intel Rail (exported)                                                 */
/* ------------------------------------------------------------------ */

export function IntelRail() {
  const isOpen = useFilterStore((s) => s.intelRailOpen);

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile: full-width sheet above bottom nav */}
      <aside className="fixed inset-x-0 bottom-14 top-12 z-40 overflow-y-auto border-t border-border bg-card px-3 pb-3 pt-2 scrollbar-thin md:hidden">
        <ConnectionSection />
        <AnomaliesSection />
        <WatchlistSection />
        <SourceHealthSection />
        <NotesSection />
      </aside>

      {/* Desktop / tablet: right rail */}
      <aside className="fixed bottom-8 right-0 top-12 z-40 hidden w-72 overflow-y-auto border-l border-border bg-card px-0 scrollbar-thin md:block">
        <ConnectionSection />
        <AnomaliesSection />
        <WatchlistSection />
        <SourceHealthSection />
        <NotesSection />
      </aside>
    </>
  );
}
