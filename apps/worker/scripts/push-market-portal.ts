/**
 * One-off: scrape the public market portal and POST to the API ingest route.
 * Requires API running (default http://localhost:3001). Set API_URL if different.
 *
 *   cd apps/worker && bun run scripts/push-market-portal.ts
 *
 * If you see 404 on ingest: whatever listens on that port is not this repo’s API,
 * or it is an old build without `/v1/economy/market-portal`. Restart from current code:
 *   cd apps/api && bun src/index.ts
 */
import { fetchMarketPortalSnapshot } from "../src/sources/market-portal";
import { postMarketPortalSnapshot } from "../src/ingest-client";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Fails fast when the running server has no market-portal routes (common 404 cause). */
async function assertApiHasMarketPortalRoutes(base: string): Promise<void> {
  const getUrl = joinUrl(base, "/v1/economy/market-portal");
  const postUrl = joinUrl(base, "/v1/ingest/economy/market-portal");
  let getStatus = 0;
  try {
    const res = await fetch(getUrl, { method: "GET" });
    getStatus = res.status;
  } catch (e) {
    console.error(
      `[push-market-portal] Cannot reach API at ${base} (${e instanceof Error ? e.message : e}).\n` +
        "  Check API_URL and that the API is running."
    );
    process.exit(1);
  }
  if (getStatus === 404) {
    const forexUrl = joinUrl(base, "/v1/economy/forex");
    let forexStatus = 0;
    try {
      const r = await fetch(forexUrl, { method: "GET" });
      forexStatus = r.status;
    } catch {
      forexStatus = 0;
    }
    console.error(
      `[push-market-portal] GET ${getUrl} → 404. Ingest POST will also 404.\n\n` +
        "  This usually means:\n" +
        "  • Another app is bound to this port (not apps/api), or\n" +
        "  • The API is an old build from before market-portal routes existed.\n\n" +
        `  GET /v1/economy/forex on same host → ${forexStatus || "error"}\n\n` +
        "  Fix: run the API from this repository (latest main):\n" +
        "    cd apps/api && bun src/index.ts\n" +
        "  Or set API_URL to the correct host:port (e.g. API_URL=http://127.0.0.1:3002 …).\n\n" +
        `  Expected ingest URL: ${postUrl}`
    );
    process.exit(1);
  }
  if (getStatus !== 200) {
    console.warn(
      `[push-market-portal] GET /v1/economy/market-portal returned ${getStatus} (expected 200). Continuing anyway…`
    );
  }
}

async function main(): Promise<void> {
  await assertApiHasMarketPortalRoutes(API_URL);
  console.log(`[push-market-portal] Fetching snapshot → POST ${API_URL}/v1/ingest/economy/market-portal`);
  const snap = await fetchMarketPortalSnapshot();
  console.log("[push-market-portal] Fetched:", {
    mainIndices: snap.mainIndices.length,
    subIndices: snap.subIndices.length,
    forex: snap.forex.length,
    metals: snap.metals.length,
    oil: snap.oil.length,
  });
  const ok = await postMarketPortalSnapshot(API_URL, snap);
  if (!ok) {
    console.error("[push-market-portal] Ingest failed — start the API and check [ingest] logs above.");
    process.exit(1);
  }
  console.log("[push-market-portal] OK — refresh the Economy page.");
}

main().catch((err) => {
  console.error("[push-market-portal]", err instanceof Error ? err.message : err);
  process.exit(1);
});
