import { eq, and, gte, desc } from "drizzle-orm";
import { db } from "../client.js";
import { newsArticles } from "../schema.js";

type NewsArticle = {
  id: string;
  title: string;
  body: string | null;
  source: string | null;
  url: string | null;
  severity: string;
  type: string;
  entities: unknown;
  publishedAt: string;
  ingestedAt: string;
};

export async function upsertNewsArticle(article: NewsArticle): Promise<void> {
  await db.insert(newsArticles).values({
    id: article.id,
    title: article.title,
    body: article.body ?? null,
    source: article.source ?? null,
    url: article.url ?? null,
    severity: article.severity,
    type: article.type,
    entities: article.entities ? JSON.parse(JSON.stringify(article.entities)) : null,
    publishedAt: article.publishedAt,
    ingestedAt: article.ingestedAt ?? new Date().toISOString(),
  }).onConflictDoUpdate({
    target: newsArticles.id,
    set: {
      title: article.title,
      body: article.body ?? null,
      severity: article.severity,
      type: article.type,
      publishedAt: article.publishedAt,
    },
  });
}

export async function getNewsArticles(opts?: {
  limit?: number;
  severity?: string;
  since?: Date;
}): Promise<NewsArticle[]> {
  const conditions = [];
  if (opts?.severity) conditions.push(eq(newsArticles.severity, opts.severity));
  if (opts?.since) conditions.push(gte(newsArticles.publishedAt, opts.since.toISOString()));

  const limit = opts?.limit ?? 50;
  const rows = await db.select()
    .from(newsArticles)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(newsArticles.publishedAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    source: r.source,
    url: r.url,
    severity: r.severity,
    type: r.type,
    entities: r.entities,
    publishedAt: r.publishedAt,
    ingestedAt: r.ingestedAt,
  }));
}
