import type { ForexRate } from "./schemas";

/** Official NRB FOREX API (documented v1). */
export const NRB_FOREX_API_URL = "https://www.nrb.org.np/api/forex/v1/rates";

/** NRB public macro database landing page (no machine API; human reference). */
export const NRB_MACRO_DATABASE_URL = "https://www.nrb.org.np/database-on-nepalese-economy/";

const SOURCE_ID = "nrb:official-forex-bulletin" as const;

export type NrbBulletinRefRate = {
  currencyCode: string;
  currencyName: string;
  unit: number;
  buy: number;
  sell: number;
};

export type NrbBulletinSnapshot = {
  sourceId: typeof SOURCE_ID;
  sourceName: string;
  /** When the economy pipeline last refreshed NRB forex (from summary ingest). */
  timestamp: string;
  /** Calendar date of the bulletin row from NRB (`YYYY-MM-DD`). */
  bulletinDate: string;
  /** When NRB published this rate set, if provided by the API. */
  publishedOn?: string;
  currencyCount: number;
  referenceUsd: NrbBulletinRefRate | null;
  referenceInr: NrbBulletinRefRate | null;
  forexApiUrl: string;
  macroDatabaseUrl: string;
};

function pickRate(rates: ForexRate[], code: string): NrbBulletinRefRate | null {
  const r = rates.find((x) => x.currencyCode === code);
  if (!r) return null;
  return {
    currencyCode: r.currencyCode,
    currencyName: r.currencyName,
    unit: r.unit,
    buy: r.buy,
    sell: r.sell,
  };
}

/**
 * Builds a macro “bulletin” view from the official NRB forex rates already ingested from
 * {@link NRB_FOREX_API_URL}. There is no separate NRB JSON API for CPI/GDP; this slice
 * surfaces publication metadata plus headline USD/INR anchors.
 */
export function buildNrbBulletinSnapshot(
  rates: ForexRate[],
  pipelineTimestamp: string
): NrbBulletinSnapshot | null {
  if (rates.length === 0) return null;

  const first = rates[0];
  return {
    sourceId: SOURCE_ID,
    sourceName: "Nepal Rastra Bank — official forex bulletin",
    timestamp: pipelineTimestamp,
    bulletinDate: first.date,
    publishedOn: first.publishedOn,
    currencyCount: rates.length,
    referenceUsd: pickRate(rates, "USD"),
    referenceInr: pickRate(rates, "INR"),
    forexApiUrl: NRB_FOREX_API_URL,
    macroDatabaseUrl: NRB_MACRO_DATABASE_URL,
  };
}
