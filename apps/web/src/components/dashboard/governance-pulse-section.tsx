"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn, timeAgo } from "@/lib/utils";
import {
  RailPanelHeader,
  railShell,
  railListBody,
  railCardInset,
} from "@/components/layout/intel-rail";
import {
  fetchPoliticalPulseEvents,
  fetchPoliticalPulseParties,
  fetchPoliticalPulseBills,
  fetchPoliticalPulseStats,
  fetchPoliticalPulseWeeklyDigest,
  fetchCabinetWatch,
} from "@/lib/api";
import { HOR_MAJORITY_THRESHOLD, type CabinetMinisterWatch, type PoliticalPulseEvent } from "@repo/shared";
import { MinisterProfileView } from "@/components/dashboard/minister-profile-view";
import { HeroStoryCard } from "@/components/dashboard/hero-story-card";

const STAGES = [
  { key: "registered", label: "REGISTERED", sub: "HoR synced" },
  { key: "committee", label: "COMMITTEE", sub: "In review" },
  { key: "passed_hor", label: "PASSED HoR", sub: "Lower house" },
  { key: "passed_na", label: "PASSED NA", sub: "Upper house" },
  { key: "enacted", label: "ENACTED", sub: "In gazette" },
] as const;

const TYPE_OPTIONS = ["all", "bills", "cabinet", "laws", "news"] as const;
const RANGE_OPTIONS = ["today", "week", "month", "all"] as const;

const PARTY_TOP_ACCENTS: Record<string, string> = {
  "party-rsp": "#3b82f6",
  "party-nc": "#ef4444",
  "party-uml": "#ef4444",
  "party-ncp": "#dc2626",
  "party-ssp": "#f97316",
  "party-rpp": "#a855f7",
  "party-ind": "#6b7280",
};

function eventLeftBorderColor(ev: PoliticalPulseEvent): string {
  const t = ev.eventType;
  if (t === "appointment") return "#3b82f6";
  if (t === "bill_registered" || t === "bill_passed") return "#8b5cf6";
  if (t === "law_enacted") return "#22c55e";
  if (t === "cabinet_decision") return "#f59e0b";
  return "#374151";
}

function eventLabel(ev: PoliticalPulseEvent): string {
  return ev.eventType.replace(/_/g, " ").toUpperCase();
}

type MinisterVisual = { icon: string; bg: string; fg: string };

function ministerVisual(row: CabinetMinisterWatch): MinisterVisual {
  const id = row.mp.id;
  const m = row.ministryLabel.toLowerCase();
  const map: Record<string, MinisterVisual> = {
    "mp-rsp-balen": { icon: "🏛", bg: "#1a1200", fg: "#f59e0b" },
    "mp-rsp-wagle": { icon: "₨", bg: "#0d1a0d", fg: "#4ade80" },
    "mp-rsp-khanal": { icon: "🌐", bg: "#0d1220", fg: "#60a5fa" },
    "mp-rsp-gautam": { icon: "⚖", bg: "#1a0d1a", fg: "#c084fc" },
    "mp-rsp-shrestha": { icon: "⚡", bg: "#1a1000", fg: "#fb923c" },
    "mp-rsp-chaudhary": { icon: "🌿", bg: "#0d1a0d", fg: "#86efac" },
    "mp-rsp-pokharel": { icon: "📚", bg: "#0d1220", fg: "#7dd3fc" },
    "mp-rsp-mehata": { icon: "✚", bg: "#1a0d0d", fg: "#fca5a5" },
    "mp-rsp-lamsal": { icon: "🏗", bg: "#1a1200", fg: "#fde68a" },
    "mp-rsp-badi": { icon: "♀", bg: "#1a0d12", fg: "#f9a8d4" },
    "mp-rsp-paudel": { icon: "✈", bg: "#0a1a18", fg: "#5eead4" },
    "mp-rsp-rawal": { icon: "🗺", bg: "#0f0f1a", fg: "#a5b4fc" },
  };
  if (map[id]) return map[id];
  if (m.includes("prime") || m.includes("defence") || m.includes("industry"))
    return { icon: "🏛", bg: "#1a1200", fg: "#f59e0b" };
  if (m.includes("finance")) return { icon: "₨", bg: "#0d1a0d", fg: "#4ade80" };
  if (m.includes("foreign")) return { icon: "🌐", bg: "#0d1220", fg: "#60a5fa" };
  return { icon: "◆", bg: "#1a1d27", fg: "#888" };
}

