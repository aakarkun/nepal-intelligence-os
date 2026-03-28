import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "../client.js";
import {
  legislativeBills,
  mps,
  newsFeedSources,
  parties,
  politicalEvents,
  politicalWeeklyDigest,
} from "../schema.js";
import type {
  CabinetMinisterWatch,
  LegislativeBillRow,
  MpIntelRow,
  PartyActivity,
  PartyIntelRow,
  PoliticalPulseEvent,
  PoliticalPulseStats,
  PoliticalWeeklyDigest,
} from "@repo/shared";

function parseStringArray(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  return [];
}

function rowToEvent(row: typeof politicalEvents.$inferSelect): PoliticalPulseEvent {
  return {
    id: row.id,
    eventType: row.eventType,
    title: row.title,
    summary: row.summary ?? null,
    fullContent: row.fullContent ?? null,
    sourceName: row.sourceName ?? null,
    sourceUrl: row.sourceUrl ?? null,
    partyIds: parseStringArray(row.partyIds),
    mpIds: parseStringArray(row.mpIds),
    ministry: row.ministry ?? null,
    billNumber: row.billNumber ?? null,
    billStatus: row.billStatus ?? null,
    tags: parseStringArray(row.tags),
    publishedAt: row.publishedAt,
    fetchedAt: row.fetchedAt,
    isVerified: row.isVerified,
    importanceScore: row.importanceScore,
  };
}

function rowToBill(row: typeof legislativeBills.$inferSelect): LegislativeBillRow {
  return {
    id: row.id,
    billNumber: row.billNumber,
    title: row.title,
    status: row.status,
    introducedBy: row.introducedBy ?? null,
    introducedAt: row.introducedAt ?? null,
    updatedAt: row.updatedAt,
    sourceUrl: row.sourceUrl ?? null,
    partyId: row.partyId ?? null,
    rawExcerpt: row.rawExcerpt ?? null,
  };
}

function rowToParty(row: typeof parties.$inferSelect): PartyIntelRow {
  const sm = row.socialMedia;
  return {
    id: row.id,
    name: row.name,
    shortName: row.shortName,
    ideology: row.ideology ?? null,
    formedYear: row.formedYear ?? null,
    chairperson: row.chairperson ?? null,
    parliamentaryLeader: row.parliamentaryLeader ?? null,
    officialWebsite: row.officialWebsite ?? null,
    socialMedia:
      sm && typeof sm === "object" && !Array.isArray(sm)
        ? (sm as Record<string, string>)
        : null,
    manifestoUrl: row.manifestoUrl ?? null,
    colorHex: row.colorHex ?? null,
    isGoverning: row.isGoverning,
    seatsUpdatedAt: row.seatsUpdatedAt ?? null,
    fptpSeats: row.fptpSeats,
    prSeats: row.prSeats,
    totalSeats: row.totalSeats,
  };
}

function rowToMp(row: typeof mps.$inferSelect): MpIntelRow {
  const ca = row.committeeAssignments;
  const sm = row.socialMedia;
  return {
    id: row.id,
    name: row.name,
    partyId: row.partyId,
    ministryRole: row.ministryRole ?? null,
    committeeAssignments: parseStringArray(ca),
    billsSponsored: row.billsSponsored,
    contactEmail: row.contactEmail ?? null,
    socialMedia:
      sm && typeof sm === "object" && !Array.isArray(sm)
        ? (sm as Record<string, string>)
        : null,
    photoUrl: row.photoUrl ?? null,
    constituency: row.constituency ?? null,
    electionType: row.electionType ?? null,
  };
}

const BILL_TYPES = new Set([
  "bill_registered",
  "bill_passed",
  "bill_rejected",
]);

const CABINET_TYPES = new Set(["cabinet_decision"]);
const LAW_TYPES = new Set(["law_enacted"]);

function expandCategory(
  category: string | undefined
): string[] | undefined {
  if (!category || category === "all") return undefined;
  switch (category) {
    case "bills":
      return Array.from(BILL_TYPES);
    case "cabinet":
      return Array.from(CABINET_TYPES);
    case "laws":
      return Array.from(LAW_TYPES);
    case "news":
      return [
        "news",
        "policy_announcement",
        "parliament_sitting",
        "appointment",
      ];
    default:
      return undefined;
  }
}

