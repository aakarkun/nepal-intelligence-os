/**
 * Seeds parties, RSS sources, cabinet MPs, and placeholder HoR members (276) for Political Pulse.
 * Safe to run multiple times: skips if parties already exist.
 */

import { db } from "./db/client.js";
import { sql } from "drizzle-orm";
import { mps, newsFeedSources, parties, politicalEvents } from "./db/schema.js";

const NOW = new Date().toISOString();

const PARTY_ROWS = [
  {
    id: "party-rsp",
    name: "Rastriya Swatantra Party",
    shortName: "RSP",
    colorHex: "#1a97d5",
    isGoverning: true,
    fptpSeats: 125,
    prSeats: 57,
    totalSeats: 182,
    chairperson: "Balendra Shah",
    parliamentaryLeader: "Balendra Shah",
  },
  {
    id: "party-nc",
    name: "Nepali Congress",
    shortName: "NC",
    colorHex: "#3f653b",
    fptpSeats: 18,
    prSeats: 20,
    totalSeats: 38,
  },
  {
    id: "party-uml",
    name: "CPN-UML",
    shortName: "UML",
    colorHex: "#ee1c25",
    fptpSeats: 9,
    prSeats: 16,
    totalSeats: 25,
  },
  {
    id: "party-ncp",
    name: "Nepali Communist Party",
    shortName: "NCP",
    colorHex: "#b91c1c",
    fptpSeats: 8,
    prSeats: 9,
    totalSeats: 17,
  },
  {
    id: "party-ssp",
    name: "Shram Sanskriti Party",
    shortName: "SSP",
    colorHex: "#ca8a04",
    fptpSeats: 3,
    prSeats: 4,
    totalSeats: 7,
  },
  {
    id: "party-rpp",
    name: "Rastriya Prajatantra Party",
    shortName: "RPP",
    colorHex: "#f97316",
    fptpSeats: 1,
    prSeats: 4,
    totalSeats: 5,
  },
  {
    id: "party-ind",
    name: "Independent",
    shortName: "IND",
    colorHex: "#888888",
    fptpSeats: 1,
    prSeats: 0,
    totalSeats: 1,
  },
] as const;

const RSS_SOURCES: Array<{
  id: string;
  name: string;
  rssUrl: string;
  websiteUrl?: string;
  category: string;
}> = [
  {
    id: "src-kathmandu-post",
    name: "The Kathmandu Post",
    rssUrl: "https://kathmandupost.com/feed",
    websiteUrl: "https://kathmandupost.com",
    category: "media",
  },
  {
    id: "src-himalayan-times",
    name: "The Himalayan Times",
    rssUrl: "https://thehimalayantimes.com/feed/",
    websiteUrl: "https://thehimalayantimes.com",
    category: "media",
  },
  {
    id: "src-myrepublica",
    name: "myRepublica",
    rssUrl: "https://myrepublica.nagariknetwork.com/feed/",
    category: "media",
  },
  {
    id: "src-nepali-times",
    name: "Nepali Times",
    rssUrl: "https://nepalitimes.com/feed",
    category: "media",
  },
  {
    id: "src-online-khabar-en",
    name: "Online Khabar (English)",
    rssUrl: "https://english.onlinekhabar.com/feed",
    category: "media",
  },
  {
    id: "src-khabarhub-en",
    name: "Khabarhub (English)",
    rssUrl: "https://english.khabarhub.com/feed",
    category: "media",
  },
  {
    id: "src-setopati",
    name: "Setopati",
    rssUrl: "https://setopati.com/feed",
    category: "media",
  },
];

type MinisterRow = {
  id: string;
  name: string;
  ministryRole: string;
};

const MINISTERS: MinisterRow[] = [
  { id: "mp-rsp-balen", name: "Balendra Shah (Balen)", ministryRole: "Prime Minister; Defence; Industry" },
  { id: "mp-rsp-wagle", name: "Swarnim Wagle", ministryRole: "Finance" },
  { id: "mp-rsp-khanal", name: "Shishir Khanal", ministryRole: "Foreign Affairs" },
  { id: "mp-rsp-paudel", name: "Khadka Raj (Ganesh) Paudel", ministryRole: "Culture, Tourism & Civil Aviation" },
  { id: "mp-rsp-pokharel", name: "Sasmit Pokharel", ministryRole: "Education, Science & Technology; Youth & Sports" },
  { id: "mp-rsp-rawal", name: "Pratibha Rawal", ministryRole: "Federal Affairs, General Administration, Land, Cooperatives & Poverty" },
  { id: "mp-rsp-shrestha", name: "Biraj Bhakta Shrestha", ministryRole: "Energy, Water Resources & Irrigation" },
  { id: "mp-rsp-chaudhary", name: "Gita Chaudhary", ministryRole: "Agriculture, Livestock; Forest & Environment" },
  { id: "mp-rsp-gautam", name: "Sobita Gautam", ministryRole: "Law, Justice & Parliamentary Affairs" },
  { id: "mp-rsp-badi", name: "Sita Badi", ministryRole: "Women, Children & Senior Citizens" },
  { id: "mp-rsp-lamsal", name: "Sunil Lamsal", ministryRole: "Physical Infrastructure, Transport & Urban Development" },
  { id: "mp-rsp-mehata", name: "Nisha Mehata", ministryRole: "Health & Population; Water Supply" },
];

