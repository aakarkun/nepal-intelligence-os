import { env } from "../env";
import { runPoliticalRssIngestion } from "./political-rss";
import { runParliamentBillsScrape } from "./parliament-bills";
import { runGazetteMonitor } from "./gazette";
import { runWeeklyDigestIfDue } from "./political-weekly";
import { runMinisterBioWorker } from "../political-minister-bio";

export type PoliticalWorkerClock = {
  lastParliamentBillsRunAt?: number | null;
  lastGazetteRunAt?: number | null;
  lastMinisterBioRunAt?: number | null;
};

function patchBody(partial: Record<string, number>): Promise<void> {
  const base = env.API_URL.replace(/\/$/, "");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (process.env.WORKER_SECRET) headers["X-Worker-Secret"] = process.env.WORKER_SECRET;
  return fetch(`${base}/v1/worker-state`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(partial),
  }).then(() => {});
}

export async function runPoliticalPulseJobs(clock: PoliticalWorkerClock): Promise<void> {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const lastBio = clock.lastMinisterBioRunAt ?? null;
  if (lastBio == null || now - lastBio >= dayMs) {
    await runMinisterBioWorker(env.API_URL);
    await patchBody({ lastMinisterBioRunAt: now });
  }

  await runPoliticalRssIngestion();

  const parliH = Math.max(1, Number(process.env.PARLIAMENT_SCRAPE_INTERVAL_HOURS ?? 4));
  const parliMs = parliH * 60 * 60 * 1000;
  const lastP = clock.lastParliamentBillsRunAt ?? null;
  if (lastP == null || now - lastP >= parliMs) {
    await runParliamentBillsScrape();
    await patchBody({ lastParliamentBillsRunAt: now });
  }

  const lastG = clock.lastGazetteRunAt ?? null;
  if (lastG == null || now - lastG >= dayMs) {
    await runGazetteMonitor();
    await patchBody({ lastGazetteRunAt: now });
  }

  await runWeeklyDigestIfDue();
}
