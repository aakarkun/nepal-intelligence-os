"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useFilterStore } from "@/stores/filter-store";
import { TopBar } from "./top-bar";
import { NavRail } from "./nav-rail";
import { IntelRail } from "./intel-rail";
import { Ticker } from "./ticker";
import { CommandPalette } from "@/components/command-palette";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const intelRailOpen = useFilterStore((s) => s.intelRailOpen);
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
      <TopBar onCommandOpen={() => setCommandOpen(true)} />
      <NavRail />
      <main
        className={cn(
          // Mobile: padded, full-width, account for top bar & bottom nav
          "mt-14 mb-20 min-h-[calc(100vh-6.5rem)] px-4 py-4",
          // md+: make room for left rail + optional intel rail + ticker
          "md:ml-14 md:mt-12 md:mb-8 md:min-h-[calc(100vh-5rem)] md:px-6 md:py-6",
          "transition-[margin] duration-200",
          intelRailOpen ? "md:mr-72" : "md:mr-0"
        )}
      >
        {children}
      </main>
      <IntelRail />
      <Ticker />
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  );
}
