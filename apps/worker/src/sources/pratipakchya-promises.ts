import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createContext, runInContext } from "node:vm";

export type PratipakchyaPromise = {
  id: number;
  category: string;
  categoryNe: string | null;
  categoryEn: string | null;
  titleNe: string | null;
  titleEn: string | null;
  deadline: string | null;
  deadlineDate: string | null;
  status: string;
  progress: number;
  lastUpdated: string | null;
  evidence: string | null;
  notes: string | null;
  payload: unknown;
  fetchedAt: string;
  updatedAt: string;
};

type CacheFile = {
  etag?: string;
  sha256?: string;
  fetchedAt: string;
  sourceUrl: string;
};

const SOURCE_URL = "https://pratipakchya.com/promises.js";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

async function readCache(path: string): Promise<CacheFile | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as CacheFile;
  } catch {
    return null;
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function fetchSource(url: string, etag?: string): Promise<{ body: string | null; etag?: string }> {
  const res = await fetch(url, {
    method: "GET",
    headers: etag ? { "If-None-Match": etag } : undefined,
  });

  if (res.status === 304) return { body: null, etag };
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);

  const newEtag = res.headers.get("etag") ?? undefined;
  return { body: await res.text(), etag: newEtag };
}

function extractPromisesFromJs(sourceJs: string): unknown[] {
  // `const PROMISES = [...]` does not become a global; expose it explicitly.
  const wrapped = `${sourceJs}\n;globalThis.__EXTRACTED_PROMISES__ = (typeof PROMISES !== "undefined" ? PROMISES : undefined);\n`;
  const sandbox: Record<string, unknown> = { globalThis: {} };
  const ctx = createContext(sandbox, { name: "pratipakchya-promises-sandbox" });
  runInContext(wrapped, ctx, { timeout: 1500 });

  const extracted = (sandbox.globalThis as Record<string, unknown>).__EXTRACTED_PROMISES__;
  if (!Array.isArray(extracted)) {
    throw new Error("Extraction failed: PROMISES was not an array.");
  }
  return extracted;
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length ? v : null;
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim().length) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normalizeRow(raw: unknown, fetchedAt: string): PratipakchyaPromise | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const id = asNumber(r.id);
  const category = asString(r.category);
  const status = asString(r.status);
  if (id == null || category == null || status == null) return null;

  const progress = asNumber(r.progress);
  const updatedAt = asString(r.lastUpdated) ?? fetchedAt;

  return {
    id: Math.trunc(id),
    category,
    categoryNe: asString(r.categoryNe),
    categoryEn: asString(r.categoryEn),
    titleNe: asString(r.titleNe),
    titleEn: asString(r.titleEn),
    deadline: asString(r.deadline),
    deadlineDate: asString(r.deadlineDate),
    status,
    progress: progress == null ? 0 : Math.max(0, Math.min(100, Math.trunc(progress))),
    lastUpdated: asString(r.lastUpdated),
    evidence: asString(r.evidence),
    notes: asString(r.notes),
    payload: raw,
    fetchedAt,
    updatedAt,
  };
}

/**
 * Fetch, extract, and normalize Pratipakchya promises.
 * Returns `null` when upstream responds 304 or body hash is unchanged.
 */
export async function fetchPratipakchyaPromises(options?: {
  cachePath?: string;
}): Promise<PratipakchyaPromise[] | null> {
  const cachePath =
    options?.cachePath ??
    resolve(import.meta.dir, "..", "..", ".cache", "pratipakchya-promises.json");

  const cache = await readCache(cachePath);
  const { body, etag } = await fetchSource(SOURCE_URL, cache?.etag);
  if (body === null) return null;

  const sha = sha256Hex(body);
  if (cache?.sha256 && cache.sha256 === sha) {
    await writeJson(cachePath, {
      etag,
      sha256: sha,
      fetchedAt: new Date().toISOString(),
      sourceUrl: SOURCE_URL,
    } satisfies CacheFile);
    return null;
  }

  const fetchedAt = new Date().toISOString();
  const raw = extractPromisesFromJs(body);
  const normalized = raw.map((r) => normalizeRow(r, fetchedAt)).filter(Boolean) as PratipakchyaPromise[];

  await writeJson(cachePath, {
    etag,
    sha256: sha,
    fetchedAt,
    sourceUrl: SOURCE_URL,
  } satisfies CacheFile);

  return normalized;
}

