import { eq, and, gt } from "drizzle-orm";
import { db } from "../client.js";
import { snapshots } from "../schema.js";

export type SnapshotRow = {
  slug: string;
  type: string;
  title: string;
  data: unknown;
  createdAt: string;
  expiresAt: string;
};

export async function insertSnapshot(snapshot: SnapshotRow): Promise<void> {
  await db.insert(snapshots).values({
    slug: snapshot.slug,
    type: snapshot.type,
    title: snapshot.title,
    data: snapshot.data ? JSON.parse(JSON.stringify(snapshot.data)) : {},
    createdAt: snapshot.createdAt,
    expiresAt: snapshot.expiresAt,
  }).onConflictDoUpdate({
    target: snapshots.slug,
    set: {
      type: snapshot.type,
      title: snapshot.title,
      data: snapshot.data ? JSON.parse(JSON.stringify(snapshot.data)) : {},
      createdAt: snapshot.createdAt,
      expiresAt: snapshot.expiresAt,
    },
  });
}

/** Returns null if snapshot is expired (expires_at < NOW()). */
export async function getSnapshot(slug: string): Promise<SnapshotRow | null> {
  const now = new Date().toISOString();
  const rows = await db.select()
    .from(snapshots)
    .where(and(eq(snapshots.slug, slug), gt(snapshots.expiresAt, now)))
    .limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    slug: r.slug,
    type: r.type,
    title: r.title,
    data: r.data,
    createdAt: r.createdAt,
    expiresAt: r.expiresAt,
  };
}
