import { eq, and, desc } from "drizzle-orm";
import { db } from "../client.js";
import { worldArticles } from "../schema.js";
import type { GeopoliticsArticle } from "@repo/shared";

function rowToArticle(row: typeof worldArticles.$inferSelect): GeopoliticsArticle {
  return {
    id: row.id,
    title: row.title,
    url: row.url ?? "",
    source: row.source ?? "",
    panel: row.panel as GeopoliticsArticle["panel"],
    tone: row.tone ?? null,
    publishedAt: row.publishedAt,
    language: row.language ?? "",
    imageUrl: row.imageUrl ?? null,
    fetchedAt: row.fetchedAt,
  };
}

export async function upsertWorldArticle(article: GeopoliticsArticle): Promise<void> {
  await db.insert(worldArticles).values({
    id: article.id,
    title: article.title,
    url: article.url ?? null,
    source: article.source ?? null,
    panel: article.panel ?? null,
    tone: article.tone ?? null,
    language: article.language ?? null,
    imageUrl: article.imageUrl ?? null,
    publishedAt: article.publishedAt,
    fetchedAt: article.fetchedAt,
  }).onConflictDoUpdate({
    target: worldArticles.id,
    set: {
      title: article.title,
      url: article.url ?? null,
      source: article.source ?? null,
      panel: article.panel ?? null,
      tone: article.tone ?? null,
      publishedAt: article.publishedAt,
      fetchedAt: article.fetchedAt,
    },
  });
}

export async function getWorldArticles(opts?: { panel?: string; limit?: number }): Promise<GeopoliticsArticle[]> {
  const limit = opts?.limit ?? 20;
  const rows = await db.select()
    .from(worldArticles)
    .where(opts?.panel ? eq(worldArticles.panel, opts.panel) : undefined)
    .orderBy(desc(worldArticles.publishedAt))
    .limit(limit);
  return rows.map(rowToArticle);
}
