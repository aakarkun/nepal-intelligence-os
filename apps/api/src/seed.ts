import path from "node:path";
import type { NationalSummary } from "@repo/shared";
import { ConstituencyResultSchema, NationalSummarySchema } from "@repo/shared";
import { updateNationalSummary, updateConstituencyResult } from "./store";

const FIXTURES_DIR = path.resolve(import.meta.dir, "../../worker/fixtures");

export async function seedFromFixturesIfEmpty(): Promise<void> {
  const existing = await import("./db/repos/constituency-results.js").then((m) =>
    m.getConstituencyResults({})
  );
  if (existing.length > 0) return;

  try {
    const [constituenciesRaw, summariesRaw] = await Promise.all([
      Bun.file(path.join(FIXTURES_DIR, "constituency_results.json")).json(),
      Bun.file(path.join(FIXTURES_DIR, "national_summary.json")).json(),
    ]);

    const constituencyList = Array.isArray(constituenciesRaw)
      ? constituenciesRaw
      : [];
    let seeded = 0;
    for (const item of constituencyList) {
      const parsed = ConstituencyResultSchema.safeParse(item);
      if (parsed.success) {
        await updateConstituencyResult(parsed.data);
        seeded++;
      }
    }
    if (seeded > 0) {
      console.log(
        `[nepal-intelligence-os] Seeded ${seeded} constituency results from fixtures`
      );
    }

    const summaryList = Array.isArray(summariesRaw) ? summariesRaw : [];
    const validSummaries: NationalSummary[] = [];
    for (const item of summaryList) {
      const parsed = NationalSummarySchema.safeParse(item);
      if (parsed.success) validSummaries.push(parsed.data);
    }
    if (validSummaries.length > 0) {
      const latest = validSummaries.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];
      await updateNationalSummary(latest);
      console.log(
        "[nepal-intelligence-os] Seeded national summary from fixtures"
      );
    }
  } catch (e) {
    console.warn(
      "[nepal-intelligence-os] Seed skipped (fixtures not found or invalid):",
      e instanceof Error ? e.message : e
    );
  }
}