function isPrimeMinisterRow(row: CabinetMinisterWatch): boolean {
  return (
    row.mp.id === "mp-rsp-balen" ||
    row.ministryLabel.toLowerCase().includes("prime minister")
  );
}

function StatCardsRow(props: {
  cabinetDecisionsThisWeek: number;
  lastCabinetSummary: string | null;
  billsRegistered: number;
  billsSyncedTotal: number;
  governingParty: { shortName: string; seats: number } | null;
}) {
  const { cabinetDecisionsThisWeek, lastCabinetSummary, billsRegistered, billsSyncedTotal, governingParty } =
    props;
  const seats = governingParty?.seats ?? 0;
  const pct = Math.min(100, (seats / 275) * 100);
  const overMajority = seats >= HOR_MAJORITY_THRESHOLD;

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
      <div className="flex min-h-[100px] flex-col justify-between rounded-2xl border border-white/[0.06] bg-surface-card px-[18px] py-4 shadow-pulse-card-sm">
        <div>
          <div className="mb-2 flex items-center gap-[5px] font-sans text-[10px] uppercase tracking-[0.09em] text-content-muted">
            <span className="stat-dot h-1.5 w-1.5 shrink-0 rounded-full bg-[#f59e0b]" aria-hidden />
            CABINET ACTIVITY
          </div>
          <div className="font-sans text-[36px] font-semibold leading-none tracking-[-0.02em] text-content-primary">
            {cabinetDecisionsThisWeek}
          </div>
        </div>
        <p className="mt-2 line-clamp-2 font-sans text-[11px] leading-[1.5] text-slate-400">
          {lastCabinetSummary ?? "No cabinet decisions indexed this week."}
        </p>
      </div>
      <div className="flex min-h-[100px] flex-col justify-between rounded-2xl border border-white/[0.06] bg-surface-card px-[18px] py-4 shadow-pulse-card-sm">
        <div>
          <div className="mb-2 flex items-center gap-[5px] font-sans text-[10px] uppercase tracking-[0.09em] text-content-muted">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#3b82f6]" aria-hidden />
            PARLIAMENTARY SESSION
          </div>
          <div className="font-sans text-[36px] font-semibold leading-none tracking-[-0.02em] text-content-primary">
            {billsRegistered}
          </div>
        </div>
        <p className="mt-2 font-sans text-[11px] leading-[1.5] text-slate-400">
          {billsSyncedTotal} rows · HoR scraper sync
        </p>
      </div>
      <div className="flex min-h-[100px] flex-col rounded-2xl border border-white/[0.06] bg-surface-card px-[18px] py-4 shadow-pulse-card-sm">
        <div className="mb-2 flex items-center gap-[5px] font-sans text-[10px] uppercase tracking-[0.09em] text-content-muted">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" aria-hidden />
          COALITION HEALTH
        </div>
        <div className="font-sans text-[36px] font-semibold leading-none tracking-[-0.02em] text-content-primary">
          {seats}
        </div>
        <p className="mt-1 font-sans text-[13px] text-content-secondary">
          of 275 seats · {governingParty?.shortName ?? "—"} majority
        </p>
        <div className="my-2.5 h-1 w-full overflow-hidden rounded-sm bg-surface-border">
          <div className="h-full rounded-sm bg-[#4ade80]" style={{ width: `${pct}%` }} />
        </div>
        <p className="font-sans text-[11px] leading-[1.5] text-slate-400">
          Threshold {HOR_MAJORITY_THRESHOLD} · {overMajority ? "Over majority" : "Under majority"}
        </p>
      </div>
    </div>
  );
}

