"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Command } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNepalTime } from "@/lib/utils";
import { useRealtimeStore } from "@/stores/realtime-store";
import { useFilterStore } from "@/stores/filter-store";

const MODULES = [
  { id: "election", label: "Election", ready: true },
  { id: "parliament", label: "Parliament", ready: false },
  { id: "economy", label: "Economy", ready: false },
  { id: "crisis", label: "Crisis", ready: false },
  { id: "media", label: "Media", ready: false },
] as const;

const STATUS_CONFIG = {
  live: { color: "bg-status-live", label: "LIVE" },
  stale: { color: "bg-status-stale", label: "STALE" },
  error: { color: "bg-status-error", label: "OFFLINE" },
} as const;

interface TopBarProps {
  onCommandOpen: () => void;
}

export function TopBar({ onCommandOpen }: TopBarProps) {
  const [time, setTime] = useState<string | null>(null);
  const connectionStatus = useRealtimeStore((s) => s.connectionStatus);
  const activeModule = useFilterStore((s) => s.activeModule);
  const setActiveModule = useFilterStore((s) => s.setActiveModule);

  useEffect(() => {
    function tick() {
      setTime(formatNepalTime(new Date()));
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const status = STATUS_CONFIG[connectionStatus];

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-12 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur">
      {/* Left — Logo */}
      <Link
        href="/"
        className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight text-foreground transition-colors hover:text-nepal-red"
      >
        Nepal Intelligence OS
      </Link>

      {/* Center — Module pills */}
      <nav className="flex items-center gap-1">
        {MODULES.map((mod) => (
          <button
            key={mod.id}
            disabled={!mod.ready}
            onClick={() => mod.ready && setActiveModule(mod.id)}
            className={cn(
              "relative rounded-md px-3 py-1 text-xs font-medium transition-colors",
              activeModule === mod.id
                ? "bg-nepal-red/15 text-nepal-red"
                : mod.ready
                  ? "text-muted-foreground hover:text-foreground"
                  : "cursor-not-allowed text-muted-foreground/50"
            )}
            title={!mod.ready ? "Soon" : undefined}
          >
            {mod.label}
            {!mod.ready && (
              <span className="absolute -right-1 -top-1 rounded-full bg-muted px-1 text-[9px] leading-tight text-muted-foreground">
                Soon
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Right — Command, Status, Clock */}
      <div className="flex items-center gap-3">
        {/* ⌘K trigger */}
        <button
          onClick={onCommandOpen}
          className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
        >
          <Command className="h-3 w-3" />
          <kbd className="font-mono text-[10px]">K</kbd>
        </button>

        {/* LIVE indicator */}
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "inline-block h-2 w-2 rounded-full animate-pulse-live",
              status.color
            )}
          />
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wider",
              connectionStatus === "live" && "text-status-live",
              connectionStatus === "stale" && "text-status-stale",
              connectionStatus === "error" && "text-status-error"
            )}
          >
            {status.label}
          </span>
        </div>

        {/* Nepal time */}
        <time
          className="min-w-[5rem] text-right font-mono text-xs tabular-nums text-muted-foreground"
          suppressHydrationWarning
        >
          {time ?? "—:—:—"}
          <span className="ml-1 text-[9px] text-muted-foreground/60">NPT</span>
        </time>
      </div>
    </header>
  );
}
