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
  /** Inline document-flow intel column on these routes; avoid stacking a fixed overlay rail. */
  const inlineIntelRailRoute = isEconomyRoute || isWorldRoute;
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
              "flex min-h-svh flex-col transition-[margin] duration-100 ease-out bg-transparent",
              intelRailOpen && !inlineIntelRailRoute ? "md:mr-[var(--intel-rail-width)]" : "md:mr-0"
            )}
          >
            <TopBar onCommandOpen={() => setCommandOpen(true)} />
            <div className="flex min-h-0 flex-1 flex-col px-4 py-4 pb-10 md:px-6 md:py-6 md:pb-10">
              {children}
            </div>
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
