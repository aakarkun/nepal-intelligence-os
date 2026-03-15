"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { fetchCrisisIncidents, fetchEarthquakeIncidents } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import { Check } from "lucide-react";

type AlertSeverity = "info" | "warning" | "danger" | "extreme_danger";
type AlertTypeInfo = { icon: string; label: string };

function getTypeInfo(incidentType: "flood" | "protest" | "fire" | "seismic"): AlertTypeInfo {
  switch (incidentType) {
    case "flood":
      return { icon: "💧", label: "Flood" };
    case "protest":
      return { icon: "⚡", label: "Security" };
    case "fire":
      return { icon: "🔥", label: "Fire" };
    case "seismic":
      return { icon: "🌍", label: "Seismic" };
    default:
      return { icon: "⚠️", label: "Alert" };
  }
}

const BADGE_STYLES: Record<AlertSeverity, string> = {
  info: "bg-[#374151] text-[#9ca3af]",
  warning: "bg-[#d97706] text-white",
  danger: "bg-[#dc2626] text-white",
  extreme_danger: "bg-[#dc2626] text-white animate-pulse",
};

export function SidebarAlerts() {
  const { data: incidents = [] } = useQuery({
    queryKey: ["crisis", "incidents", "sidebar"],
    queryFn: () => fetchCrisisIncidents(),
    refetchInterval: 60_000,
  });
  const { data: earthquakes = [] } = useQuery({
    queryKey: ["crisis", "earthquakes", "sidebar"],
    queryFn: () => fetchEarthquakeIncidents(),
    refetchInterval: 60_000,
  });

  const alertItems: {
    id: string;
    title: string;
    severity: AlertSeverity;
    time: string;
    typeInfo: AlertTypeInfo;
  }[] = [];
  incidents.slice(0, 3).forEach((i) => {
    alertItems.push({
      id: `inc-${i.id}`,
      title: i.title,
      severity: "warning",
      time: i.timestamp,
      typeInfo: getTypeInfo(i.type),
    });
  });
  earthquakes.slice(0, 2).forEach((e) => {
    alertItems.push({
      id: `eq-${e.id}`,
      title: `${e.title} (M${e.magnitude})`,
      severity: e.magnitude >= 5 ? "danger" : "warning",
      time: e.timestamp,
      typeInfo: getTypeInfo("seismic"),
    });
  });
  alertItems.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  const display = alertItems.slice(0, 5);
  const hasCritical = display.some((a) => a.severity === "danger" || a.severity === "extreme_danger");

  return (
    <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-card p-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium text-foreground">Active Alerts</h3>
        {hasCritical && (
          <span
            className="h-2 w-2 rounded-full bg-red-500"
            aria-hidden
          />
        )}
      </div>
      <div className="mt-2 space-y-2">
        {display.length === 0 ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-emerald-500" />
            No active alerts
          </p>
        ) : (
          display.map((a) => (
            <div
              key={a.id}
              className="flex flex-col gap-0.5 rounded-md border border-[rgba(255,255,255,0.08)] bg-muted/20 px-2.5 py-1.5"
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
                    BADGE_STYLES[a.severity]
                  )}
                >
                  {a.severity.replace("_", " ")}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {a.typeInfo.icon} {a.typeInfo.label} · {timeAgo(a.time)}
                </span>
              </div>
              <p className="line-clamp-2 text-xs text-foreground">{a.title}</p>
            </div>
          ))
        )}
      </div>
      {display.length > 0 && (
        <Link
          href="/disasters"
          className="mt-2 block text-xs text-nepal-red hover:underline"
        >
          View all →
        </Link>
      )}
    </div>
  );
}
