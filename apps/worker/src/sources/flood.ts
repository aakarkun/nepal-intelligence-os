import type { CrisisIncident } from "@repo/shared";

/**
 * Flood, landslide, and weather-related alerts.
 * DHM (Dept of Hydrology) / NDRRMA integration pending; returns empty until then.
 */
export async function fetchFloodAlerts(): Promise<CrisisIncident[]> {
  return [];
}
