import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import {
  clampPratipakchyaProgress,
  normalizePratipakchyaPromiseStatus,
  type PratipakchyaPromise,
} from "@/lib/pratipakchya-shared";

function repoRootFromWebAppCwd(cwd: string): string {
  // apps/web → repo root
  return path.resolve(cwd, "..", "..");
}

export const getPratipakchyaPromises = cache(async (): Promise<PratipakchyaPromise[]> => {
  const root = repoRootFromWebAppCwd(process.cwd());
  const filePath = path.join(root, "data", "pratipakchya", "promises.json");
  const raw = await readFile(filePath, "utf8");
  const parsed: unknown = JSON.parse(raw);
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

export async function getPratipakchyaPromiseById(
  id: number
): Promise<PratipakchyaPromise | null> {
  const all = await getPratipakchyaPromises();
  return all.find((p) => p.id === id) ?? null;
}