function CabinetWatchPanel(props: {
  rows: CabinetMinisterWatch[];
  weekly: { content: string; periodStart: string; periodEnd: string } | null;
  selectedMinister: string | null;
  onSelectMinister: (id: string | null) => void;
}) {
  const { rows, weekly, selectedMinister, onSelectMinister } = props;
  const pm = rows.filter(isPrimeMinisterRow);
  const ministers = rows.filter((r) => !isPrimeMinisterRow(r));

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface-panel">
      <div className="shrink-0 border-b border-white/[0.06] px-4 pb-3 pt-3.5">
        <div className="flex items-center gap-2">
          <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-[#f59e0b]" aria-hidden />
          <span className="font-sans text-xs font-semibold tracking-tight text-white">Cabinet watch</span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-4 pb-1 pt-3 font-sans text-[9px] uppercase tracking-[0.12em] text-slate-500">
          Prime minister
        </div>
        {pm.map((row) => (
          <MinisterRow
            key={row.mp.id}
            row={row}
            selected={selectedMinister === row.mp.id}
            onToggle={() =>
              onSelectMinister(selectedMinister === row.mp.id ? null : row.mp.id)
            }
          />
        ))}
        <div className="px-4 pb-1 pt-2 font-sans text-[9px] uppercase tracking-[0.12em] text-slate-500">
          Ministers
        </div>
        {ministers.map((row) => (
          <MinisterRow
            key={row.mp.id}
            row={row}
            selected={selectedMinister === row.mp.id}
            onToggle={() =>
              onSelectMinister(selectedMinister === row.mp.id ? null : row.mp.id)
            }
          />
        ))}
        <div className="mt-2 px-4 pb-1 pt-3 font-sans text-[9px] uppercase tracking-[0.12em] text-slate-500">
          This week in parliament
        </div>
        <div className="px-4 pb-5 pt-2">
          {weekly ? (
            <p className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-400">
              {weekly.content}
            </p>
          ) : (
            <p className="font-sans text-xs leading-relaxed text-slate-500">
              Weekly digest appears after the Monday worker run (requires ANTHROPIC_API_KEY on worker).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MinisterRow(props: {
  row: CabinetMinisterWatch;
  selected: boolean;
  onToggle: () => void;
}) {
  const { row, selected, onToggle } = props;
  const v = ministerVisual(row);
  const active = true;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      className={cn(
        "minister-row flex cursor-pointer items-center gap-2.5 border-b border-[0.5px] border-surface-subtle py-2.5 transition-colors hover:bg-surface-subtle",
        selected ? "border-l-2 border-l-[#f59e0b] bg-surface-card pl-3 pr-3.5" : "px-3.5"
      )}
    >
      <div
        className="minister-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[14px] leading-none"
        style={{ backgroundColor: v.bg, color: v.fg }}
      >
        {v.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="minister-name truncate font-sans text-[13px] font-medium leading-tight text-slate-200">
          {row.mp.name}
        </p>
        <p className="minister-ministry mt-px truncate font-sans text-[10px] text-content-muted">{row.ministryLabel}</p>
      </div>
      <span
        className="h-[5px] w-[5px] shrink-0 rounded-full"
        style={{ backgroundColor: active ? "#22c55e" : "#1e1e1e" }}
        aria-hidden
      />
    </div>
  );
}

export type GovernancePulseSectionProps = {
  selectedMinister: string | null;
  onSelectMinister: (id: string | null) => void;
};

export function GovernancePulseSection({ selectedMinister, onSelectMinister }: GovernancePulseSectionProps) {
  const [category, setCategory] = useState<string>("all");
  const [partyId, setPartyId] = useState<string>("");
  const [range, setRange] = useState<"today" | "week" | "month" | "all">("week");
  const [q, setQ] = useState("");

  const [feedClock, setFeedClock] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFeedClock((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const weekStartIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  }, []);

  const rangeDates = useMemo(() => {
    const end = new Date();
    const start = new Date();
    if (range === "today") start.setHours(0, 0, 0, 0);
    if (range === "week") start.setDate(start.getDate() - 7);
    if (range === "month") start.setMonth(start.getMonth() - 1);
    if (range === "all") return { from: undefined as string | undefined, to: undefined as string | undefined };
    return {
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
    };
  }, [range]);

  const { data: feed, dataUpdatedAt } = useQuery({
    queryKey: ["political-pulse-events", category, partyId, rangeDates, q],
    queryFn: () =>
      fetchPoliticalPulseEvents({
        category: category === "all" ? undefined : category,
        partyId: partyId || undefined,
        from: rangeDates.from,
        to: rangeDates.to,
        q: q.trim() || undefined,
        limit: 30,
        page: 1,
      }),
    refetchInterval: 30_000,
  });

  const { data: cabinetWeekFeed } = useQuery({
    queryKey: ["political-pulse-events-cabinet-week", weekStartIso],
    queryFn: () =>
      fetchPoliticalPulseEvents({
        category: "cabinet",
        from: weekStartIso,
        limit: 200,
        page: 1,
      }),
    refetchInterval: 60_000,
  });

  const { data: parties } = useQuery({
    queryKey: ["political-pulse-parties"],
    queryFn: fetchPoliticalPulseParties,
    refetchInterval: 120_000,
  });

  const { data: billsPayload } = useQuery({
    queryKey: ["political-pulse-bills"],
    queryFn: fetchPoliticalPulseBills,
    refetchInterval: 60_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["political-pulse-stats"],
    queryFn: fetchPoliticalPulseStats,
    refetchInterval: 60_000,
  });

  const { data: weekly } = useQuery({
    queryKey: ["political-pulse-weekly"],
    queryFn: fetchPoliticalPulseWeeklyDigest,
    refetchInterval: 120_000,
  });

  const { data: cabinet } = useQuery({
    queryKey: ["political-pulse-cabinet"],
    queryFn: fetchCabinetWatch,
    refetchInterval: 120_000,
  });

  const counts = billsPayload?.countsByStatus ?? {};
  const regCount = counts["registered"] ?? 0;

  const cabinetThisWeek = cabinetWeekFeed?.events?.length ?? 0;
  const lastCabinetTitle = useMemo(() => {
    const evs = cabinetWeekFeed?.events ?? [];
    if (evs.length === 0) return null;
    const sorted = [...evs].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
    const t = sorted[0]?.title ?? "";
    return t.length > 90 ? `${t.slice(0, 87)}…` : t;
  }, [cabinetWeekFeed?.events]);

  const governingParty = useMemo(() => {
    const g = (parties ?? []).find((p) => p.isGoverning);
    if (!g) return null;
    return { shortName: g.shortName, seats: g.totalSeats };
  }, [parties]);

  const secondsAgo = useMemo(() => {
    void feedClock;
    if (!dataUpdatedAt) return 0;
    return Math.max(0, Math.floor((Date.now() - dataUpdatedAt) / 1000));
  }, [dataUpdatedAt, feedClock]);

  const selectedRow = useMemo(
    () => (cabinet ?? []).find((r) => r.mp.id === selectedMinister),
    [cabinet, selectedMinister]
  );

  const feedEventsList = feed?.events;
  const heroEvent = useMemo(() => {
    const list = feedEventsList ?? [];
    const high = list.filter((e) => e.importanceScore >= 8);
    if (high.length === 0) return null;
    return [...high].sort((a, b) => {
      if (b.importanceScore !== a.importanceScore) return b.importanceScore - a.importanceScore;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    })[0]!;
  }, [feedEventsList]);

  const gridEvents = useMemo(() => {
    const list = feedEventsList ?? [];
    if (!heroEvent) return list;
    return list.filter((e) => e.id !== heroEvent.id);
  }, [feedEventsList, heroEvent]);

  const feedEvents = feedEventsList ?? [];

  return (
    <div
      className={cn(
        "grid min-h-0 w-full max-w-full grid-cols-1 gap-0 md:h-[calc(100vh-6rem)] md:grid-cols-[1fr_280px]",
        "md:overflow-hidden"
      )}
    >
      <div className="flex min-h-0 min-w-0 flex-col gap-6 overflow-y-auto py-4 pl-4 pr-4 md:pr-2 md:pl-6 md:py-6">
        {selectedMinister && selectedRow ? (
          <MinisterProfileView
            ministerId={selectedMinister}
            ministerRow={selectedRow}
            onClose={() => onSelectMinister(null)}
          />
        ) : selectedMinister ? (
          <p className="font-sans text-sm text-slate-500">Loading minister…</p>
        ) : (
          <>
            <StatCardsRow
              cabinetDecisionsThisWeek={cabinetThisWeek}
              lastCabinetSummary={lastCabinetTitle}
              billsRegistered={regCount}
              billsSyncedTotal={billsPayload?.bills?.length ?? 0}
              governingParty={governingParty}
            />

            <div className={railShell}>
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden />
                  <span className="sec-label font-sans text-xs font-semibold tracking-tight text-white">
                    Governance pulse
                  </span>
                </div>
                <span className="font-sans text-[10px] text-slate-500">
                  Last updated {secondsAgo}s · polling 30s
                </span>
              </div>
              <div className={cn(railListBody, "rounded-b-xl")}>
                <div className={cn(railCardInset, "space-y-3 px-4 py-4")}>
                  <div
                    className="mb-2 flex flex-wrap items-center gap-[5px] rounded-lg border-[0.5px] border-surface-border bg-surface-subtle px-2 py-[5px]"
                  >
                    <span className="font-sans text-[9px] uppercase tracking-[0.06em] text-content-muted">TYPE</span>
                    {TYPE_OPTIONS.map((t) => (
                      <span
                        key={t}
                        role="button"
                        tabIndex={0}
                        onClick={() => setCategory(t)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setCategory(t);
                          }
                        }}
                        className={cn(
                          "cursor-pointer rounded border border-[#2e3347] px-[7px] py-0.5 font-sans text-[10px] uppercase tracking-[0.04em] text-content-label",
                          category === t && "border-[#2e3347] bg-surface-border text-slate-200"
                        )}
                      >
                        {t}
                      </span>
                    ))}
                    <div className="mx-[3px] h-3 w-px shrink-0 bg-surface-border" />
                    <span className="font-sans text-[9px] uppercase tracking-[0.06em] text-content-muted">PARTY</span>
                    <select
                      value={partyId || "ALL"}
                      onChange={(e) => setPartyId(e.target.value === "ALL" ? "" : e.target.value)}
                      className="rounded border border-[#2e3347] bg-transparent px-1 py-0.5 font-sans text-[10px] text-slate-300 outline-none"
                    >
                      <option value="ALL">ALL</option>
                      {(parties ?? []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.shortName}
                        </option>
                      ))}
                    </select>
                    <div className="mx-[3px] h-3 w-px shrink-0 bg-surface-border" />
                    <span className="font-sans text-[9px] uppercase tracking-[0.06em] text-content-muted">RANGE</span>
                    {RANGE_OPTIONS.map((r) => (
                      <span
                        key={r}
                        role="button"
                        tabIndex={0}
                        onClick={() => setRange(r)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setRange(r);
                          }
                        }}
                        className={cn(
                          "cursor-pointer rounded border border-[#2e3347] px-[7px] py-0.5 font-sans text-[10px] uppercase tracking-[0.04em] text-content-label",
                          range === r && "border-[#2e3347] bg-surface-border text-slate-200"
                        )}
                      >
                        {r}
                      </span>
                    ))}
                    <div className="mx-[3px] h-3 w-px shrink-0 bg-surface-border" />
                    <input
                      type="search"
                      placeholder="Search…"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      className="min-w-[80px] flex-1 border-none bg-transparent font-sans text-[10px] text-slate-300 outline-none placeholder:text-content-muted"
                    />
                  </div>

                  {feedEvents.length === 0 ? (
                    <p className="col-span-full rounded-2xl border border-dashed border-white/[0.08] bg-surface-subtle/50 px-4 py-8 text-center font-sans text-sm text-slate-500">
                      No events match filters yet.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {heroEvent ? <HeroStoryCard event={heroEvent} /> : null}
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                        {gridEvents.map((ev) => (
                          <article
                            key={ev.id}
                            className="feed-card group relative flex min-h-[110px] cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-surface-card shadow-pulse-card-sm transition-colors duration-150 hover:bg-[#232836]"
                          >
                            <div
                              className="absolute left-0 top-[6%] bottom-[6%] w-[2px]"
                              style={{ backgroundColor: eventLeftBorderColor(ev) }}
                              aria-hidden
                            />
                            <div className="relative flex min-h-[110px] flex-1 flex-col px-4 py-3.5 pl-[18px]">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="rounded bg-surface-border px-1.5 py-px font-sans text-[9px] uppercase tracking-[0.08em] text-content-label">
                                  {eventLabel(ev)}
                                </span>
                                {ev.partyIds.slice(0, 2).map((pid) => (
                                  <span
                                    key={pid}
                                    className="rounded border border-[#1a3a1a] bg-[#0d1f0d] px-1.5 py-px font-sans text-[9px] uppercase tracking-[0.08em] text-[#4ade80]"
                                  >
                                    {pid.replace("party-", "")}
                                  </span>
                                ))}
                                {ev.importanceScore >= 8 ? (
                                  <span className="rounded border border-[#2a1e00] bg-[#1f1500] px-1.5 py-px font-sans text-[9px] uppercase tracking-[0.08em] text-[#fbbf24]">
                                    PRIORITY
                                  </span>
                                ) : null}
                              </div>
                              <h3 className="card-title mt-2 line-clamp-2 font-sans text-[15px] font-semibold leading-snug tracking-tight text-white">
                                {ev.title}
                              </h3>
                              {ev.summary ? (
                                <p className="card-body mt-1.5 line-clamp-2 font-sans text-[13px] leading-relaxed text-slate-400">
                                  {ev.summary}
                                </p>
                              ) : null}
                              <div className="card-footer mt-auto flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2.5 font-sans text-[10px] text-slate-500">
                                <span className="card-source truncate">{ev.sourceName ?? "—"}</span>
                                <span className="card-time shrink-0">{timeAgo(ev.publishedAt)}</span>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={railShell}>
              <RailPanelHeader
                title="Legislative tracker"
                leadingDotClass="bg-sky-500"
                titleClassName="text-[11px] text-content-label"
              />
              <div className={cn(railListBody, "rounded-b-xl")}>
                <div className={cn(railCardInset, "px-2 py-2")}>
                  <div className="grid grid-cols-2 gap-1.5 md:grid-cols-5">
                    {STAGES.map((s) => {
                      const n = counts[s.key] ?? 0;
                      const isActive = s.key === "registered" && n > 0;
                      return (
                        <div
                          key={s.key}
                          className="tracker-cell cursor-pointer rounded-2xl border border-white/[0.06] bg-surface-card px-2.5 py-3.5 text-center shadow-pulse-card-sm transition-colors duration-150 hover:bg-[#232836]"
                        >
                          <p className="tracker-label mb-2 font-sans text-[9px] uppercase tracking-[0.1em] text-content-muted">
                            {s.label}
                          </p>
                          <p
                            className={cn(
                              "tracker-number font-sans text-[28px] font-semibold leading-none tracking-[-0.02em] text-content-muted",
                              isActive && "text-[#a78bfa]"
                            )}
                          >
                            {n}
                          </p>
                          <p className="tracker-sub mt-1.5 font-sans text-[10px] text-content-muted">{s.sub}</p>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-2 px-1 font-sans text-[11px] text-slate-500">
                    Bills in pipeline: {billsPayload?.bills?.length ?? 0} rows synced from HoR scraper.
                  </p>
                </div>
              </div>
            </div>

            <div className={railShell}>
              <RailPanelHeader
                title="Party snapshot"
                leadingDotClass="bg-fuchsia-500"
                titleClassName="text-[11px] text-content-label"
              />
              <div className={cn(railListBody, "rounded-b-xl")}>
                <div className={cn(railCardInset, "grid grid-cols-2 gap-1.5 px-2 py-2 md:grid-cols-4")}>
                  {(parties ?? []).map((p) => (
                    <div
                      key={p.id}
                      className="party-card cursor-pointer rounded-2xl border border-white/[0.06] bg-surface-card px-3.5 pb-3 pt-3.5 shadow-pulse-card-sm transition-colors duration-150 hover:bg-[#232836]"
                      style={{
                        borderTopWidth: 2,
                        borderTopColor: PARTY_TOP_ACCENTS[p.id] ?? p.colorHex ?? "#666",
                        borderLeft: "none",
                      }}
                    >
                      <p className="party-abbr mb-1.5 font-sans text-[10px] uppercase tracking-[0.12em] text-content-label">
                        {p.shortName}
                      </p>
                      <p className="party-seats font-sans text-[32px] font-bold leading-none tracking-[-0.02em] text-content-primary">
                        {p.totalSeats}
                      </p>
                      <p className="party-detail mt-1.5 font-sans text-[10px] text-content-muted">
                        FPTP {p.fptpSeats} · PR {p.prSeats}
                      </p>
                      {p.isGoverning ? (
                        <span className="governing-badge mt-1.5 inline-flex items-center rounded border-[0.5px] border-[#166534] bg-[#052e16] px-[7px] py-0.5 font-sans text-[9px] uppercase tracking-[0.05em] text-[#4ade80]">
                          Governing
                        </span>
                      ) : null}
                    </div>
                  ))}
                  <div className="flex flex-col justify-center rounded-2xl border border-white/[0.06] bg-surface-card px-3.5 py-3 opacity-40 shadow-pulse-card-sm">
                    <p className="font-sans text-[8px] uppercase tracking-[0.1em] text-content-muted">PULSE STATS</p>
                    <p className="mt-1 font-sans text-[9px] text-content-muted">
                      Bills: {stats?.totalBillsTracked ?? 0}
                    </p>
                    <p className="font-sans text-[9px] text-content-muted">
                      Laws: {stats?.lawsEnacted ?? 0} · Cabinet: {stats?.cabinetDecisions ?? 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex min-h-[320px] min-w-0 flex-col border-t border-surface-divider bg-surface-panel md:min-h-0 md:border-l md:border-t-0 md:overflow-y-auto">
        <CabinetWatchPanel
          rows={cabinet ?? []}
          weekly={
            weekly
              ? { content: weekly.content, periodStart: weekly.periodStart, periodEnd: weekly.periodEnd }
              : null
          }
          selectedMinister={selectedMinister}
          onSelectMinister={onSelectMinister}
        />
      </div>
    </div>
  );
}
