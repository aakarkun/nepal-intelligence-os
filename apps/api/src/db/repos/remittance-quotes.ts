import { asc, desc, eq, and } from "drizzle-orm";
import { db } from "../client.js";
import { remittanceProviders, remittanceQuoteSnapshots } from "../schema.js";

export type RemittanceProviderRow = {
  id: string;
  name: string;
  websiteUrl: string | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RemittanceQuoteSnapshotRow = {
  id: string;
  providerId: string;
  corridorSendCurrency: string;
  corridorReceiveCurrency: string;
  sendAmount: number;
  feeAmount: number | null;
  feeCurrency: string | null;
  receiveAmount: number | null;
  rate: number | null;
  paymentMethod: string | null;
  payoutMethod: string | null;
  speedTier: string | null;
  collectedAt: string;
  rawPayload: unknown | null;
  rawHash: string | null;
  notes: string | null;
  createdAt: string;
};

function providerToApi(row: typeof remittanceProviders.$inferSelect): RemittanceProviderRow {
  return {
    id: row.id,
    name: row.name,
    websiteUrl: row.websiteUrl ?? null,
    logoUrl: row.logoUrl ?? null,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function quoteToApi(row: typeof remittanceQuoteSnapshots.$inferSelect): RemittanceQuoteSnapshotRow {
  return {
    id: row.id,
    providerId: row.providerId,
    corridorSendCurrency: row.corridorSendCurrency,
    corridorReceiveCurrency: row.corridorReceiveCurrency,
    sendAmount: row.sendAmount,
    feeAmount: row.feeAmount ?? null,
    feeCurrency: row.feeCurrency ?? null,
    receiveAmount: row.receiveAmount ?? null,
    rate: row.rate ?? null,
    paymentMethod: row.paymentMethod ?? null,
    payoutMethod: row.payoutMethod ?? null,
    speedTier: row.speedTier ?? null,
    collectedAt: row.collectedAt,
    rawPayload: row.rawPayload ?? null,
    rawHash: row.rawHash ?? null,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
  };
}

export async function listProviders(): Promise<RemittanceProviderRow[]> {
  const rows = await db
    .select()
    .from(remittanceProviders)
    .orderBy(asc(remittanceProviders.name));
  return rows.map(providerToApi);
}

export async function upsertProvider(input: {
  id: string;
  name: string;
  websiteUrl?: string | null;
  logoUrl?: string | null;
  isActive?: boolean;
  updatedAt?: string;
}): Promise<RemittanceProviderRow> {
  const now = new Date().toISOString();
  const updatedAt = input.updatedAt ?? now;

  await db
    .insert(remittanceProviders)
    .values({
      id: input.id,
      name: input.name,
      websiteUrl: input.websiteUrl ?? null,
      logoUrl: input.logoUrl ?? null,
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: remittanceProviders.id,
      set: {
        name: input.name,
        websiteUrl: input.websiteUrl ?? null,
        logoUrl: input.logoUrl ?? null,
        isActive: input.isActive ?? true,
        updatedAt,
      },
    });

  const rows = await db
    .select()
    .from(remittanceProviders)
    .where(eq(remittanceProviders.id, input.id))
    .limit(1);
  if (!rows[0]) {
    throw new Error("Failed to upsert provider");
  }
  return providerToApi(rows[0]);
}

export async function insertQuoteSnapshot(input: RemittanceQuoteSnapshotRow): Promise<void> {
  await db.insert(remittanceQuoteSnapshots).values({
    id: input.id,
    providerId: input.providerId,
    corridorSendCurrency: input.corridorSendCurrency,
    corridorReceiveCurrency: input.corridorReceiveCurrency,
    sendAmount: input.sendAmount,
    feeAmount: input.feeAmount,
    feeCurrency: input.feeCurrency,
    receiveAmount: input.receiveAmount,
    rate: input.rate,
    paymentMethod: input.paymentMethod,
    payoutMethod: input.payoutMethod,
    speedTier: input.speedTier,
    collectedAt: input.collectedAt,
    rawPayload: input.rawPayload ? JSON.parse(JSON.stringify(input.rawPayload)) : null,
    rawHash: input.rawHash,
    notes: input.notes,
    createdAt: input.createdAt,
  });
}

export async function getLatestQuoteForProvider(params: {
  providerId: string;
  sendCurrency: string;
  receiveCurrency: string;
  sendAmount: number;
}): Promise<RemittanceQuoteSnapshotRow | null> {
  const rows = await db
    .select()
    .from(remittanceQuoteSnapshots)
    .where(
      and(
        eq(remittanceQuoteSnapshots.providerId, params.providerId),
        eq(remittanceQuoteSnapshots.corridorSendCurrency, params.sendCurrency),
        eq(remittanceQuoteSnapshots.corridorReceiveCurrency, params.receiveCurrency),
        eq(remittanceQuoteSnapshots.sendAmount, params.sendAmount)
      )
    )
    .orderBy(desc(remittanceQuoteSnapshots.collectedAt))
    .limit(1);
  return rows[0] ? quoteToApi(rows[0]) : null;
}

