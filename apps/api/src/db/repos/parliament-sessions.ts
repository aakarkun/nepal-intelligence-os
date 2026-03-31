import { eq } from "drizzle-orm";
import { db } from "../client.js";
import { parliamentSessions } from "../schema.js";
import type { ParliamentSession } from "@repo/shared";

function rowToSession(row: typeof parliamentSessions.$inferSelect): ParliamentSession {
  return {
    sessionName: row.sessionName ?? "",
    sessionStart: row.sessionStart?.toISOString().slice(0, 10) ?? "",
    nextSittingDate: row.nextSittingDate?.toISOString().slice(0, 10) ?? null,
    pendingBills: row.pendingBills ?? null,
    status: row.status as ParliamentSession["status"],
    scrapedAt: row.scrapedAt,
  };
}

export async function upsertParliamentSession(session: ParliamentSession): Promise<void> {
  const sessionStart = session.sessionStart ? new Date(session.sessionStart) : null;
  const nextSittingDate = session.nextSittingDate ? new Date(session.nextSittingDate) : null;
  await db.insert(parliamentSessions).values({
    id: "current",
    sessionName: session.sessionName ?? null,
    sessionStart,
    nextSittingDate,
    pendingBills: session.pendingBills ?? null,
    status: session.status,
    scrapedAt: session.scrapedAt,
  }).onConflictDoUpdate({
    target: parliamentSessions.id,
    set: {
      sessionName: session.sessionName ?? null,
      sessionStart,
      nextSittingDate,
      pendingBills: session.pendingBills ?? null,
      status: session.status,
      scrapedAt: session.scrapedAt,
    },
  });
}

export async function getCurrentSession(): Promise<ParliamentSession | null> {
  const rows = await db.select().from(parliamentSessions).where(eq(parliamentSessions.id, "current")).limit(1);
  return rows[0] ? rowToSession(rows[0]) : null;
}
