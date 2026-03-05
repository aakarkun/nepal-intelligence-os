"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Wifi,
  ShieldAlert,
  Eye,
  Activity,
  StickyNote,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils";
import { useRealtimeStore } from "@/stores/realtime-store";
import { useFilterStore } from "@/stores/filter-store";
import { fetchSourceHealth } from "@/lib/api";

/* ------------------------------------------------------------------ */
/* Collapsible Section                                                  */
/* ------------------------------------------------------------------ */

function Section({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
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
  const anomalies = useRealtimeStore((s) => s.anomalies);
  const top5 = anomalies.slice(0, 5);

  return (
    <Section title="Anomalies" icon={ShieldAlert}>
      {top5.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">No anomalies detected</p>
      ) : (
        <ul className="space-y-2">
          {top5.map((a, i) => (
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
              <p className="truncate text-[10px] text-foreground/80">
                {a.details}
              </p>
              <p className="font-mono text-[9px] tabular-nums text-muted-foreground">
                {timeAgo(a.timestamp)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Watchlist Section                                                     */
/* ------------------------------------------------------------------ */

function WatchlistSection() {
  const watchlist = useRealtimeStore((s) => s.watchlist);

  return (
    <Section title="Watchlist" icon={Eye}>
      {watchlist.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">
          No constituencies watched
        </p>
      ) : (
        <ul className="space-y-1.5">
          {watchlist.map((id) => (
            <li key={id} className="flex items-center justify-between">
              <span className="truncate text-xs text-foreground/80">{id}</span>
              {/* Placeholder sparkline */}
              <div className="flex h-3 items-end gap-px">
                {Array.from({ length: 8 }).map((_, j) => (
                  <div
                    key={j}
                    className="w-[3px] rounded-sm bg-nepal-red/40"
                    style={{ height: `${Math.random() * 100}%` }}
                  />
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
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

  return (
    <Section title="Source Health" icon={Activity}>
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
                  {s.lastUpdate ? timeAgo(s.lastUpdate) : "—"}
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
