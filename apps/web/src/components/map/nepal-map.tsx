"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useQuery } from "@tanstack/react-query";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";
import { fetchConstituencies } from "@/lib/api";
import type { ConstituencyResult } from "@repo/shared";
import { PROVINCES } from "@repo/shared";
import { useFilterStore } from "@/stores/filter-store";
import { useElectionDatasetStore } from "@/stores/election-dataset-store";
import { MapTooltip } from "./map-tooltip";
import { MapControls, type LayerVisibility } from "./map-controls";

mapboxgl.accessToken = env.NEXT_PUBLIC_MAPBOX_TOKEN;

const NEPAL_CENTER: [number, number] = [84.124, 28.3949];
const NEPAL_ZOOM = 6.5;
const NEPAL_BOUNDS: mapboxgl.LngLatBoundsLike = [
  [80.0, 26.3],
  [88.2, 30.5],
];

const FALLBACK_DISTRICT_COLOR = "#1a1a2e";

interface AnomalyPin {
  lat: number;
  lng: number;
  type: string;
  severity: "info" | "warning" | "critical";
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  data: {
    name: string;
    party?: string;
    partyColor?: string;
    votes?: number;
    lastUpdate?: string;
  };
}

interface NepalMapProps {
  className?: string;
  onDistrictClick?: (districtName: string) => void;
  onProvinceClick?: (provinceId: number) => void;
  onConstituencyClick?: (id: string) => void;
  interactive?: boolean;
  mini?: boolean;
  geoJsonUrl?: string;
  anomalies?: AnomalyPin[];
}

function buildDistrictColorMap(
  constituencies: ConstituencyResult[],
  provinceFilter: number | null
): Map<
  string,
  { partyColor: string; partyName: string; totalVotes: number; lastUpdate: string }
> {
  const districtAgg = new Map<
    string,
    Map<string, { votes: number; color: string; name: string; lastUpdate: string }>
  >();

  for (const c of constituencies) {
    if (provinceFilter && c.provinceId !== provinceFilter) continue;
    if (!c.candidates.length) continue;

    const leading = c.candidates.reduce((a, b) => (a.votes > b.votes ? a : b));
    const key = c.districtName.toUpperCase();
    const existing = districtAgg.get(key) ?? new Map();

    const prev = existing.get(leading.partyId);
    existing.set(leading.partyId, {
      votes: (prev?.votes ?? 0) + leading.votes,
      color: leading.partyColor,
      name: leading.partyName,
      lastUpdate: c.lastUpdate,
    });

    districtAgg.set(key, existing);
  }

  const result = new Map<
    string,
    { partyColor: string; partyName: string; totalVotes: number; lastUpdate: string }
  >();

  for (const [district, parties] of districtAgg) {
    let dominant = { votes: 0, color: FALLBACK_DISTRICT_COLOR, name: "Unknown", lastUpdate: "" };
    let totalVotes = 0;

    for (const [, p] of parties) {
      totalVotes += p.votes;
      if (p.votes > dominant.votes) {
        dominant = p;
      }
    }

    result.set(district, {
      partyColor: dominant.color,
      partyName: dominant.name,
      totalVotes,
      lastUpdate: dominant.lastUpdate,
    });
  }

  return result;
}

function buildProvinceColorMap(
  constituencies: ConstituencyResult[]
): Map<number, { partyColor: string; partyName: string; totalVotes: number; lastUpdate: string }> {
  const provinceAgg = new Map<
    number,
    Map<string, { votes: number; color: string; name: string; lastUpdate: string }>
  >();

  for (const c of constituencies) {
    if (!c.candidates.length) continue;

    const leading = c.candidates.reduce((a, b) => (a.votes > b.votes ? a : b));
    const provinceId = c.provinceId;
    const existing = provinceAgg.get(provinceId) ?? new Map();

    const prev = existing.get(leading.partyId);
    existing.set(leading.partyId, {
      votes: (prev?.votes ?? 0) + leading.votes,
      color: leading.partyColor,
      name: leading.partyName,
      lastUpdate: c.lastUpdate,
    });

    provinceAgg.set(provinceId, existing);
  }

  const result = new Map<
    number,
    { partyColor: string; partyName: string; totalVotes: number; lastUpdate: string }
  >();

  for (const [provinceId, parties] of provinceAgg) {
    let dominant = {
      votes: 0,
      color: FALLBACK_DISTRICT_COLOR,
      name: "Unknown",
      lastUpdate: "",
    };
    let totalVotes = 0;

    for (const [, p] of parties) {
      totalVotes += p.votes;
      if (p.votes > dominant.votes) {
        dominant = p;
      }
    }

    result.set(provinceId, {
      partyColor: dominant.color,
      partyName: dominant.name,
      totalVotes,
      lastUpdate: dominant.lastUpdate,
    });
  }

  return result;
}

