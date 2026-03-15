"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CloudRain,
  AlertTriangle,
  Heart,
  Siren,
  ArrowUpRight,
  MapPinned,
  ChevronDown,
} from "lucide-react";
import {
  fetchAnomalies,
  fetchCrisisIncidents,
  fetchCrisisSummary,
  fetchEarthquakeIncidents,
  fetchFeed,
  fetchFloodAlerts,
} from "@/lib/api";
import { cn, formatNepalDateTime, timeAgo } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const CRISIS_KEYWORDS = [
  // War & conflict
  "war",
  "invasion",
  "frontline",
  "ceasefire",
  "shelling",
  "airstrike",
  "air strike",
  "missile",
  "rocket",
  "drone attack",
  "bombing",
  "clash",
  "attack",
  "armed group",
  "militia",
  "border skirmish",
  "mobilization",
  "siege",
  "conflict",
  "strike",
  "troops",
  // Fuel, oil & energy crises
  "oil shortage",
  "fuel shortage",
  "petrol shortage",
  "diesel shortage",
  "no oil",
  "oil reserve",
  "fuel reserve",
  "energy crisis",
  "fuel crisis",
  "rationing",
  "working from home",
  "work from home",
  "wfh",
  "supply chain",
  "supply shortage",
] as const;

export type CrisisTheater = "nepal" | "region" | "global";

const THEATER_KEYWORDS: Record<CrisisTheater, string[]> = {
  nepal: [
    "nepal",
    "nepali",
    "nepalis",
    "kathmandu",
    "pokhara",
    "mofa nepal",
    "nepal rastra",
    "nepalese",
    "nepal's",
  ],
  region: [
    "india",
    "indian ",
    "pakistan",
    "bangladesh",
    "bhutan",
    "sri lanka",
    "kashmir",
    "south asia",
    "saarc",
    "delhi",
    "mumbai",
  ],
  global: [
    "ukraine",
    "russia",
    "iran",
    "israel",
    "gaza",
    "middle east",
    "gulf region",
    "taiwan",
    "china ",
    "united states",
    "u.s. ",
    "europe",
    "nato",
  ],
};

function inferTheater(text: string): CrisisTheater {
  const h = text.toLowerCase();
  if (THEATER_KEYWORDS.nepal.some((kw) => h.includes(kw))) return "nepal";
  if (THEATER_KEYWORDS.region.some((kw) => h.includes(kw))) return "region";
  if (THEATER_KEYWORDS.global.some((kw) => h.includes(kw))) return "global";
  return "global";
}

type CrisisStrikeTargetId = "iran" | "israel" | "us" | "gulf" | "other";

const STRIKE_TARGETS: { id: CrisisStrikeTargetId; label: string; keywords: string[] }[] = [
  {
    id: "iran",
    label: "Iran",
    keywords: ["iran"],
  },
  {
    id: "israel",
    label: "Israel",
    keywords: ["israel", "idf"],
  },
  {
    id: "us",
    label: "United States",
    keywords: ["united states", "u.s.", "u.s", "us ", "american", "america"],
  },
  {
    id: "gulf",
    label: "Gulf region",
    keywords: ["gulf", "uae", "qatar", "bahrain", "saudi"],
  },
  {
    id: "other",
    label: "Other theaters",
    keywords: [],
  },
];

export type CrisisTab = "seismic" | "flood" | "conflict";

