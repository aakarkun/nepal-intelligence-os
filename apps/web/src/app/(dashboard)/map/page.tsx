"use client";

import { useState } from "react";
import { ElectionDatasetSelector } from "@/components/election-dataset-selector";
import { GeographyDrawer } from "@/components/map/geography-drawer";
import { NepalMap } from "@/components/map/nepal-map";

export default function MapPage() {
  const [selection, setSelection] = useState<
    | { type: "district"; districtName: string }
    | { type: "province"; provinceId: number }
    | null
  >(null);

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
        <div className="mt-3">
          <ElectionDatasetSelector />
        </div>
      </div>

      <NepalMap
        className="w-full h-[calc(100vh-5rem)]"
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
