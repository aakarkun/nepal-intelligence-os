"use client";

import type { SignalSeverity, SignalEventType } from "@repo/shared";

export const SEVERITY_STRIPE_CLASS: Record<SignalSeverity, string> = {
  critical: "bg-status-error",
  warning: "bg-status-stale",
  info: "bg-muted-foreground/60",
};

export const SEVERITY_BADGE_CLASS: Record<SignalSeverity, string> = {
  critical: "border-red-500/25 bg-red-500/10 text-red-300",
  warning: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  info: "border-border/40 bg-muted/20 text-muted-foreground",
};

export const TYPE_BADGE_CLASS: Partial<Record<SignalEventType, string>> = {
  anomaly: "border-red-500/25 bg-red-500/8 text-red-300",
  official: "border-blue-500/25 bg-blue-500/8 text-blue-300",
  ingest: "border-border/40 bg-muted/20 text-muted-foreground",
  note: "border-yellow-500/25 bg-yellow-500/8 text-yellow-300",
  news: "border-violet-500/25 bg-violet-500/8 text-violet-300",
  political: "border-indigo-500/25 bg-indigo-500/8 text-indigo-300",
  security: "border-red-600/25 bg-red-600/8 text-red-300",
  economic: "border-emerald-500/25 bg-emerald-500/8 text-emerald-300",
  disaster: "border-orange-500/25 bg-orange-500/8 text-orange-300",
  diplomatic: "border-blue-600/25 bg-blue-600/8 text-blue-300",
  health: "border-pink-500/25 bg-pink-500/8 text-pink-300",
};

export function titleForType(type: string): string {
  switch (type) {
    case "official":
      return "Official";
    case "ingest":
      return "Ingest";
    case "anomaly":
      return "Anomaly";
    case "note":
      return "Social";
    case "news":
      return "News";
    case "political":
      return "Political";
    case "security":
      return "Security";
    case "economic":
      return "Economic";
    case "disaster":
      return "Disaster";
    case "diplomatic":
      return "Diplomatic";
    case "health":
      return "Health";
    default:
      return type;
  }
}
