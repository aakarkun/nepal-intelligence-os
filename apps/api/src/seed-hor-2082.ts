import { buildHor2082OfficialNationalSummary, HOR_2082_OFFICIAL_DATASET_ID } from "@repo/shared";
import { upsertNationalSummary } from "./db/repos/national-summaries.js";

/** Idempotent: persists final HoR 2082 FPTP+PR breakdown for parliament views. */
export async function ensureHor2082OfficialSummary(): Promise<void> {
  const payload = buildHor2082OfficialNationalSummary();
  await upsertNationalSummary(HOR_2082_OFFICIAL_DATASET_ID, payload);
}
