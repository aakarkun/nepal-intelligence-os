import type { CrisisSummary, EarthquakeIncident, SignalEvent } from "@repo/shared";

const NEPAL_BOUNDS = {
  minLatitude: 26,
  maxLatitude: 31,
  minLongitude: 80,
  maxLongitude: 89,
};

type UsgsFeature = {
  id: string;
  properties: {
    mag: number | null;
    place: string | null;
    time: number;
    url: string;
    title: string;
    felt?: number | null;
    tsunami?: number | null;
    alert?: "green" | "yellow" | "orange" | "red" | null;
    sig: number;
  };
  geometry: {
    coordinates: [number, number, number];
  };
};

type UsgsResponse = {
  features: UsgsFeature[];
};

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function severityBucket(magnitude: number): keyof CrisisSummary["incidentsBySeverity"] {
  if (magnitude < 4) return "minor";
  if (magnitude < 5) return "light";
  if (magnitude < 6) return "moderate";
  return "strongPlus";
}

export async function fetchEarthquakeIncidents(): Promise<EarthquakeIncident[]> {
  const url = new URL("https://earthquake.usgs.gov/fdsnws/event/1/query");
  url.searchParams.set("format", "geojson");
  url.searchParams.set("orderby", "time");
  url.searchParams.set("limit", "100");
  url.searchParams.set("starttime", isoDaysAgo(30));
  url.searchParams.set("minlatitude", String(NEPAL_BOUNDS.minLatitude));
  url.searchParams.set("maxlatitude", String(NEPAL_BOUNDS.maxLatitude));
  url.searchParams.set("minlongitude", String(NEPAL_BOUNDS.minLongitude));
  url.searchParams.set("maxlongitude", String(NEPAL_BOUNDS.maxLongitude));

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/geo+json, application/json" },
  });
  if (!res.ok) {
    throw new Error(`USGS request failed: ${res.status}`);
  }

  const data = (await res.json()) as UsgsResponse;

  return data.features.map((feature) => ({
    id: feature.id,
    sourceId: "usgs",
    sourceName: "USGS Earthquake Hazards Program",
    timestamp: new Date(feature.properties.time).toISOString(),
    title: feature.properties.title,
    place: feature.properties.place ?? "Unknown location",
    magnitude: feature.properties.mag ?? 0,
    depthKm: Math.max(0, feature.geometry.coordinates[2] ?? 0),
    longitude: feature.geometry.coordinates[0],
    latitude: feature.geometry.coordinates[1],
    feltReports: feature.properties.felt ?? 0,
    tsunami: Boolean(feature.properties.tsunami),
    alert: feature.properties.alert ?? null,
    significance: feature.properties.sig,
    url: feature.properties.url,
  }));
}

export function summarizeEarthquakeIncidents(
  incidents: EarthquakeIncident[],
  timestamp: string
): CrisisSummary {
  const last24hCutoff = Date.now() - 24 * 60 * 60 * 1000;
  const summary: CrisisSummary = {
    sourceId: "usgs",
    sourceName: "USGS Earthquake Hazards Program",
    timestamp,
    totalIncidents: incidents.length,
    last24h: incidents.filter(
      (incident) => new Date(incident.timestamp).getTime() >= last24hCutoff
    ).length,
    maxMagnitude: incidents.reduce(
      (max, incident) => Math.max(max, incident.magnitude),
      0
    ),
    averageDepthKm:
      incidents.length > 0
        ? incidents.reduce((sum, incident) => sum + incident.depthKm, 0) / incidents.length
        : 0,
    incidentsBySeverity: {
      minor: 0,
      light: 0,
      moderate: 0,
      strongPlus: 0,
    },
  };

  for (const incident of incidents) {
    summary.incidentsBySeverity[severityBucket(incident.magnitude)] += 1;
  }

  return summary;
}

export function normalizeEarthquakesToSignals(
  incidents: EarthquakeIncident[]
): SignalEvent[] {
  return incidents.slice(0, 10).map((incident) => ({
    id: `quake:${incident.id}`,
    type: "ingest",
    severity:
      incident.magnitude >= 6
        ? "critical"
        : incident.magnitude >= 5
          ? "warning"
          : "info",
    title: incident.title,
    body: `${incident.place} · M${incident.magnitude.toFixed(1)} · depth ${incident.depthKm.toFixed(1)} km`,
    timestamp: incident.timestamp,
    source: incident.sourceName,
    url: incident.url,
  }));
}
