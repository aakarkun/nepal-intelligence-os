export type PratipakchyaPromiseStatus = "not-started" | "in-progress" | "completed";

export type PratipakchyaPromise = {
  id: number;
  category: string;
  categoryNe: string;
  categoryEn: string;
  titleNe: string;
  titleEn: string;
  deadline: string;
  deadlineDate: string;
  status: PratipakchyaPromiseStatus | (string & {});
  progress: number;
  lastUpdated: string;
  evidence: string;
  notes: string;
};

export function normalizePratipakchyaPromiseStatus(
  status: string
): PratipakchyaPromiseStatus | (string & {}) {
  const s = status
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-");

  if (s === "completed") return "completed";
  if (s === "in-progress" || s === "inprogress") return "in-progress";
  if (s === "not-started" || s === "notstarted") return "not-started";

  return s;
}

export function clampPratipakchyaProgress(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

