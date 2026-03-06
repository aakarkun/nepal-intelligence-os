"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CloudRain,
  AlertTriangle,
  Heart,
  Siren,
  ArrowUpRight,
  MapPinned,
} from "lucide-react";
import { fetchAnomalies, fetchCrisisSummary, fetchEarthquakeIncidents } from "@/lib/api";
import { formatNepalDateTime, timeAgo } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const FEATURES = [
  {
    icon: Activity,
    title: "Seismic Activity",
    description:
      "News-derived watchlist for earthquakes, aftershocks, and impact reporting while direct seismic feeds are pending.",
  },
  {
    icon: CloudRain,
    title: "Flood & Landslide",
    description:
      "Flood, landslide, and heavy-weather reporting grouped into a single monitoring lane.",
  },
  {
    icon: AlertTriangle,
    title: "BIPAD Integration",
    description:
      "Official incident connectors are still pending; current module surfaces relevant alerts from the shared feed.",
  },
  {
    icon: Heart,
    title: "Relief Tracker",
    description:
      "Relief, rescue, and humanitarian logistics stories highlighted for operators.",
  },
];

export default function DisastersPage() {
  const { data: incidents = [] } = useQuery({
    queryKey: ["crisis-earthquakes"],
    queryFn: fetchEarthquakeIncidents,
    refetchInterval: 15_000,
  });
  const { data: summary } = useQuery({
    queryKey: ["crisis-summary"],
    queryFn: fetchCrisisSummary,
    refetchInterval: 15_000,
  });
  const { data: anomalies = [] } = useQuery({
    queryKey: ["anomalies", "crisis"],
    queryFn: fetchAnomalies,
    refetchInterval: 15_000,
  });

  const criticalAnomalies = anomalies.filter((anomaly) => anomaly.severity === "critical");
  const strongestIncidents = useMemo(
    () => [...incidents].sort((a, b) => b.magnitude - a.magnitude).slice(0, 8),
    [incidents]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Crisis Monitor
        </h1>
        <p className="text-muted-foreground text-sm">
          Official seismic feed plus anomaly watch for operational monitoring
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-5 space-y-1">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Earthquakes tracked
            </div>
            <div className="text-2xl font-display font-bold">{summary?.totalIncidents ?? incidents.length}</div>
            <div className="text-xs text-muted-foreground">
              Official USGS incidents inside the Nepal watch box
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 space-y-1">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Open anomalies
            </div>
            <div className="text-2xl font-display font-bold">{anomalies.length}</div>
            <div className="text-xs text-muted-foreground">
              Election/data anomalies still unresolved
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 space-y-1">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Last 24 hours
            </div>
            <div className="text-2xl font-display font-bold">{summary?.last24h ?? 0}</div>
            <div className="text-xs text-muted-foreground">
              Earthquakes reported in the last 24 hours
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 space-y-1">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Maximum magnitude
            </div>
            <div className="text-lg font-display font-bold">
              {summary ? `M${summary.maxMagnitude.toFixed(1)}` : "No hit"}
            </div>
            <div className="text-xs text-muted-foreground">
              Strongest incident in the current tracking window
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold">
                  Earthquake watchlist
                </h2>
                <p className="text-xs text-muted-foreground">
                  Typed crisis incidents from the official USGS earthquake feed
                </p>
              </div>
              <Link
                href="/feed"
                className="text-xs text-nepal-red hover:underline"
              >
                Open Signals Feed
              </Link>
            </div>

            <div className="space-y-3">
              {strongestIncidents.map((incident) => (
                <div key={incident.id} className="rounded-md border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium leading-tight">
                        {incident.title}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {incident.sourceName} · {formatNepalDateTime(incident.timestamp)}
                      </div>
                    </div>
                    <Badge
                      variant={
                        incident.magnitude >= 6
                          ? "error"
                          : incident.magnitude >= 5
                            ? "stale"
                            : "live"
                      }
                    >
                      M{incident.magnitude.toFixed(1)}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{incident.place}</span>
                    <span>Depth {incident.depthKm.toFixed(1)} km</span>
                    <span>Sig {incident.significance}</span>
                    {incident.alert && <span>Alert {incident.alert}</span>}
                    {incident.tsunami && <span>Tsunami flag</span>}
                  </div>
                  {incident.url && (
                    <a
                      href={incident.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-xs text-nepal-red hover:underline"
                    >
                      Read source
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))}

              {strongestIncidents.length === 0 && (
                <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No earthquake incidents are visible in the current tracking window.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center gap-2">
                <MapPinned className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-display text-base font-semibold">
                  Severity breakdown
                </h2>
              </div>
              {summary && (
                <div className="space-y-2">
                  {[
                    ["Minor", summary.incidentsBySeverity.minor],
                    ["Light", summary.incidentsBySeverity.light],
                    ["Moderate", summary.incidentsBySeverity.moderate],
                    ["Strong+", summary.incidentsBySeverity.strongPlus],
                  ].map(([label, count]) => (
                    <div key={label} className="rounded-md border border-border px-3 py-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{label}</span>
                        <span className="font-mono">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!summary && (
                <div className="text-sm text-muted-foreground">
                  No crisis summary is available yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Siren className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-display text-base font-semibold">
                  Open anomaly queue
                </h2>
              </div>
              {anomalies.slice(0, 5).map((anomaly) => (
                <div key={anomaly.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">{anomaly.type}</div>
                    <Badge variant={anomaly.severity === "critical" ? "error" : "stale"}>
                      {anomaly.severity}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {anomaly.details}
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    {timeAgo(anomaly.timestamp)}
                  </div>
                </div>
              ))}
              {anomalies.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No active anomalies right now.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-3">
              <h2 className="font-display text-base font-semibold">
                Next direct crisis connectors
              </h2>
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="rounded-md border border-border p-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div className="text-sm font-medium">{f.title}</div>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {f.description}
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <Card key={f.title}>
              <CardContent className="p-6 space-y-3">
                <Icon className="h-8 w-8 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-sm font-semibold">
                    {f.title}
                  </h3>
                  <Badge variant="stale" className="text-[9px]">
                    Planned connector
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
