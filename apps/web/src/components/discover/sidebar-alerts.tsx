"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { fetchCrisisIncidents, fetchEarthquakeIncidents } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import {
  DiscoverRailPanel,
  discoverSidebarFooterStrip,
} from "@/components/discover/discover-rail-panel";
import { railRow } from "@/components/layout/intel-rail";
import { Check } from "@/components/icons";

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

/** Muted rail-style chips — no solid bright fills */
const BADGE_STYLES: Record<AlertSeverity, string> = {
  info: "border border-white/[0.08] bg-white/[0.04] text-[#9ca3af]",
  warning: "border border-amber-500/20 bg-amber-500/[0.08] text-amber-200/75",
  danger: "border border-rose-500/25 bg-rose-500/[0.1] text-rose-200/80",
  extreme_danger:
    "border border-rose-500/30 bg-rose-500/[0.12] text-rose-200/85 animate-pulse",
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
    <DiscoverRailPanel
      title="Active alerts"
      leadingDotClass={hasCritical ? "bg-rose-500" : "bg-amber-500"}
      right={
        hasCritical ? (
          <span className="h-1.5 w-1.5 shrink-0 rounded-sm bg-rose-500" aria-hidden />
        ) : null
      }
    >
      <div className="flex flex-col gap-0">
        {display.length === 0 ? (
          <div className={cn(railRow, "rounded-t-xl rounded-b-xl")}>
            <p className="flex items-center gap-2 font-mono text-[12px] text-[#666]">
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400/80" />
              No active alerts
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-0">
            <div className="overflow-hidden rounded-xl">
              <div
                className={cn(
                  "overflow-hidden bg-[#181818]/60",
                  "rounded-t-xl rounded-bl-xl rounded-br-xl"
                )}
              >
                {display.map((a) => (
                  <div
                    key={a.id}
                    className={cn(railRow, "flex flex-col gap-1")}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[11px] font-medium uppercase",
                          BADGE_STYLES[a.severity]
                        )}
                      >
                        {a.severity.replace("_", " ")}
                      </span>
                      <span className="font-mono text-[11px] text-[#555]">
                        {a.typeInfo.icon} {a.typeInfo.label} · {timeAgo(a.time)}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-[13px] leading-snug text-[#ccc]">{a.title}</p>
                  </div>
                ))}
              </div>
              <div className={discoverSidebarFooterStrip}>
                <Link
                  href="/disasters"
                  className="font-mono text-[12px] uppercase tracking-wider text-emerald-400/90 hover:underline"
                >
                  View all →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </DiscoverRailPanel>
  );
}
