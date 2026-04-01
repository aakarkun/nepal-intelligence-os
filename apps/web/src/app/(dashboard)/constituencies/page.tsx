"use client";

import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { IntelRailSections } from "@/components/layout/intel-rail";
import { ConstituenciesTable } from "@/components/constituencies/constituencies-table";
import { ElectionDatasetSelector } from "@/components/election-dataset-selector";
import { cn } from "@/lib/utils";

export default function ConstituenciesPage() {
  const panelOpen = useSelector((s: RootState) => s.ui.intelRailOpen);

  return (
    <div
      className={cn(
        "-mx-4 px-4 pb-10 md:-mx-6 md:px-6 min-h-full bg-transparent text-[#e5e5e5] antialiased"
      )}
    >
      <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
        <ElectionDatasetSelector />
      </div>

      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <ConstituenciesTable />
        </div>

        <aside
          className={cn(
            "hidden shrink-0 overflow-hidden transition-[transform,opacity,width] duration-200 ease-out lg:block",
            panelOpen
              ? "w-[var(--intel-rail-width)] translate-x-0 opacity-100"
              : "pointer-events-none w-0 translate-x-6 opacity-0"
          )}
        >
          <div className="space-y-3">
            <IntelRailSections />
          </div>
        </aside>
      </div>
    </div>
  );
}
