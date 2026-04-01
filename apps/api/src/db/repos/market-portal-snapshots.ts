import { desc } from "drizzle-orm";
import { db } from "../client.js";
import { marketPortalSnapshots } from "../schema.js";
import type { MarketPortalSnapshot } from "@repo/shared";

export async function insertMarketPortalSnapshot(row: {
  id: string;
  scrapedAt: string;
  data: MarketPortalSnapshot;
}): Promise<void> {
  const ingestedAt = new Date().toISOString();
  await db.insert(marketPortalSnapshots).values({
    id: row.id,
    scrapedAt: row.scrapedAt,
    data: JSON.parse(JSON.stringify(row.data)) as Record<string, unknown>,
    ingestedAt,
  });
}

/** Latest snapshot by portal `scraped_at` (ISO), for hydrate when operational cache row expired. */
export async function getLatestMarketPortalSnapshot(): Promise<MarketPortalSnapshot | null> {
  const rows = await db
    .select()
    .from(marketPortalSnapshots)
    .orderBy(desc(marketPortalSnapshots.scrapedAt))
    .limit(1);
  if (rows.length === 0) return null;
  return rows[0].data as MarketPortalSnapshot;
}
