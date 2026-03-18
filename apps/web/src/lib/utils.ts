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
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatSourceDateTime(timestamp: string): string {
  const d = new Date(timestamp);
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