export type ListEventsParams = {
  types?: string[];
  category?: string;
  partyId?: string;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  limit?: number;
};

export async function listPoliticalEvents(
  params: ListEventsParams
): Promise<{ events: PoliticalPulseEvent[]; total: number }> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const offset = (page - 1) * limit;

  const typeList =
    params.types && params.types.length > 0
      ? params.types
      : expandCategory(params.category);

  const conditions: SQL[] = [];

  if (typeList && typeList.length > 0) {
    conditions.push(inArray(politicalEvents.eventType, typeList));
  }

  if (params.from) {
    conditions.push(gte(politicalEvents.publishedAt, params.from));
  }
  if (params.to) {
    conditions.push(lte(politicalEvents.publishedAt, `${params.to}T23:59:59.999Z`));
  }

  if (params.partyId) {
    conditions.push(
      sql`${politicalEvents.partyIds}::jsonb @> ${JSON.stringify([params.partyId])}::jsonb`
    );
  }

  const q = params.q?.trim();
  if (q) {
    const pattern = `%${q.replace(/%/g, "\\%")}%`;
    conditions.push(
      or(ilike(politicalEvents.title, pattern), ilike(politicalEvents.summary, pattern))!
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countRows = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(politicalEvents)
    .where(whereClause);
  const total = countRows[0]?.c ?? 0;

  const rows = await db
    .select()
    .from(politicalEvents)
    .where(whereClause)
    .orderBy(desc(politicalEvents.publishedAt))
    .limit(limit)
    .offset(offset);

  return { events: rows.map(rowToEvent), total };
}

export async function getPoliticalEventById(
  id: string
): Promise<PoliticalPulseEvent | null> {
  const rows = await db
    .select()
    .from(politicalEvents)
    .where(eq(politicalEvents.id, id))
    .limit(1);
  return rows[0] ? rowToEvent(rows[0]) : null;
}

export type ListBillsParams = {
  status?: string[];
  partyId?: string;
};

export async function listLegislativeBills(
  params: ListBillsParams
): Promise<LegislativeBillRow[]> {
  const conditions: SQL[] = [];
  if (params.status && params.status.length > 0) {
    conditions.push(inArray(legislativeBills.status, params.status));
  }
  if (params.partyId) {
    conditions.push(eq(legislativeBills.partyId, params.partyId));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db
    .select()
    .from(legislativeBills)
    .where(whereClause)
    .orderBy(desc(legislativeBills.updatedAt));
  return rows.map(rowToBill);
}

export async function getLegislativeBillCounts(): Promise<Record<string, number>> {
  const rows = await db
    .select({
      status: legislativeBills.status,
      c: sql<number>`count(*)::int`,
    })
    .from(legislativeBills)
    .groupBy(legislativeBills.status);
  const out: Record<string, number> = {};
  for (const r of rows) {
    out[r.status] = r.c;
  }
  return out;
}

export async function getPartyActivity(partyId: string): Promise<PartyActivity | null> {
  const p = await db.select().from(parties).where(eq(parties.id, partyId)).limit(1);
  if (!p[0]) return null;
  const party = rowToParty(p[0]);

  const billCount = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(legislativeBills)
    .where(eq(legislativeBills.partyId, partyId));
  const billsSponsoredSession = billCount[0]?.c ?? 0;

  const lastEv = await db
    .select()
    .from(politicalEvents)
    .where(sql`${politicalEvents.partyIds}::jsonb @> ${JSON.stringify([partyId])}::jsonb`)
    .orderBy(desc(politicalEvents.publishedAt))
    .limit(1);

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const mentions = await db
    .select()
    .from(politicalEvents)
    .where(
      and(
        sql`${politicalEvents.partyIds}::jsonb @> ${JSON.stringify([partyId])}::jsonb`,
        gte(politicalEvents.publishedAt, weekAgo)
      )
    );

  const mpMentions = new Map<string, number>();
  for (const ev of mentions) {
    for (const mid of parseStringArray(ev.mpIds)) {
      mpMentions.set(mid, (mpMentions.get(mid) ?? 0) + 1);
    }
  }
  const topIds = Array.from(mpMentions.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  const mpRows =
    topIds.length > 0
      ? await db.select().from(mps).where(inArray(mps.id, topIds))
      : [];
  const activeMpsThisWeek = topIds.map((id) => {
    const m = mpRows.find((r) => r.id === id);
    return {
      mpId: id,
      name: m?.name ?? id,
      mentionCount: mpMentions.get(id) ?? 0,
    };
  });

  return {
    party,
    billsSponsoredSession,
    lastMajorAction: lastEv[0]?.title ?? null,
    lastMajorActionAt: lastEv[0]?.publishedAt ?? null,
    activeMpsThisWeek,
  };
}

export async function getWeeklyDigest(): Promise<PoliticalWeeklyDigest | null> {
  const rows = await db
    .select()
    .from(politicalWeeklyDigest)
    .where(eq(politicalWeeklyDigest.id, "current"))
    .limit(1);
  const r = rows[0];
  if (!r) return null;
  return {
    content: r.content,
    periodStart: r.periodStart,
    periodEnd: r.periodEnd,
    generatedAt: r.generatedAt,
  };
}

export async function getPoliticalPulseStats(): Promise<PoliticalPulseStats> {
  const totalBills = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(legislativeBills);
  const lawsEnacted = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(legislativeBills)
    .where(eq(legislativeBills.status, "enacted"));
  const cabinetDecisions = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(politicalEvents)
    .where(eq(politicalEvents.eventType, "cabinet_decision"));
  const newsItems = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(politicalEvents)
    .where(eq(politicalEvents.eventType, "news"));

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const billsPassedMonth = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(politicalEvents)
    .where(
      and(
        eq(politicalEvents.eventType, "bill_passed"),
        gte(politicalEvents.publishedAt, monthStart.toISOString())
      )
    );

  const lastEv = await db
    .select({ publishedAt: politicalEvents.publishedAt })
    .from(politicalEvents)
    .orderBy(desc(politicalEvents.publishedAt))
    .limit(1);

  return {
    totalBillsTracked: totalBills[0]?.c ?? 0,
    lawsEnacted: lawsEnacted[0]?.c ?? 0,
    cabinetDecisions: cabinetDecisions[0]?.c ?? 0,
    newsItems: newsItems[0]?.c ?? 0,
    billsPassedThisMonth: billsPassedMonth[0]?.c ?? 0,
    lastEventAt: lastEv[0]?.publishedAt ?? null,
  };
}

export async function listParties(): Promise<PartyIntelRow[]> {
  const rows = await db.select().from(parties).orderBy(asc(parties.name));
  return rows.map(rowToParty);
}

export async function listCabinetWatch(): Promise<CabinetMinisterWatch[]> {
  const ministers = await db
    .select()
    .from(mps)
    .where(sql`${mps.ministryRole} is not null`)
    .orderBy(asc(mps.name));

  const out: CabinetMinisterWatch[] = [];
  for (const row of ministers) {
    const mp = rowToMp(row);
    const ministryLabel = row.ministryRole ?? "Ministry";

    const decisions = await db
      .select()
      .from(politicalEvents)
      .where(
        and(
          eq(politicalEvents.eventType, "cabinet_decision"),
          sql`${politicalEvents.mpIds}::jsonb @> ${JSON.stringify([row.id])}::jsonb`
        )
      )
      .orderBy(desc(politicalEvents.publishedAt))
      .limit(3);

    const latestDecisions = decisions.map((e) => ({
      title: e.title,
      publishedAt: e.publishedAt,
      sourceUrl: e.sourceUrl,
    }));

    const safeMin = ministryLabel.replace(/%/g, "").slice(0, 80);
    const billsUnder = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(politicalEvents)
      .where(
        and(
          inArray(politicalEvents.eventType, ["bill_registered", "bill_passed"]),
          or(
            ilike(politicalEvents.ministry, `%${safeMin}%`),
            ilike(politicalEvents.title, `%${safeMin}%`)
          )!
        )
      );

    let daysSince: number | null = null;
    const last = latestDecisions[0]?.publishedAt;
    if (last) {
      daysSince = Math.floor(
        (Date.now() - new Date(last).getTime()) / (24 * 60 * 60 * 1000)
      );
    }

    out.push({
      mp,
      ministryLabel,
      latestDecisions,
      billsUnderMinistry: billsUnder[0]?.c ?? 0,
      daysSinceLastAnnouncement: daysSince,
    });
  }
  return out;
}

export async function insertPoliticalEvent(
  event: Omit<PoliticalPulseEvent, "fetchedAt"> & { fetchedAt?: string }
): Promise<void> {
  const fetchedAt = event.fetchedAt ?? new Date().toISOString();
  await db.insert(politicalEvents).values({
    id: event.id,
    eventType: event.eventType,
    title: event.title,
    summary: event.summary,
    fullContent: event.fullContent,
    sourceName: event.sourceName,
    sourceUrl: event.sourceUrl,
    partyIds: event.partyIds.length ? JSON.parse(JSON.stringify(event.partyIds)) : null,
    mpIds: event.mpIds.length ? JSON.parse(JSON.stringify(event.mpIds)) : null,
    ministry: event.ministry,
    billNumber: event.billNumber,
    billStatus: event.billStatus,
    tags: event.tags.length ? JSON.parse(JSON.stringify(event.tags)) : null,
    publishedAt: event.publishedAt,
    fetchedAt,
    isVerified: event.isVerified,
    importanceScore: event.importanceScore,
  });
}

export async function upsertLegislativeBill(row: LegislativeBillRow): Promise<void> {
  await db
    .insert(legislativeBills)
    .values({
      id: row.id,
      billNumber: row.billNumber,
      title: row.title,
      status: row.status,
      introducedBy: row.introducedBy,
      introducedAt: row.introducedAt,
      updatedAt: row.updatedAt,
      sourceUrl: row.sourceUrl,
      partyId: row.partyId,
      rawExcerpt: row.rawExcerpt,
    })
    .onConflictDoUpdate({
      target: legislativeBills.billNumber,
      set: {
        title: row.title,
        status: row.status,
        introducedBy: row.introducedBy,
        introducedAt: row.introducedAt,
        updatedAt: row.updatedAt,
        sourceUrl: row.sourceUrl,
        partyId: row.partyId,
        rawExcerpt: row.rawExcerpt,
      },
    });
}

export async function upsertWeeklyDigest(digest: PoliticalWeeklyDigest): Promise<void> {
  await db
    .insert(politicalWeeklyDigest)
    .values({
      id: "current",
      content: digest.content,
      periodStart: digest.periodStart,
      periodEnd: digest.periodEnd,
      generatedAt: digest.generatedAt,
    })
    .onConflictDoUpdate({
      target: politicalWeeklyDigest.id,
      set: {
        content: digest.content,
        periodStart: digest.periodStart,
        periodEnd: digest.periodEnd,
        generatedAt: digest.generatedAt,
      },
    });
}

export async function eventExistsBySourceUrl(url: string): Promise<boolean> {
  if (!url) return false;
  const rows = await db
    .select({ id: politicalEvents.id })
    .from(politicalEvents)
    .where(eq(politicalEvents.sourceUrl, url))
    .limit(1);
  return rows.length > 0;
}

export async function getActiveNewsFeedSources(): Promise<
  Array<typeof newsFeedSources.$inferSelect>
> {
  return db
    .select()
    .from(newsFeedSources)
    .where(eq(newsFeedSources.isActive, true))
    .orderBy(asc(newsFeedSources.name));
}

export async function updateNewsFeedSourcePoll(id: string, at: string): Promise<void> {
  await db
    .update(newsFeedSources)
    .set({ lastPolledAt: at })
    .where(eq(newsFeedSources.id, id));
}
