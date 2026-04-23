/**
 * One-off: fetch ShareSansar (or other configured) upcoming issues and POST to the API ingest route.
 *
 *   cd apps/worker && bun run scripts/push-upcoming-issues.ts
 *
 * Requires `UPCOMING_ISSUES_SOURCE_URL` and the API running. If `WORKER_SECRET` is set on the API,
 * set the same value in the environment for this script.
 */
import { fetchUpcomingIssuesFromHtmlSource } from "../src/sources/upcoming-issues";
import { postUpcomingIssues } from "../src/ingest-client";

const API_URL = process.env.API_URL ?? "http://localhost:3001";
const SOURCE_URL =
  process.env.UPCOMING_ISSUES_SOURCE_URL ?? "https://www.sharesansar.com/upcoming-issue";

async function main(): Promise<void> {
  console.log(`[push-upcoming-issues] API_URL=${API_URL}`);
  console.log(`[push-upcoming-issues] UPCOMING_ISSUES_SOURCE_URL=${SOURCE_URL}`);

  const rows = await fetchUpcomingIssuesFromHtmlSource(SOURCE_URL);
  console.log(`[push-upcoming-issues] fetched ${rows.length} rows`);

  if (rows.length === 0) {
    console.error("[push-upcoming-issues] No rows — check source URL and parser.");
    process.exit(1);
  }

  const ok = await postUpcomingIssues(API_URL, rows);
  if (!ok) {
    console.error("[push-upcoming-issues] POST /v1/ingest/economy/upcoming-issues failed (check API, WORKER_SECRET).");
    process.exit(1);
  }

  console.log("[push-upcoming-issues] OK — verify with GET /v1/economy/upcoming-issues");
}

main().catch((err) => {
  console.error("[push-upcoming-issues]", err instanceof Error ? err.message : err);
  process.exit(1);
});
