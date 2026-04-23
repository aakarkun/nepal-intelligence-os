"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { TopBar } from "./top-bar";
import { ShellHeaderProvider } from "./shell-header-context";
import { AppSidebar } from "./app-sidebar";
import { IntelRail } from "./intel-rail";
import { Ticker } from "./ticker";
import { CommandPalette } from "@/components/command-palette";
import { IntelPanel } from "@/components/intel/intel-panel";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const intelRailOpen = useSelector((s: RootState) => s.ui.intelRailOpen);
  const pathname = usePathname();
  const isEconomyRoute = pathname.startsWith("/economy");
  const isWorldRoute = pathname.startsWith("/world");
  const isParliamentRoute = pathname.startsWith("/parliament");
  /** Inline document-flow intel column on these routes; avoid stacking a fixed overlay rail. */
  const inlineIntelRailRoute = isEconomyRoute || isWorldRoute || isParliamentRoute;
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <ShellHeaderProvider>
        <SidebarProvider defaultOpen>
          <AppSidebar />
          <SidebarInset
            className={cn(
              "flex min-h-svh flex-col bg-transparent transition-[margin] duration-100 ease-out overflow-x-hidden",
              intelRailOpen && !inlineIntelRailRoute ? "md:mr-[var(--intel-rail-width)]" : "md:mr-0"
            )}
          >
            <a
              href="#main-content"
              className={cn(
                "sr-only focus:not-sr-only",
                "fixed left-3 top-3 z-[100] rounded-md border border-white/[0.12] bg-black/80 px-3 py-2",
                "font-sans text-[12px] text-white shadow-md",
                "focus-visible:outline-none"
              )}
            >
              Skip to content
            </a>
            <TopBar onCommandOpen={() => setCommandOpen(true)} />
            <main
              id="main-content"
              tabIndex={-1}
              className="flex min-h-0 flex-1 flex-col px-0 py-4 pb-[max(2.5rem,calc(2rem+env(safe-area-inset-bottom)))] md:px-6 md:py-6 md:pb-[max(2.5rem,env(safe-area-inset-bottom))]"
            >
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </ShellHeaderProvider>
      {!inlineIntelRailRoute && <IntelRail />}
      <Ticker />
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      <IntelPanel />
    </>
  );
}
