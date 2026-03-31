"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { fetchCrisisIncidents, fetchEarthquakeIncidents } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import {
  DiscoverRailPanel,
  discoverSidebarFooterStrip,
} from "@/components/discover/discover-rail-panel";
import { cn } from "@/lib/utils";
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
      return { icon: "", label: "Seismic" };
    default:
      return { icon: "⚠️", label: "Alert" };
  }
}

const BADGE_STYLES: Record<AlertSeverity, string> = {
  info: "border border-white/[0.08] bg-white/[0.04] text-[#9ca3af]",
  warning: "border border-amber-500/20 bg-amber-500/[0.08] text-amber-200/75",
  danger: "border border-rose-500/25 bg-rose-500/[0.1] text-rose-200/80",
  extreme_danger:
    "border border-rose-500/30 bg-rose-500/[0.12] text-rose-200/85 animate-pulse",
};

export function SidebarAlerts() {
  const { data: incidents = [], isLoading: incidentsLoading } = useQuery({
    queryKey: ["crisis", "incidents", "sidebar"],
    queryFn: () => fetchCrisisIncidents(),
    refetchInterval: 60_000,
  });
  const { data: earthquakes = [], isLoading: earthquakesLoading } = useQuery({
    queryKey: ["crisis", "earthquakes", "sidebar"],
    queryFn: () => fetchEarthquakeIncidents(),
    refetchInterval: 60_000,
  });

  const isLoading = incidentsLoading || earthquakesLoading;

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

  if (isLoading) {
    return (
      <DiscoverRailPanel
        title="Active alerts"
        leadingDotClass="bg-amber-500"
        right={null}
      >
        <div className="divide-y divide-white/[0.06]">
          {[0, 1].map((idx) => (
            <div key={idx} className="flex flex-col gap-1 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="h-[18px] w-[70px] rounded bg-white/[0.06]" />
                <div className="h-3 w-[160px] rounded bg-white/[0.06]" />
              </div>
              <div className="h-4 w-[220px] rounded bg-white/[0.06]" />
            </div>
          ))}
        </div>
        <div className={discoverSidebarFooterStrip}>
          <div className="h-3 w-28 rounded bg-white/[0.06]" />
        </div>
      </DiscoverRailPanel>
    );
  }

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
      {display.length === 0 ? (
        <p className="flex items-center gap-2 py-1 font-sans text-[12px] text-[#666]">
          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400/80" />
          No active alerts
        </p>
      ) : (
        <>
          <div className="divide-y divide-white/[0.06]">
            {display.map((a) => (
              <div key={a.id} className="flex flex-col gap-1 py-2.5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded px-1.5 py-0.5 font-sans text-[11px] font-medium uppercase",
                      BADGE_STYLES[a.severity]
                    )}
                  >
                    {a.severity.replace("_", " ")}
                  </span>
                  <span className="font-sans text-[11px] text-[#555]">
                    {a.typeInfo.icon && `${a.typeInfo.icon} `}
                    {a.typeInfo.label} · {timeAgo(a.time)}
                  </span>
                </div>
                <p className="line-clamp-2 text-[13px] leading-snug text-[#ccc]">{a.title}</p>
              </div>
            ))}
          </div>
          <div className={discoverSidebarFooterStrip}>
            <Link
              href="/disasters"
              className="font-sans text-[12px] uppercase tracking-wider text-blue-400/90 hover:underline"
            >
              View all →
            </Link>
          </div>
        </>
      )}
    </DiscoverRailPanel>
  );
}
