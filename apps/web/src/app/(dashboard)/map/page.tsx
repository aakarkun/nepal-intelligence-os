"use client";

import { useState } from "react";
import { NepalMap } from "@/components/map/nepal-map";
import { DistrictDrawer } from "@/components/map/district-drawer";

export default function MapPage() {
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);

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
      </div>

      <NepalMap
        className="w-full h-[calc(100vh-5rem)]"
        onDistrictClick={setSelectedDistrict}
        geoJsonUrl="/nepal-districts.geojson"
      />

      <DistrictDrawer
        districtName={selectedDistrict}
        onClose={() => setSelectedDistrict(null)}
      />
    </div>
  );
}
