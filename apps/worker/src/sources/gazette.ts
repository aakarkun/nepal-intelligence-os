const RAJPATRA_URL = "https://rajpatra.dop.gov.np/";

/**
 * Daily monitor for Nepal Gazette — connectivity check only until HTML parsing for gazette notices is implemented.
 */
export async function runGazetteMonitor(): Promise<void> {
  try {
    const res = await fetch(RAJPATRA_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; NepalIntelligenceOS/1.0; +https://github.com/nepal-intelligence-os)",
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      console.warn("[gazette] Rajpatra HTTP", res.status);
      return;
    }
    await res.text();
    console.log("[gazette] Rajpatra portal OK — extend scraper to emit law_enacted events");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[gazette] Monitor failed:", msg);
  }
}
