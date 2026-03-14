import type { NepseSummary } from "@repo/shared";

/**
 * NEPSE (Nepal Stock Exchange) daily index and top movers.
 * Placeholder: Nepal Stock (nepalstock.com) does not expose a stable public API;
 * when available, replace with official or scraped data.
 */
export async function fetchNepseSummary(): Promise<NepseSummary> {
  const now = new Date().toISOString();
  return {
    sourceId: "nepse",
    sourceName: "NEPSE (placeholder)",
    timestamp: now,
    index: 0,
    change: null,
    changePercent: null,
    topGainers: [],
    topLosers: [],
  };
}
