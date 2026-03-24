import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { env } from "./env";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-NP").format(n);
}

export function formatNepalTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-US", {
    timeZone: "Asia/Kathmandu",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  if (hours < 24) {
    if (remMin > 0) return `${hours}h ${remMin}m ago`;
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  const remH = hours % 24;
  if (remH > 0) return `${days}d ${remH}h ago`;
  return `${days}d ago`;
}

/**
 * Like `timeAgo`, but treats bare `YYYY-MM-DD` as noon Nepal time so “ago” matches NRB calendar dates.
 */
export function timeAgoFlexible(input: string): string {
  const s = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return timeAgo(`${s}T12:00:00+05:45`);
  }
  return timeAgo(s);
}

// Formats the original source timestamp (e.g. RSS pubDate) using the browser's
// local timezone, so it reflects the time as published by the source rather
// than forcing Nepal-time conversion.
export function formatSourceDateTime(timestamp: string): string {
  const d = new Date(timestamp);
  // Show as source-local (Nepal) time so it matches what
  // users see on the publisher's page, even if the browser
  // itself is in a different timezone.
  return d.toLocaleString("en-NP", {
    timeZone: "Asia/Kathmandu",
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

export function formatNepalDateTime(timestamp: string): string {
  const d = new Date(timestamp);
  return d.toLocaleString("en-NP", {
    timeZone: "Asia/Kathmandu",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Collapses whitespace for stable duplicate headline matching. */
export function normalizeFeedTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ");
}

/**
 * One row per normalized title — keeps the newest event (largest `getTime` value).
 * Events with an empty title after normalization are kept (not merged).
 */
export function dedupeEventsByTitle<T extends { title: string }>(
  events: T[],
  getTime: (e: T) => number
): T[] {
  if (events.length <= 1) return events;
  const sorted = [...events].sort((a, b) => getTime(b) - getTime(a));
  const seen = new Set<string>();
  const out: T[] = [];
  for (const e of sorted) {
    const key = normalizeFeedTitle(e.title);
    if (!key) {
      out.push(e);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out.sort((a, b) => getTime(b) - getTime(a));
}

/** Dedupe signal feed rows where `timestamp` is ISO time. */
export function dedupeSignalEventsByTitle<T extends { title: string; timestamp: string }>(
  events: T[]
): T[] {
  return dedupeEventsByTitle(events, (e) => new Date(e.timestamp).getTime());
}

/** Uses NEXT_PUBLIC_SSE_STALE_SECONDS (default 90): live < threshold, stale < 5×, else error. */
export function getConnectionStatusColor(
  lastHeartbeat: number | null
): "live" | "stale" | "error" {
  if (!lastHeartbeat) return "error";
  const staleSeconds = env.NEXT_PUBLIC_SSE_STALE_SECONDS;
  const liveThresholdMs = staleSeconds * 1000;
  const staleThresholdMs = 5 * liveThresholdMs;
  const age = Date.now() - lastHeartbeat;
  if (age < liveThresholdMs) return "live";
  if (age < staleThresholdMs) return "stale";
  return "error";
}

export const API_URL = env.NEXT_PUBLIC_API_URL;
