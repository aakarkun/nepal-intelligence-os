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
} from "@/components/icons";
import {
  fetchAnomalies,
  fetchCrisisIncidents,
  fetchCrisisSummary,
  fetchEarthquakeIncidents,
  fetchFeed,
  fetchFloodAlerts,
} from "@/lib/api";
import { discoverShellClass } from "@/components/discover/discover-rail-tokens";
import { FlatRailPanelHeader } from "@/components/layout/intel-rail";
import { cn, formatNepalDateTime, timeAgo } from "@/lib/utils";
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

const CRISIS_TABS: { id: CrisisTab; label: string }[] = [
  { id: "seismic", label: "Seismic" },
  { id: "flood", label: "Flood / Landslide" },
  { id: "conflict", label: "Conflict / Protest" },
];

const crisisTabsTrackClass =
  "flex w-full min-w-0 flex-row rounded-full bg-white/[0.06] p-px shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";

const crisisKpiTileClass =
  "rounded-xl border border-white/[0.08] bg-white/[0.05] p-4";

const crisisPanelBody = "min-w-0 px-2 pb-2";

const crisisInsetRow =
  "rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 transition-colors hover:bg-white/[0.05]";

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
    <div className="-mx-4 px-4 pb-10 md:-mx-6 md:px-6 min-h-full bg-transparent text-[#e5e5e5] antialiased">
      <nav className="mt-0 w-full min-w-0" aria-label="Crisis monitor sections">
        <div className={crisisTabsTrackClass}>
          {CRISIS_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setCrisisTab(t.id)}
              className={cn(
                "min-w-0 flex-1 rounded-full px-2 py-1.5 text-center font-sans text-[11px] leading-snug tracking-tight transition-colors duration-150 sm:px-3 sm:py-1.5 sm:text-[12px]",
                crisisTab === t.id
                  ? "bg-white/[0.12] text-white"
                  : "text-[#6b6b6b] hover:text-[#9ca3af]"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {crisisTab === "seismic" && (
        <div className="mt-4 space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div className={crisisKpiTileClass}>
            <div className="font-sans text-[12px] uppercase tracking-wide text-[#888]">
              Earthquakes tracked
            </div>
            <div className="mt-1 font-sans text-2xl font-semibold tabular-nums text-[#e5e5e5]">{summary?.totalIncidents ?? incidents.length}</div>
            <div className="mt-1 font-sans text-[12px] text-[#666]">
              Official USGS incidents inside the Nepal watch box
            </div>
        </div>
        <div className={crisisKpiTileClass}>
            <div className="font-sans text-[12px] uppercase tracking-wide text-[#888]">
              Open anomalies
            </div>
            <div className="mt-1 font-sans text-2xl font-semibold tabular-nums text-[#e5e5e5]">{anomalies.length}</div>
            <div className="mt-1 font-sans text-[12px] text-[#666]">
              Election/data anomalies still unresolved
            </div>
        </div>
        <div className={crisisKpiTileClass}>
            <div className="font-sans text-[12px] uppercase tracking-wide text-[#888]">
              Last 24 hours
            </div>
            <div className="mt-1 font-sans text-2xl font-semibold tabular-nums text-[#e5e5e5]">{summary?.last24h ?? 0}</div>
            <div className="mt-1 font-sans text-[12px] text-[#666]">
              Earthquakes reported in the last 24 hours
            </div>
        </div>
        <div className={crisisKpiTileClass}>
            <div className="font-sans text-[12px] uppercase tracking-wide text-[#888]">
              Maximum magnitude
            </div>
            <div className="mt-1 font-sans text-xl font-semibold tabular-nums text-[#e5e5e5]">
              {summary ? `M${summary.maxMagnitude.toFixed(1)}` : "No hit"}
            </div>
            <div className="mt-1 font-sans text-[12px] text-[#666]">
              Strongest incident in the current tracking window
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <div className={discoverShellClass}>
          <FlatRailPanelHeader
            title="Earthquake watchlist"
            leadingDotClass={hasRecentQuakes ? "bg-rose-500" : "bg-slate-500"}
            right={
              <Link
                href="/feed"
                className="font-sans text-[11px] tracking-tight text-nepal-red/90 hover:text-nepal-red hover:underline"
              >
                Signals feed →
              </Link>
            }
          />
          <div className={crisisPanelBody}>
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-0 pb-2">
              <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
                {hasRecentQuakes && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500/30" />
                )}
                <Activity
                  className={cn(
                    "relative h-4 w-4 text-[#666]",
                    hasRecentQuakes && "text-rose-400"
                  )}
                  aria-hidden
                />
              </div>
              <p className="font-sans text-[12px] text-[#888]">
                Live seismic incidents inside the Nepal watch box
              </p>
            </div>

            <div className="space-y-2 pt-2">
              {strongestIncidents.map((incident) => (
                <div key={incident.id} className={crisisInsetRow}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-sans text-[13px] font-medium leading-snug text-[#ccc]">
                        {incident.title}
                      </div>
                      <div className="mt-1 font-sans text-[12px] text-[#666]">
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
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-sans text-[12px] text-[#666]">
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
                      className="mt-3 inline-flex items-center gap-1 font-sans text-[12px] tracking-tight text-nepal-red/90 hover:text-nepal-red"
                    >
                      Read source
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))}

              {strongestIncidents.length === 0 && (
                <div className="rounded-lg border border-dashed border-white/[0.1] px-3 py-8 text-center font-sans text-[13px] text-[#666]">
                  No earthquake incidents are visible in the current tracking window.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className={discoverShellClass}>
            <FlatRailPanelHeader title="Severity breakdown" leadingDotClass="bg-sky-500" />
            <div className={cn(crisisPanelBody, "space-y-2")}>
              {summary &&
                [
                  ["Minor", summary.incidentsBySeverity.minor],
                  ["Light", summary.incidentsBySeverity.light],
                  ["Moderate", summary.incidentsBySeverity.moderate],
                  ["Strong+", summary.incidentsBySeverity.strongPlus],
                ].map(([label, count]) => (
                  <div key={label} className={crisisInsetRow}>
                    <div className="flex items-center justify-between font-sans text-[13px] text-[#ccc]">
                      <span>{label}</span>
                      <span className="tabular-nums text-[#e5e5e5]">{count}</span>
                    </div>
                  </div>
                ))}
              {!summary && (
                <div className="font-sans text-[13px] text-[#666]">
                  No crisis summary is available yet.
                </div>
              )}
            </div>
          </div>

          <div
            id="anomalies"
            className={cn(
              discoverShellClass,
              highlightAnomalies &&
                "border-rose-500/50 shadow-[0_0_0_1px_rgba(220,20,60,0.35)]"
            )}
          >
            <FlatRailPanelHeader title="Open anomaly queue" leadingDotClass="bg-rose-500" />
            <div className={crisisPanelBody}>
              <AnomalyQueue anomalies={anomalies} />
            </div>
          </div>

          <div className={discoverShellClass}>
            <FlatRailPanelHeader title="Next direct crisis connectors" leadingDotClass="bg-amber-500" />
            <div className={cn(crisisPanelBody, "space-y-2")}>
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className={crisisInsetRow}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0 text-[#888]" aria-hidden />
                      <div className="font-sans text-[13px] font-medium text-[#ccc]">{f.title}</div>
                    </div>
                    <p className="mt-1 font-sans text-[12px] leading-snug text-[#666]">
                      {f.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
        </div>
      )}

      {crisisTab === "flood" && (
        <div className="mt-4 space-y-4">
          <div className={discoverShellClass}>
            <FlatRailPanelHeader title="Flood & Landslide" leadingDotClass="bg-cyan-500" />
            <div className={cn(crisisPanelBody, "space-y-4")}>
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
                        <li key={station.id} className={crisisInsetRow}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <span className="font-sans font-medium text-[#ccc]">{station.stationName}</span>
                              <span className="ml-2 font-sans text-[13px] text-[#666]">
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
                          <div className="mt-2 flex items-center gap-2 font-sans text-[12px] text-[#666]">
                            <span>Level: {station.waterLevel.toFixed(2)} m</span>
                            <span>Danger: {station.dangerLevel.toFixed(2)} m</span>
                          </div>
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
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
                    <p className="font-sans text-[13px] text-[#666]">No station data in current bulletin.</p>
                  )}
                  {floodData.lastUpdated && (
                    <p className="font-sans text-[13px] text-[#666]">
                      Last updated {formatNepalDateTime(floodData.lastUpdated)}
                    </p>
                  )}
                </>
              )}
              {!floodData && (
                <p className="font-sans text-[13px] text-[#666]">
                  No flood station data yet. DHM bulletin or GDACS regional fallback is checked every 3 hours.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {crisisTab === "conflict" && (
        <div className="mt-4 space-y-4">
          <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full bg-white/[0.06] p-px px-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <span className="pl-2 font-sans text-[11px] uppercase tracking-wider text-[#666]">
              Theater
            </span>
            {(["nepal", "region", "global"] as const).map((theater) => (
              <button
                key={theater}
                type="button"
                onClick={() => setActiveTheater(theater)}
                className={cn(
                  "rounded-full px-2.5 py-1 font-sans text-[11px] tracking-tight transition-colors sm:text-[12px]",
                  activeTheater === theater
                    ? "bg-white/[0.12] text-white"
                    : "text-[#6b6b6b] hover:text-[#9ca3af]"
                )}
              >
                {theater === "nepal" ? "Nepal" : theater === "region" ? "Region" : "Global"}
                <span className="ml-1 font-sans tabular-nums opacity-80">({theaterCounts[theater]})</span>
              </button>
            ))}
          </div>
          <div className={discoverShellClass}>
            <FlatRailPanelHeader title="Conflict & crisis signals" leadingDotClass="bg-orange-500" />
            <div className={cn(crisisPanelBody, "space-y-2")}>
              <p className="border-b border-white/[0.06] pb-2 font-sans text-[12px] text-[#888]">
                War, fuel and supply-chain stress, high-impact crisis news
                {activeTheater !== "global" && ` · ${activeTheater === "nepal" ? "Nepal" : "Region"} focus`}
              </p>
              <div className="space-y-2 pt-1">
                {filteredCrisisSignals.slice(0, 8).map((event) => (
                  <div key={event.id} className={cn(crisisInsetRow, "text-[13px]")}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-sans font-medium leading-snug text-[#ccc]">{event.title}</div>
                        <div className="mt-1 font-sans text-[12px] text-[#666]">
                          {event.source ?? "Unknown source"} · {timeAgo(event.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredCrisisSignals.length === 0 && (
                  <div className="rounded-lg border border-dashed border-white/[0.1] p-4 font-sans text-[12px] text-[#666]">
                    {crisisSignals.length === 0
                      ? "No conflict-tagged headlines in the current feed window."
                      : `No ${activeTheater === "nepal" ? "Nepal" : activeTheater === "region" ? "Region" : "Global"}-tagged crisis signals in this window.`}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className={discoverShellClass}>
            <FlatRailPanelHeader title="Strike & defence balance" leadingDotClass="bg-violet-500" />
            <div className={cn(crisisPanelBody, "space-y-2")}>
              <p className="border-b border-white/[0.06] pb-2 font-sans text-[12px] text-[#888]">
                Reported strikes vs intercepted / defeated (from signals feed language)
              </p>
              <div className="space-y-2 pt-1">
                {strikeTally.map((bucket) => (
                  <div key={bucket.label} className={crisisInsetRow}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-sans text-[13px] font-medium text-[#ccc]">{bucket.label}</span>
                      <span className="font-sans text-[12px] tabular-nums text-[#a1a1aa]">
                        {bucket.intercepted}/{bucket.total} intercepted
                      </span>
                    </div>
                    <div className="mt-1 font-sans text-[12px] text-[#666]">
                      {bucket.intercepted === 0
                        ? "No intercepts mentioned in current window."
                        : "Inferred from phrasing such as ‘shot down’ or ‘intercepted’."}
                    </div>
                  </div>
                ))}
                {strikeTally.length === 0 && (
                  <div className="rounded-lg border border-dashed border-white/[0.1] p-4 font-sans text-[12px] text-[#666]">
                    No strike/defence balance can be inferred from the current signal window.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DisastersPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center font-sans text-[#888]">Loading…</div>}>
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
    return <div className="font-sans text-[13px] text-[#666]">No active anomalies right now.</div>;
  }

  return (
    <>
      <div className="space-y-2">
        {pageItems.map((anomaly) => (
          <div key={anomaly.id} className={crisisInsetRow}>
            <div className="flex items-center justify-between gap-2">
              <div className="font-sans text-[13px] font-medium text-[#ccc]">{anomaly.type}</div>
              <Badge variant={anomaly.severity === "critical" ? "error" : "stale"}>
                {anomaly.severity}
              </Badge>
            </div>
            <div className="mt-1 font-sans text-[12px] text-[#666]">{anomaly.details}</div>
            <div className="mt-2 font-sans text-[12px] text-[#888]">{timeAgo(anomaly.timestamp)}</div>
          </div>
        ))}
      </div>
      {sorted.length > pageSize && (
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="flex h-6 w-6 items-center justify-center rounded border border-white/[0.12] font-sans text-xs text-[#888] disabled:cursor-not-allowed disabled:opacity-40"
          >
            ←
          </button>
          <span className="font-sans text-[13px] text-[#666]">
            {safePage + 1}/{pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={safePage >= pageCount - 1}
            className="flex h-6 w-6 items-center justify-center rounded border border-white/[0.12] font-sans text-xs text-[#888] disabled:cursor-not-allowed disabled:opacity-40"
          >
            →
          </button>
        </div>
      )}
    </>
  );
}
