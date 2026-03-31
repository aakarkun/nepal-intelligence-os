"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { FlatRailPanelHeader, IntelRailSections } from "@/components/layout/intel-rail";
import { discoverShellClass } from "@/components/discover/discover-rail-tokens";
import { SeatTiles } from "@/components/parliament/seat-tiles";
import { SeatMapModeToggle } from "@/components/parliament/seat-map-mode-toggle";
import { ParliamentPartyDetails } from "@/components/parliament/parliament-party-details";
import { CoalitionBuilder } from "@/components/parliament/coalition-builder";
import { ParliamentPartySeatsPie } from "@/components/parliament/parliament-party-seats-pie";
import {
  ParliamentProportionalHor,
  useParliamentProportionalHorVisible,
} from "@/components/parliament/parliament-proportional-hor";
import { ElectionDatasetSelector } from "@/components/election-dataset-selector";
import { cn } from "@/lib/utils";
import type { HorSeatMapMode } from "@repo/shared";
import { useElectionDatasetStore } from "@/stores/election-dataset-store";

const panelBodyClass = "min-w-0 px-2 pb-2";

export default function ParliamentPage() {
  const [seatMapMode, setSeatMapMode] = useState<HorSeatMapMode>("total");
  const [focusPartyId, setFocusPartyId] = useState<string | null>(null);
  const selectedDatasetId = useElectionDatasetStore((s) => s.selectedDatasetId);
  const panelOpen = useSelector((s: RootState) => s.ui.intelRailOpen);
  const proportionalSectionVisible = useParliamentProportionalHorVisible();

  useEffect(() => {
    setFocusPartyId(null);
  }, [selectedDatasetId, seatMapMode]);

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
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:items-start">
            <div className="min-w-0 space-y-4 xl:col-span-7">
              <div className={cn(discoverShellClass, "min-w-0")}>
                <FlatRailPanelHeader
                  title="Seat map"
                  leadingDotClass="bg-cyan-500"
                  right={
                    <SeatMapModeToggle mode={seatMapMode} onModeChange={setSeatMapMode} />
                  }
                />
                <div className={panelBodyClass}>
                  <SeatTiles
                    mode={seatMapMode}
                    focusPartyId={focusPartyId}
                    onClearFocus={() => setFocusPartyId(null)}
                  />
                </div>
              </div>
              {proportionalSectionVisible ? <ParliamentProportionalHor /> : null}
            </div>
            <div className="min-w-0 space-y-4 xl:col-span-5">
              <ParliamentPartySeatsPie
                mode={seatMapMode}
                focusPartyId={focusPartyId}
                onFocusParty={setFocusPartyId}
              />
              <div className={cn(discoverShellClass, "min-w-0")}>
                <FlatRailPanelHeader
                  title="Party details"
                  leadingDotClass="bg-sky-500"
                />
                <div className={panelBodyClass}>
                  <ParliamentPartyDetails
                    mode={seatMapMode}
                    focusPartyId={focusPartyId}
                    onFocusParty={setFocusPartyId}
                  />
                </div>
              </div>
              <div className={cn(discoverShellClass, "min-w-0")}>
                <FlatRailPanelHeader
                  title="Coalition builder"
                  leadingDotClass="bg-violet-500"
                />
                <div className={panelBodyClass}>
                  <CoalitionBuilder />
                </div>
              </div>
            </div>
          </div>
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
