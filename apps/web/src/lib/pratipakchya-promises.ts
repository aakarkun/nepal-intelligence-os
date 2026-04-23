import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import type { PratipakchyaPromiseApiRow } from "@/lib/api";
import {
  clampPratipakchyaProgress,
  normalizePratipakchyaPromiseStatus,
  type PratipakchyaPromise,
} from "@/lib/pratipakchya-shared";

const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:3001";

function repoRootFromWebAppCwd(cwd: string): string {
  return path.resolve(cwd, "..", "..");
}

function mapApiRowToUi(row: PratipakchyaPromiseApiRow): PratipakchyaPromise {
  return {
    id: row.id,
    category: row.category,
    categoryNe: row.categoryNe ?? "",
    categoryEn: row.categoryEn ?? "",
    titleNe: row.titleNe ?? "",
    titleEn: row.titleEn ?? "",
    deadline: row.deadline ?? "",
    deadlineDate: row.deadlineDate ?? "",
    status: normalizePratipakchyaPromiseStatus(row.status),
    progress: clampPratipakchyaProgress(row.progress),
    lastUpdated: row.lastUpdated ?? "",
    evidence: row.evidence ?? "",
    notes: row.notes ?? "",
  };
}

const loadPratipakchyaPromisesFromFile = cache(async (): Promise<PratipakchyaPromise[]> => {
  const root = repoRootFromWebAppCwd(process.cwd());
  const filePath = path.join(root, "data", "pratipakchya", "promises.json");
  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "ENOENT"
    ) {
      return [];
    }
    throw err;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((row): PratipakchyaPromise | null => {
      if (!row || typeof row !== "object") return null;
      const r = row as Partial<PratipakchyaPromise>;
      if (typeof r.id !== "number") return null;
      if (typeof r.titleEn !== "string" || typeof r.titleNe !== "string") return null;
      if (typeof r.category !== "string") return null;
      if (typeof r.categoryEn !== "string" || typeof r.categoryNe !== "string") return null;
      if (typeof r.deadline !== "string" || typeof r.deadlineDate !== "string") return null;
      if (typeof r.status !== "string") return null;
      if (typeof r.lastUpdated !== "string") return null;

      return {
        id: r.id,
        category: r.category,
        categoryNe: r.categoryNe,
        categoryEn: r.categoryEn,
        titleNe: r.titleNe,
        titleEn: r.titleEn,
        deadline: r.deadline,
        deadlineDate: r.deadlineDate,
        status: normalizePratipakchyaPromiseStatus(r.status),
        progress: clampPratipakchyaProgress(typeof r.progress === "number" ? r.progress : 0),
        lastUpdated: r.lastUpdated,
        evidence: typeof r.evidence === "string" ? r.evidence : "",
        notes: typeof r.notes === "string" ? r.notes : "",
      };
    })
    .filter((x): x is PratipakchyaPromise => Boolean(x))
    .sort((a, b) => a.id - b.id);
});

async function fetchPratipakchyaPromisesFromApiMapped(): Promise<PratipakchyaPromise[] | null> {
  try {
    const url = new URL("/v1/politics/pratipakchya/promises", API_PROXY_TARGET);
    url.searchParams.set("limit", "500");
    const res = await fetch(url.toString(), { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const rows: unknown = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return rows.map((r) => mapApiRowToUi(r as PratipakchyaPromiseApiRow));
  } catch {
    return null;
  }
}

export type PratipakchyaDataSource = "api" | "file";

const loadPratipakchyaPromisesBundle = cache(
  async (): Promise<{ promises: PratipakchyaPromise[]; source: PratipakchyaDataSource }> => {
    const fromApi = await fetchPratipakchyaPromisesFromApiMapped();
    if (fromApi && fromApi.length > 0) {
      return { promises: fromApi, source: "api" };
    }
    const fromFile = await loadPratipakchyaPromisesFromFile();
    return { promises: fromFile, source: "file" };
  }
);

export async function getPratipakchyaPromisesWithSource(): Promise<{
  promises: PratipakchyaPromise[];
  source: PratipakchyaDataSource;
}> {
  return loadPratipakchyaPromisesBundle();
}

export const getPratipakchyaPromises = cache(async (): Promise<PratipakchyaPromise[]> => {
  return (await loadPratipakchyaPromisesBundle()).promises;
});

export async function getPratipakchyaPromiseById(
  id: number
): Promise<PratipakchyaPromise | null> {
  try {
    const url = `${API_PROXY_TARGET}/v1/politics/pratipakchya/promises/${id}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (res.ok) {
      const row = (await res.json()) as PratipakchyaPromiseApiRow;
      return mapApiRowToUi(row);
    }
  } catch {
    // fall through to file
  }

  const fromFile = await loadPratipakchyaPromisesFromFile();
  return fromFile.find((p) => p.id === id) ?? null;
}
