"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Command, PanelRight, Sparkles } from "@/components/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TopBarHeading } from "@/components/layout/top-bar-heading";
import { cn } from "@/lib/utils";
import { formatNepalTime } from "@/lib/utils";
import { useRealtimeStore } from "@/stores/realtime-store";
import { useDispatch, useSelector } from "react-redux";
import { useFilterStore } from "@/stores/filter-store";
import { setBriefingPanelOpen, toggleIntelRail } from "@/store/slices/uiSlice";
import { useLanguage } from "@/providers/language-provider";
import type { RootState } from "@/store";
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
  const dispatch = useDispatch();
  const openBriefing = () => dispatch(setBriefingPanelOpen(true));
  const togglePanel = () => dispatch(toggleIntelRail());
  const intelRailOpen = useSelector((s: RootState) => s.ui.intelRailOpen);
  const { language, toggleLanguage } = useLanguage();

  useEffect(() => {
    function tick() {
      setTime(formatNepalTime(new Date()));
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (pathname === "/") {
      setActiveModule("discover");
      return;
    }
    if (pathname.startsWith("/political-pulse") || pathname.startsWith("/map") || pathname.startsWith("/constituencies")) {
      setActiveModule("parliament");
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
    if (pathname.startsWith("/world")) {
      setActiveModule("world");
      return;
    }
    if (pathname.startsWith("/news-room")) {
      setActiveModule("media");
      return;
    }
  }, [pathname, setActiveModule]);

  const status = STATUS_CONFIG[connectionStatus];

  return (
    <header className="sticky top-0 z-50 flex min-h-12 shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] bg-transparent px-3 py-2 sm:px-4">
      <TopBarHeading />
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {/* Language toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 rounded-full border border-border px-2 py-1 text-[13px] text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
            >
              <span className="font-sans text-[12px] uppercase">
                {language === "en" ? "EN" : "NP"}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Toggle news language</TooltipContent>
        </Tooltip>
        {/* AI Briefing (Sparkles) — opens briefing modal */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={openBriefing}
              className="flex items-center gap-1.5 rounded-full border border-border px-2 py-1 text-[13px] text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
            >
              <Sparkles className="h-3 w-3" />
              <span className="hidden xs:inline sm:inline">Briefing</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Generate briefing</TooltipContent>
        </Tooltip>
        {/* Panel rail toggle — show/hide right sidebar */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={togglePanel}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2 py-1 text-[13px] transition-colors",
                intelRailOpen
                  ? "border-white/[0.12] bg-white/[0.08] text-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground"
              )}
            >
              <PanelRight className="h-3 w-3" />
              <span className="hidden xs:inline sm:inline">Panel</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Toggle right panel</TooltipContent>
        </Tooltip>
        {/* ⌘K trigger (icon-only on xs) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onCommandOpen}
              className="flex items-center gap-1.5 rounded-full border border-border px-2 py-1 text-[13px] text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
            >
              <Command className="h-3 w-3" />
              <span className="hidden sm:inline">
                <kbd className="font-sans text-[12px]">K</kbd>
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Command palette (⌘K)</TooltipContent>
        </Tooltip>

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
              "text-[12px] font-semibold uppercase tracking-wider",
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
          className="hidden min-w-[5rem] text-right font-sans text-xs tabular-nums text-muted-foreground sm:inline"
          suppressHydrationWarning
        >
          {time ?? "—:—:—"}
          <span className="ml-1 text-[11px] text-muted-foreground/60">NPT</span>
        </time>
      </div>
    </header>
  );
}