export async function seedPoliticalPulseIfEmpty(): Promise<void> {
  const existing = await db.select({ c: sql<number>`count(*)::int` }).from(parties);
  if ((existing[0]?.c ?? 0) > 0) {
    return;
  }

  console.log("[nepal-intelligence-os] Seeding Political Pulse (parties, RSS, MPs)...");

  await db.insert(parties).values(
    PARTY_ROWS.map((p) => ({
      id: p.id,
      name: p.name,
      shortName: p.shortName,
      colorHex: p.colorHex,
      isGoverning: p.isGoverning ?? false,
      fptpSeats: p.fptpSeats,
      prSeats: p.prSeats,
      totalSeats: p.totalSeats,
      chairperson: "chairperson" in p ? (p as { chairperson?: string }).chairperson ?? null : null,
      parliamentaryLeader:
        "parliamentaryLeader" in p ? (p as { parliamentaryLeader?: string }).parliamentaryLeader ?? null : null,
      seatsUpdatedAt: NOW,
    }))
  );

  await db.insert(newsFeedSources).values(
    RSS_SOURCES.map((s) => ({
      id: s.id,
      name: s.name,
      rssUrl: s.rssUrl,
      websiteUrl: s.websiteUrl ?? null,
      language: "en",
      category: s.category,
      isActive: true,
      lastPolledAt: null,
      pollIntervalMinutes: 30,
    }))
  );

  const ministerRows = MINISTERS.map((m) => ({
    id: m.id,
    name: m.name,
    partyId: "party-rsp",
    ministryRole: m.ministryRole,
    committeeAssignments: null,
    billsSponsored: 0,
    contactEmail: null,
    socialMedia: null,
    photoUrl: null,
    constituency: null,
    electionType: "FPTP" as const,
    createdAt: NOW,
  }));

  await db.insert(mps).values(ministerRows);

  const generic: Array<{
    id: string;
    name: string;
    partyId: string;
    electionType: "FPTP" | "PR";
  }> = [];

  const targets: Array<{ partyId: string; count: number }> = [
    { partyId: "party-rsp", count: 170 },
    { partyId: "party-nc", count: 39 },
    { partyId: "party-uml", count: 25 },
    { partyId: "party-ncp", count: 17 },
    { partyId: "party-ssp", count: 7 },
    { partyId: "party-rpp", count: 5 },
    { partyId: "party-ind", count: 1 },
  ];

  for (const t of targets) {
    for (let i = 0; i < t.count; i++) {
      const et: "FPTP" | "PR" = i < Math.floor(t.count / 2) ? "FPTP" : "PR";
      generic.push({
        id: `mp-${t.partyId}-${i}`,
        name: `HoR member (${t.partyId.replace("party-", "").toUpperCase()}) ${i + 1}`,
        partyId: t.partyId,
        electionType: et,
      });
    }
  }

  await db.insert(mps).values(
    generic.map((g) => ({
      id: g.id,
      name: g.name,
      partyId: g.partyId,
      ministryRole: null,
      committeeAssignments: null,
      billsSponsored: 0,
      contactEmail: null,
      socialMedia: null,
      photoUrl: null,
      constituency: null,
      electionType: g.electionType,
      createdAt: NOW,
    }))
  );

  await db.insert(politicalEvents).values({
    id: "evt-seed-pm-sworn-in",
    eventType: "appointment",
    title: "Balendra Shah sworn in as 47th Prime Minister of Nepal",
    summary:
      "RSP forms government with a historic HoR mandate. Cabinet portfolios assigned under the new administration.",
    fullContent: null,
    sourceName: "Nepal Intelligence OS",
    sourceUrl: null,
    partyIds: ["party-rsp"],
    mpIds: ["mp-rsp-balen"],
    ministry: "Office of the Prime Minister",
    billNumber: null,
    billStatus: null,
    tags: ["government", "RSP", "HoR"],
    publishedAt: NOW,
    fetchedAt: NOW,
    isVerified: true,
    importanceScore: 10,
  });

  console.log(
    `[nepal-intelligence-os] Political Pulse seeded: ${PARTY_ROWS.length} parties, ${RSS_SOURCES.length} RSS sources, ${ministerRows.length + generic.length} MPs`
  );
}

export async function ensurePoliticalPulseSeed(): Promise<void> {
  try {
    await seedPoliticalPulseIfEmpty();
  } catch (e) {
    console.warn(
      "[nepal-intelligence-os] Political Pulse seed skipped:",
      e instanceof Error ? e.message : e
    );
  }
}
