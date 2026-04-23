"use client";

import { useState } from "react";
import { ElectionDatasetSelector } from "@/components/election-dataset-selector";
import { GeographyDrawer } from "@/components/map/geography-drawer";
import { NepalMap, type MapLayerMode } from "@/components/map/nepal-map";
export default function MapPage() {
  const [selection, setSelection] = useState<
    | { type: "district"; districtName: string }
    | { type: "province"; provinceId: number }
    | null
  >(null);
  const [layerMode, setLayerMode] = useState<MapLayerMode>("election");

  return (
    // Stretch to edges of main content; negative margins match dashboard horizontal padding
    <div className="relative -mx-4 -mt-4 -mb-4 md:-mx-6 md:-mt-6 md:-mb-6">
      <div className="absolute left-2 right-2 top-2 z-10 rounded-md border border-border bg-card/90 px-3 py-2 backdrop-blur sm:left-4 sm:right-auto sm:top-4 sm:px-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <div className="min-w-0">
            <ElectionDatasetSelector />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-1.5">
            <span className="shrink-0 text-[12px] text-muted-foreground uppercase tracking-wider sm:text-[13px]">
              Layer:
            </span>
            {(["election", "seismic", "incidents"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setLayerMode(mode)}
                className={`touch-manipulation rounded px-2 py-1.5 text-[12px] font-medium transition-colors sm:py-1 sm:text-[13px] ${
                  layerMode === mode
                    ? "bg-nepal-red/20 text-nepal-red"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {mode === "election" ? "Election" : mode === "seismic" ? "Seismic" : "Incidents"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <NepalMap
        className="h-[calc(100dvh-7.5rem)] min-h-[240px] w-full md:h-[calc(100vh-5rem)]"
        layerMode={layerMode}
        onDistrictClick={(districtName) =>
          setSelection({ type: "district", districtName })
        }
        onProvinceClick={(provinceId) =>
          setSelection({ type: "province", provinceId })
        }
        geoJsonUrl="/nepal-districts.geojson"
      />

      <GeographyDrawer
        selection={selection}
        onClose={() => setSelection(null)}
        onSelectDistrict={(districtName) =>
          setSelection({ type: "district", districtName })
        }
      />
    </div>
  );
}
