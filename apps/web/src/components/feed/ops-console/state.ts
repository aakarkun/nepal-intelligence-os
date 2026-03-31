"use client";

export type SignalsConsoleMode = "live" | "review";

const LS_KEYS = {
  reviewed: "signalsConsole:reviewedIds:v1",
  pinned: "signalsConsole:pinnedIds:v1",
  mode: "signalsConsole:mode:v1",
} as const;

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function loadStringArray(key: string): string[] {
  if (typeof window === "undefined") return [];
  const parsed = safeParseJson<unknown>(window.localStorage.getItem(key));
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((v): v is string => typeof v === "string" && v.length > 0);
}

function saveStringArray(key: string, ids: Iterable<string>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(Array.from(ids)));
}

export function loadReviewedIds(): Set<string> {
  return new Set(loadStringArray(LS_KEYS.reviewed));
}

export function saveReviewedIds(ids: Set<string>): void {
  saveStringArray(LS_KEYS.reviewed, ids);
}

export function loadPinnedIds(): Set<string> {
  return new Set(loadStringArray(LS_KEYS.pinned));
}

export function savePinnedIds(ids: Set<string>): void {
  saveStringArray(LS_KEYS.pinned, ids);
}

export function loadMode(): SignalsConsoleMode {
  if (typeof window === "undefined") return "live";
  const raw = window.localStorage.getItem(LS_KEYS.mode);
  return raw === "review" ? "review" : "live";
}

export function saveMode(mode: SignalsConsoleMode): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_KEYS.mode, mode);
}
