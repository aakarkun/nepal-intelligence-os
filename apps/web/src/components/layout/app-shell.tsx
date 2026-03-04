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
          "ml-14 mt-12 mb-8 min-h-[calc(100vh-5rem)] p-6 transition-[margin] duration-200",
          intelRailOpen ? "mr-72" : "mr-0"
        )}
      >
        {children}
      </main>
      {intelRailOpen && <IntelRail />}
      <Ticker />
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  );
}
