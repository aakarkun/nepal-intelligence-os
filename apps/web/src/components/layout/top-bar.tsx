"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Command, PanelRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNepalTime } from "@/lib/utils";
import { useRealtimeStore } from "@/stores/realtime-store";
import { useFilterStore } from "@/stores/filter-store";

const MODULES = [
  { id: "election", label: "Election", href: "/", ready: true },
  { id: "parliament", label: "Parliament", href: "/parliament", ready: true },
  { id: "economy", label: "Economy", href: "/economy", ready: true },
  { id: "crisis", label: "Crisis", href: "/disasters", ready: true },
  { id: "media", label: "Media", href: "/news-room", ready: false },
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
  const pathname = usePathname();
  const connectionStatus = useRealtimeStore((s) => s.connectionStatus);
  const setActiveModule = useFilterStore((s) => s.setActiveModule);
  const toggleIntelRail = useFilterStore((s) => s.toggleIntelRail);
  const setBriefingPanelOpen = useFilterStore((s) => s.setBriefingPanelOpen);

  useEffect(() => {
    function tick() {
      setTime(formatNepalTime(new Date()));
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (pathname === "/" || pathname.startsWith("/map") || pathname.startsWith("/constituencies")) {
      setActiveModule("election");
      return;
    }
    if (pathname.startsWith("/parliament")) {
      setActiveModule("parliament");
      return;
    }
    if (pathname.startsWith("/economy")) {
      setActiveModule("economy");
      return;
    }
    if (pathname.startsWith("/disasters")) {
      setActiveModule("crisis");
      return;
    }
    if (pathname.startsWith("/news-room")) {
      setActiveModule("media");
      return;
    }
  }, [pathname, setActiveModule]);

  const status = STATUS_CONFIG[connectionStatus];

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-12 items-center justify-between border-b border-border bg-background/80 px-3 backdrop-blur sm:px-4">
      {/* Left — Logo */}
      <Link
        href="/"
        className="flex items-center gap-2 font-display text-xs font-semibold tracking-tight text-foreground transition-colors hover:text-nepal-red sm:text-sm"
      >
        Nepal Intelligence OS
      </Link>

      {/* Center — Module pills (hidden on very small screens) */}
      <nav className="hidden items-center gap-1 md:flex">
        {MODULES.map((mod) => {
          const isActive =
            mod.href === "/" ? pathname === "/" : pathname.startsWith(mod.href);

          return mod.ready ? (
            <Link
              key={mod.id}
              href={mod.href}
              className={cn(
                "relative rounded-md px-3 py-1 text-xs font-medium transition-colors",
                isActive
                  ? "bg-nepal-red/15 text-nepal-red"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {mod.label}
            </Link>
          ) : (
            <span
              key={mod.id}
              className="relative rounded-md px-3 py-1 text-xs font-medium cursor-not-allowed text-muted-foreground/50"
              title="Soon"
            >
              {mod.label}
              <span className="absolute -right-1 -top-1 rounded-full bg-muted px-1 text-[9px] leading-tight text-muted-foreground">
                Soon
              </span>
            </span>
          );
        })}
      </nav>

      {/* Right — Briefing, Panel toggle, Command, Status, Clock */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* AI Briefing (Sparkles) — opens briefing modal */}
        <button
          onClick={() => setBriefingPanelOpen(true)}
          className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
          title="Generate briefing"
        >
          <Sparkles className="h-3 w-3" />
          <span className="hidden xs:inline sm:inline">Briefing</span>
        </button>
        {/* Panel rail toggle — show/hide right sidebar */}
        <button
          onClick={toggleIntelRail}
          className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
          title="Toggle right panel"
        >
          <PanelRight className="h-3 w-3" />
          <span className="hidden xs:inline sm:inline">Panel</span>
        </button>
        {/* ⌘K trigger (icon-only on xs) */}
        <button
          onClick={onCommandOpen}
          className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
        >
          <Command className="h-3 w-3" />
          <span className="hidden sm:inline">
            <kbd className="font-mono text-[10px]">K</kbd>
          </span>
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
          className="hidden min-w-[5rem] text-right font-mono text-xs tabular-nums text-muted-foreground sm:inline"
          suppressHydrationWarning
        >
          {time ?? "—:—:—"}
          <span className="ml-1 text-[9px] text-muted-foreground/60">NPT</span>
        </time>
      </div>
    </header>
  );
}