function buildAnomalyGeoJSON(
  anomalies: AnomalyPin[]
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: anomalies.map((a, i) => ({
      type: "Feature" as const,
      id: i,
      properties: { type: a.type, severity: a.severity },
      geometry: { type: "Point" as const, coordinates: [a.lng, a.lat] },
    })),
  };
}

export function NepalMap({
  className,
  onDistrictClick,
  onProvinceClick,
  onConstituencyClick,
  interactive = true,
  mini = false,
  geoJsonUrl,
  anomalies = [],
}: NepalMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const hoveredDistrictRef = useRef<string | null>(null);
  const hoveredProvinceRef = useRef<number | null>(null);

  const selectedProvince = useFilterStore((s) => s.selectedProvince);
  const setSelectedProvince = useFilterStore((s) => s.setSelectedProvince);
  const { selectedDatasetId } = useElectionDatasetStore();

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    data: { name: "" },
  });

  const [layers, setLayers] = useState<LayerVisibility>({
    provinces: true,
    districts: true,
    anomalies: true,
  });

  const { data: constituencies } = useQuery({
    queryKey: ["constituencies", selectedDatasetId],
    queryFn: () => fetchConstituencies({ dataset: selectedDatasetId }),
    staleTime: 30_000,
  });

  const provinceColors = constituencies
    ? buildProvinceColorMap(constituencies)
    : new Map();

  const districtColors = constituencies
    ? buildDistrictColorMap(constituencies, selectedProvince)
    : new Map();

  const handleToggleLayer = useCallback(
    (layer: keyof LayerVisibility) => {
      setLayers((prev) => {
        const next = { ...prev, [layer]: !prev[layer] };
        const map = mapRef.current;
        if (!map) return next;

        const layerMap: Record<keyof LayerVisibility, string[]> = {
          provinces: ["province-fills", "province-outlines"],
          districts: ["district-fills", "district-outlines"],
          anomalies: ["anomaly-dots", "anomaly-pulse"],
        };

        for (const id of layerMap[layer]) {
          if (map.getLayer(id)) {
            map.setLayoutProperty(
              id,
              "visibility",
              next[layer] ? "visible" : "none"
            );
          }
        }

        return next;
      });
    },
    []
  );

  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn({ duration: 300 });
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut({ duration: 300 });
  }, []);

  const handleResetView = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    map.fitBounds(NEPAL_BOUNDS, { padding: 40, duration: 600 });
    setSelectedProvince(null);
  }, [setSelectedProvince]);

  // When province filter changes, zoom to that province (if not null)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (selectedProvince == null) {
      // Reset to national view
      map.fitBounds(NEPAL_BOUNDS, { padding: 40, duration: 600 });
      return;
    }

    const allFeatures = map.querySourceFeatures("provinces");
    if (!allFeatures.length) return;

    const bounds = new mapboxgl.LngLatBounds();

    function addCoords(arr: any) {
      if (typeof arr[0] === "number") {
        bounds.extend(arr as [number, number]);
      } else {
        for (const inner of arr) addCoords(inner);
      }
    }

    for (const feature of allFeatures) {
      const raw = (feature.properties as any)?.PROVINCE as number | string | undefined;
      if (raw == null) continue;
      const id = typeof raw === "string" ? Number(raw) : raw;
      if (Number.isNaN(id) || id !== selectedProvince) continue;

      const geom = feature.geometry;
      if (!geom) continue;
      if (geom.type === "Polygon" || geom.type === "MultiPolygon") {
        addCoords((geom as any).coordinates);
      }
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 60, duration: 700 });
    }
  }, [selectedProvince]);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: NEPAL_CENTER,
      zoom: mini ? 5.8 : NEPAL_ZOOM,
      maxBounds: NEPAL_BOUNDS,
      interactive,
      attributionControl: false,
      ...(mini && {
        dragPan: false,
        scrollZoom: false,
        doubleClickZoom: false,
        touchZoomRotate: false,
        keyboard: false,
      }),
    });

    mapRef.current = map;

    map.on("load", () => {
      if (geoJsonUrl) {
        addGeoJsonLayers(map);
      }

      addAnomalyLayer(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoJsonUrl, interactive, mini]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (map.getSource("anomalies")) {
      (map.getSource("anomalies") as mapboxgl.GeoJSONSource).setData(
        buildAnomalyGeoJSON(anomalies)
      );
    }
  }, [anomalies]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !geoJsonUrl) return;

    if (!map.getSource("districts")) return;

    const fillExpression: mapboxgl.Expression = [
      "match",
      ["get", "DISTRICT"],
      ...Array.from(districtColors).flatMap(([district, data]) => [
        district,
        data.partyColor,
      ]),
      FALLBACK_DISTRICT_COLOR,
    ];

    if (map.getLayer("district-fills")) {
      map.setPaintProperty("district-fills", "fill-color", fillExpression);
    }
  }, [districtColors, geoJsonUrl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (!map.getSource("provinces")) return;

    const fillExpression: mapboxgl.Expression = [
      "match",
      ["get", "PROVINCE"],
      ...Array.from(provinceColors).flatMap(([provinceId, data]) => [
        provinceId,
        data.partyColor,
      ]),
      FALLBACK_DISTRICT_COLOR,
    ];

    if (map.getLayer("province-fills")) {
      map.setPaintProperty("province-fills", "fill-color", fillExpression);
    }
  }, [provinceColors]);

  function addGeoJsonLayers(map: mapboxgl.Map) {
    if (!geoJsonUrl) return;

    // Provinces source (separate simplified geometry)
    map.addSource("provinces", {
      type: "geojson",
      data: "/nepal-provinces.geojson",
    });

    map.addLayer({
      id: "province-fills",
      type: "fill",
      source: "provinces",
      paint: {
        "fill-color": FALLBACK_DISTRICT_COLOR,
        "fill-opacity": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          0.5,
          0.25,
        ],
      },
    });

    map.addLayer({
      id: "province-outlines",
      type: "line",
      source: "provinces",
      paint: {
        "line-color": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          "rgba(255,255,255,0.9)",
          "rgba(255,255,255,0.4)",
        ],
        "line-width": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          2,
          1,
        ],
      },
    });

    map.addSource("districts", {
      type: "geojson",
      data: geoJsonUrl,
      promoteId: "DISTRICT",
    });

    map.addLayer({
      id: "district-fills",
      type: "fill",
      source: "districts",
      paint: {
        "fill-color": FALLBACK_DISTRICT_COLOR,
        "fill-opacity": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          0.85,
          0.65,
        ],
      },
    });

    map.addLayer({
      id: "district-outlines",
      type: "line",
      source: "districts",
      paint: {
        "line-color": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          "rgba(255,255,255,0.5)",
          "rgba(255,255,255,0.1)",
        ],
        "line-width": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          2,
          0.5,
        ],
      },
    });

    map.addLayer({
      id: "district-labels",
      type: "symbol",
      source: "districts",
      layout: {
        "text-field": ["to-string", ["get", "DISTRICT"]],
        "text-size": 10,
        "text-anchor": "center",
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          "rgba(255,255,255,0.95)",
          "rgba(255,255,255,0.4)",
        ],
        "text-halo-color": "rgba(0,0,0,0.7)",
        "text-halo-width": 1,
      },
    });

    if (!mini) {
      bindHoverEvents(map);
      bindClickEvents(map, setSelectedProvince);
    }
  }

  function bindHoverEvents(map: mapboxgl.Map) {
    map.on("mousemove", "district-fills", (e) => {
      if (!e.features?.length) return;
      const feature = e.features[0];
      const districtName = (feature.properties?.DISTRICT as string) ?? "";

      if (hoveredDistrictRef.current && hoveredDistrictRef.current !== districtName) {
        map.setFeatureState(
          { source: "districts", id: hoveredDistrictRef.current },
          { hover: false }
        );
      }

      hoveredDistrictRef.current = districtName;
      map.setFeatureState(
        { source: "districts", id: districtName },
        { hover: true }
      );
      map.getCanvas().style.cursor = "pointer";

      const info = districtColors.get(districtName);
      setTooltip({
        visible: true,
        x: e.point.x,
        y: e.point.y,
        data: {
          name: districtName,
          party: info?.partyName,
          partyColor: info?.partyColor,
          votes: info?.totalVotes,
          lastUpdate: info?.lastUpdate,
        },
      });
    });

    map.on("mouseleave", "district-fills", () => {
      if (hoveredDistrictRef.current) {
        map.setFeatureState(
          { source: "districts", id: hoveredDistrictRef.current },
          { hover: false }
        );
        hoveredDistrictRef.current = null;
      }
      map.getCanvas().style.cursor = "";
      setTooltip((prev) => ({ ...prev, visible: false }));
    });

    map.on("mousemove", "province-fills", (e) => {
      if (!e.features?.length) return;
      const feature = e.features[0];
      const province = feature.properties?.PROVINCE as number | string | undefined;
      if (!province) return;
      const id = typeof province === "string" ? Number(province) : province;
      if (Number.isNaN(id)) return;

      if (hoveredProvinceRef.current && hoveredProvinceRef.current !== id) {
        map.setFeatureState(
          { source: "provinces", id: hoveredProvinceRef.current },
          { hover: false }
        );
      }

      hoveredProvinceRef.current = id;
      map.setFeatureState(
        { source: "provinces", id },
        { hover: true }
      );
      map.getCanvas().style.cursor = "pointer";

      const provinceInfo = PROVINCES.find((p) => p.id === id);
      const partyInfo = provinceColors.get(id);

      setTooltip({
        visible: true,
        x: e.point.x,
        y: e.point.y,
        data: {
          name: provinceInfo?.name ?? `Province ${id}`,
          party: partyInfo?.partyName,
          partyColor: partyInfo?.partyColor,
          votes: partyInfo?.totalVotes,
          lastUpdate: partyInfo?.lastUpdate,
        },
      });
    });

    map.on("mouseleave", "province-fills", () => {
      if (hoveredProvinceRef.current !== null) {
        map.setFeatureState(
          { source: "provinces", id: hoveredProvinceRef.current },
          { hover: false }
        );
        hoveredProvinceRef.current = null;
      }
      map.getCanvas().style.cursor = "";
      setTooltip((prev) => ({ ...prev, visible: false }));
    });
  }

  function bindClickEvents(
    map: mapboxgl.Map,
    selectProvince: (id: number | null) => void
  ) {
    map.on("click", "district-fills", (e) => {
      if (!e.features?.length) return;
      const feature = e.features[0];
      const districtName = (feature.properties?.DISTRICT as string) ?? "";
      const constituencyId = (feature.properties?.CONSTITUENCY_ID as string) ?? "";

      if (constituencyId && onConstituencyClick) {
        onConstituencyClick(constituencyId);
      } else if (districtName && onDistrictClick) {
        onDistrictClick(districtName);
      }
    });

    map.on("click", "province-fills", (e) => {
      if (!e.features?.length) return;
      const feature = e.features[0];
      const province = feature.properties?.PROVINCE as number | string | undefined;
      if (!province) return;
      const id = typeof province === "string" ? Number(province) : province;
      if (!Number.isNaN(id)) {
        selectProvince(id);
        onProvinceClick?.(id);
      }
    });
  }

  function addAnomalyLayer(map: mapboxgl.Map) {
    map.addSource("anomalies", {
      type: "geojson",
      data: buildAnomalyGeoJSON(anomalies),
    });

    map.addLayer({
      id: "anomaly-pulse",
      type: "circle",
      source: "anomalies",
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["get", "severity"],
          0,
          8,
        ],
        "circle-radius-transition": { duration: 1000 },
        "circle-color": "rgba(220, 38, 38, 0.25)",
        "circle-blur": 1,
      },
    });

    map.addLayer({
      id: "anomaly-dots",
      type: "circle",
      source: "anomalies",
      paint: {
        "circle-radius": [
          "match",
          ["get", "severity"],
          "critical",
          6,
          "warning",
          5,
          4,
        ],
        "circle-color": [
          "match",
          ["get", "severity"],
          "critical",
          "#dc2626",
          "warning",
          "#f59e0b",
          "#3b82f6",
        ],
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "rgba(255,255,255,0.4)",
      },
    });
  }

  return (
    <div className={cn("relative overflow-hidden rounded-md", className)}>
      <div
        ref={containerRef}
        className={cn("h-full w-full", mini ? "min-h-[180px]" : "min-h-[400px]")}
      />

      {!mini && (
        <>
          <MapTooltip
            visible={tooltip.visible}
            x={tooltip.x}
            y={tooltip.y}
            data={tooltip.data}
          />
          <MapControls
            layers={layers}
            onToggleLayer={handleToggleLayer}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            selectedProvince={selectedProvince}
            onSelectProvince={setSelectedProvince}
            onResetView={handleResetView}
          />
        </>
      )}
    </div>
  );
}
