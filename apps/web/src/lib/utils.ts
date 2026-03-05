import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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

export function getConnectionStatusColor(
  lastHeartbeat: number | null
): "live" | "stale" | "error" {
  if (!lastHeartbeat) return "error";
  const age = Date.now() - lastHeartbeat;
  if (age < 60_000) return "live";
  if (age < 300_000) return "stale";
  return "error";
}

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
