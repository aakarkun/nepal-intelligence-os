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
    // Stretch to edges of main content, but respect Intel Rail on the right
    <div className="relative -ml-6 -mt-6 -mb-6">
      <div className="absolute top-4 left-4 z-10 bg-card/80 backdrop-blur px-4 py-2 rounded-md border border-border">
        <h1 className="font-display text-lg font-bold tracking-tight">
          Tactical Map
        </h1>
        <p className="text-xs text-muted-foreground">
          Nepal district choropleth — click to explore
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <ElectionDatasetSelector />
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] text-muted-foreground uppercase tracking-wider">Layer:</span>
            {(["election", "seismic", "incidents"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setLayerMode(mode)}
                className={`rounded px-2 py-1 text-[13px] font-medium transition-colors ${
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
        className="w-full h-[calc(100vh-5rem)]"
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