function DisastersContent() {
  const searchParams = useSearchParams();
  const focusSection = searchParams.get("focus");
  const [highlightAnomalies, setHighlightAnomalies] = useState(
    focusSection === "anomalies"
  );
  const [activeTheater, setActiveTheater] = useState<CrisisTheater>("global");
  const [crisisTab, setCrisisTab] = useState<CrisisTab>("seismic");
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
    queryFn: () => fetchAnomalies("operational"),
    refetchInterval: 15_000,
  });

  const { data: crisisFeed } = useQuery({
    queryKey: ["feed", "crisis-context"],
    queryFn: () => fetchFeed(160, 0),
    refetchInterval: 30_000,
  });

  const { data: crisisIncidents = [] } = useQuery({
    queryKey: ["crisis-incidents"],
    queryFn: fetchCrisisIncidents,
    refetchInterval: 30_000,
  });

  const { data: floodData } = useQuery({
    queryKey: ["crisis-flood-alerts"],
    queryFn: () => fetchFloodAlerts(),
    refetchInterval: 60_000,
  });

  const criticalAnomalies = anomalies.filter((anomaly) => anomaly.severity === "critical");
  const strongestIncidents = useMemo(
    () => [...incidents].sort((a, b) => b.magnitude - a.magnitude).slice(0, 8),
    [incidents]
  );
  const hasRecentQuakes = (summary?.last24h ?? incidents.length) > 0;

  const crisisSignals = useMemo(() => {
    const events = crisisFeed?.events ?? [];

    // 1) Filter by crisis keywords
    const filtered = events.filter((event) => {
      const haystack = `${event.title} ${event.body ?? ""} ${event.source ?? ""}`.toLowerCase();
      return CRISIS_KEYWORDS.some((keyword) => haystack.includes(keyword));
    });

    // 2) Sort newest first
    filtered.sort((a, b) => {
      const ta = new Date(a.timestamp).getTime();
      const tb = new Date(b.timestamp).getTime();
      return tb - ta;
    });

    // 3) De‑duplicate by title + source so the same signal
    // from the same outlet doesn't repeat down the card
    const seen = new Set<string>();
    const unique: typeof filtered = [];
    for (const event of filtered) {
      const key = `${event.title}|${event.source ?? ""}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(event);
    }

    return unique;
  }, [crisisFeed]);

  const crisisSignalsWithTheater = useMemo(() => {
    return crisisSignals.map((event) => {
      const haystack = `${event.title} ${event.body ?? ""} ${event.source ?? ""}`;
      const theater = inferTheater(haystack);
      return { event, theater };
    });
  }, [crisisSignals]);

  const theaterCounts = useMemo(() => {
    const counts: Record<CrisisTheater, number> = {
      nepal: 0,
      region: 0,
      global: 0,
    };
    for (const { theater } of crisisSignalsWithTheater) {
      counts[theater] += 1;
    }
    return counts;
  }, [crisisSignalsWithTheater]);

  const filteredCrisisSignals = useMemo(
    () =>
      crisisSignalsWithTheater
        .filter((x) => x.theater === activeTheater)
        .map((x) => x.event),
    [crisisSignalsWithTheater, activeTheater]
  );

  const strikeTally = useMemo(() => {
    type StrikeBucket = { label: string; total: number; intercepted: number };
    const buckets = new Map<CrisisStrikeTargetId, StrikeBucket>();

    const ensureBucket = (id: CrisisStrikeTargetId) => {
      if (!buckets.has(id)) {
        const meta = STRIKE_TARGETS.find((t) => t.id === id)!;
        buckets.set(id, { label: meta.label, total: 0, intercepted: 0 });
      }
      return buckets.get(id)!;
    };

    const isStrikeEvent = (text: string) =>
      [
        "strike",
        "strikes",
        "airstrike",
        "air strike",
        "missile attack",
        "rocket attack",
        "drone attack",
        "barrage",
      ].some((kw) => text.includes(kw));

    const isInterceptEvent = (text: string) =>
      [
        "intercepted",
        "intercepts",
        "shot down",
        "downed",
        "foiled",
        "defence system",
        "defense system",
      ].some((kw) => text.includes(kw));

    for (const event of crisisSignals) {
      const haystack = `${event.title} ${event.body ?? ""}`.toLowerCase();
      if (!isStrikeEvent(haystack)) continue;

      let targetId: CrisisStrikeTargetId | null = null;
      for (const target of STRIKE_TARGETS) {
        if (
          target.keywords.length > 0 &&
          target.keywords.some((kw) => haystack.includes(kw))
        ) {
          targetId = target.id;
          break;
        }
      }
      if (!targetId) targetId = "other";

      const bucket = ensureBucket(targetId);
      bucket.total += 1;
      if (isInterceptEvent(haystack)) {
        bucket.intercepted += 1;
      }
    }

    return Array.from(buckets.values()).filter((b) => b.total > 0);
  }, [crisisSignals]);

  useEffect(() => {
    if (focusSection === "anomalies") {
      setHighlightAnomalies(true);
      const timer = setTimeout(() => setHighlightAnomalies(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [focusSection]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Crisis Monitor
        </h1>
        <p className="text-muted-foreground text-sm">
          Seismic feed plus conflict and anomaly watch for operational monitoring
        </p>
      </div>

      <Tabs value={crisisTab} onValueChange={(v) => setCrisisTab(v as CrisisTab)}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="seismic">Seismic</TabsTrigger>
          <TabsTrigger value="flood">Flood / Landslide</TabsTrigger>
          <TabsTrigger value="conflict">Conflict / Protest</TabsTrigger>
        </TabsList>

        <TabsContent value="seismic" className="space-y-4 mt-4">
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
              <div className="flex items-center gap-3">
                <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-background/40">
                  {hasRecentQuakes && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-error/30" />
                  )}
                  <Activity
                    className={cn(
                      "h-4 w-4 text-muted-foreground",
                      hasRecentQuakes && "text-status-error"
                    )}
                  />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold">
                    Earthquake watchlist
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Live seismic incidents inside the Nepal watch box
                  </p>
                </div>
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

          <Card
            id="anomalies"
            className={cn(
              highlightAnomalies &&
                "border-status-error/70 shadow-[0_0_0_1px_rgba(220,20,60,0.4)] animate-health-dot"
            )}
          >
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Siren className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-display text-base font-semibold">
                  Open anomaly queue
                </h2>
              </div>
              <AnomalyQueue anomalies={anomalies} />
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
        </TabsContent>

        <TabsContent value="flood" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <CloudRain className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-display text-base font-semibold">Flood & Landslide</h2>
              </div>
              {floodData?.alertsSource === "gdacs" && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                  Showing GDACS regional data. Station-level DHM data pending access approval.
                </div>
              )}
              {floodData?.seasonInactive && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                  Monsoon monitoring active June–Sept. Showing last recorded bulletin.
                </div>
              )}
              {floodData && (
                <>
                  {floodData.alerts.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <Badge className="border-emerald-500/20 bg-emerald-500/8 text-emerald-400">
                        {floodData.alerts.filter((a) => a.status === "normal").length} normal
                      </Badge>
                      <Badge className="border-amber-500/20 bg-amber-500/8 text-amber-400">
                        {floodData.alerts.filter((a) => a.status === "warning").length} warning
                      </Badge>
                      <Badge className="border-red-500/20 bg-red-500/8 text-red-400">
                        {floodData.alerts.filter((a) => a.status === "danger" || a.status === "extreme_danger").length} danger
                      </Badge>
                    </div>
                  )}
                  {floodData.alerts.length > 0 && (
                  <ul className="space-y-3">
                    {[...floodData.alerts]
                      .sort((a, b) => {
                        const order: Record<string, number> = {
                          extreme_danger: 4,
                          danger: 3,
                          warning: 2,
                          normal: 1,
                        };
                        return (order[b.status] ?? 0) - (order[a.status] ?? 0);
                      })
                      .map((station) => (
                        <li key={station.id} className="rounded-md border border-border p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <span className="font-medium">{station.stationName}</span>
                              <span className="text-muted-foreground text-sm ml-2">
                                {station.river}
                                {station.district ? ` · ${station.district}` : ""}
                              </span>
                            </div>
                            <Badge
                              className={cn(
                                station.status === "normal" && "border-emerald-500/20 bg-emerald-500/8 text-emerald-400",
                                station.status === "warning" && "border-amber-500/20 bg-amber-500/8 text-amber-400",
                                station.status === "danger" && "border-red-500/20 bg-red-500/8 text-red-400",
                                station.status === "extreme_danger" && "border-red-500/20 bg-red-500/8 text-red-400 animate-pulse"
                              )}
                            >
                              {station.status.replace("_", " ")}
                            </Badge>
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Level: {station.waterLevel.toFixed(2)} m</span>
                            <span>Danger: {station.dangerLevel.toFixed(2)} m</span>
                          </div>
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-red-500/80"
                              style={{
                                width: `${Math.min(100, (station.waterLevel / station.dangerLevel) * 100)}%`,
                              }}
                            />
                          </div>
                        </li>
                      ))}
                  </ul>
                  )}
                  {floodData.alerts.length === 0 && (
                    <p className="text-sm text-muted-foreground">No station data in current bulletin.</p>
                  )}
                  {floodData.lastUpdated && (
                    <p className="text-[11px] text-muted-foreground">
                      Last updated {formatNepalDateTime(floodData.lastUpdated)}
                    </p>
                  )}
                </>
              )}
              {!floodData && (
                <p className="text-sm text-muted-foreground">
                  No flood station data yet. DHM bulletin or GDACS regional fallback is checked every 3 hours.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conflict" className="space-y-4 mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Signal theater:</span>
            {(["nepal", "region", "global"] as const).map((theater) => (
              <button
                key={theater}
                type="button"
                onClick={() => setActiveTheater(theater)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                  activeTheater === theater
                    ? "border-border bg-muted text-foreground"
                    : "border-border/50 bg-transparent text-muted-foreground hover:bg-muted/50"
                )}
              >
                {theater === "nepal" ? "Nepal" : theater === "region" ? "Region" : "Global"}
                <span className="ml-1.5 font-mono text-[10px] opacity-80">
                  ({theaterCounts[theater]})
                </span>
              </button>
            ))}
          </div>
          <Card>
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Siren className="h-4 w-4 text-muted-foreground" />
                <div>
                  <h2 className="font-display text-base font-semibold">
                    Conflict & crisis signals
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    War, fuel/oil shortages, supply-chain and high-impact crisis news
                    {activeTheater !== "global" && ` · ${activeTheater === "nepal" ? "Nepal" : "Region"} only`}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {filteredCrisisSignals.slice(0, 8).map((event) => (
                  <div
                    key={event.id}
                    className="rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium leading-tight">{event.title}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {event.source ?? "Unknown source"} · {timeAgo(event.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredCrisisSignals.length === 0 && (
                  <div className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">
                    {crisisSignals.length === 0
                      ? "No conflict-tagged headlines in the current feed window."
                      : `No ${activeTheater === "nepal" ? "Nepal" : activeTheater === "region" ? "Region" : "Global"}-tagged crisis signals in this window.`}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center gap-2">
                <MapPinned className="h-4 w-4 text-muted-foreground" />
                <div>
                  <h2 className="font-display text-base font-semibold">
                    Strike & defence balance
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Reported strikes vs intercepted/defeated per theater (from signals feed)
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {strikeTally.map((bucket) => (
                  <div
                    key={bucket.label}
                    className="rounded-md border border-border px-3 py-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{bucket.label}</span>
                      <span className="font-mono">
                        {bucket.intercepted}/{bucket.total} intercepted
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {bucket.intercepted === 0
                        ? "No intercepts mentioned in current window."
                        : "Intercepts inferred from language like 'shot down' or 'intercepted'."}
                    </div>
                  </div>
                ))}
                {strikeTally.length === 0 && (
                  <div className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">
                    No strike/defence balance can be inferred from the current signal window.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* planned connector grid removed to keep layout tighter; details now live in the \"Next direct crisis connectors\" card */}
    </div>
  );
}

export default function DisastersPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">Loading…</div>}>
      <DisastersContent />
    </Suspense>
  );
}

function AnomalyQueue({ anomalies }: { anomalies: Awaited<ReturnType<typeof fetchAnomalies>> }) {
  const [page, setPage] = useState(0);
  const pageSize = 5;

  const sorted = useMemo(
    () =>
      [...anomalies].sort((a, b) => {
        const ta = new Date(a.timestamp).getTime();
        const tb = new Date(b.timestamp).getTime();
        if (tb !== ta) return tb - ta;
        const order: Record<string, number> = { critical: 3, warning: 2, info: 1 };
        const sa = order[a.severity] ?? 0;
        const sb = order[b.severity] ?? 0;
        return sb - sa;
      }),
    [anomalies]
  );

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * pageSize;
  const pageItems = sorted.slice(start, start + pageSize);

  if (sorted.length === 0) {
    return <div className="text-sm text-muted-foreground">No active anomalies right now.</div>;
  }

  return (
    <>
      <div className="space-y-2">
        {pageItems.map((anomaly) => (
          <div key={anomaly.id} className="rounded-md border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">{anomaly.type}</div>
              <Badge variant={anomaly.severity === "critical" ? "error" : "stale"}>
                {anomaly.severity}
              </Badge>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{anomaly.details}</div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              {timeAgo(anomaly.timestamp)}
            </div>
          </div>
        ))}
      </div>
      {sorted.length > pageSize && (
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="h-6 w-6 rounded border border-border text-xs text-muted-foreground disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
          >
            ←
          </button>
          <span className="text-[11px] text-muted-foreground">
            {safePage + 1}/{pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={safePage >= pageCount - 1}
            className="h-6 w-6 rounded border border-border text-xs text-muted-foreground disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
          >
            →
          </button>
        </div>
      )}
    </>
  );
}
