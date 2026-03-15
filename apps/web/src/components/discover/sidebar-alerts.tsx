"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { fetchCrisisIncidents, fetchEarthquakeIncidents } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

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

  const alertItems: { id: string; title: string; severity: string; time: string }[] = [];
  incidents.slice(0, 3).forEach((i) => {
    alertItems.push({
      id: `inc-${i.id}`,
      title: i.title,
      severity: "warning",
      time: i.timestamp,
    });
  });
  earthquakes.slice(0, 2).forEach((e) => {
    alertItems.push({
      id: `eq-${e.id}`,
      title: `${e.title} (M${e.magnitude})`,
      severity: e.magnitude >= 5 ? "critical" : "warning",
      time: e.timestamp,
    });
  });
  alertItems.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  const display = alertItems.slice(0, 5);
  const hasCritical = display.some((a) => a.severity === "critical");

  return (
    <div className="rounded-lg border border-border bg-card p-4">
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
            <div key={a.id} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <Badge
                  variant={a.severity === "critical" ? "destructive" : "secondary"}
                  className="text-[10px]"
                >
                  {a.severity}
                </Badge>
                <span className="text-[10px] text-muted-foreground">{timeAgo(a.time)}</span>
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
