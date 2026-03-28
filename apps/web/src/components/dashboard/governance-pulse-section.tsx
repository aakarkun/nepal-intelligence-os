"use client";

import { useMemo, useState } from "react";
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
import { HOR_MAJORITY_THRESHOLD, type CabinetMinisterWatch } from "@repo/shared";

const STAGES = [
  { key: "registered", label: "REGISTERED", sub: "HoR synced" },
  { key: "committee", label: "COMMITTEE", sub: "In review" },
  { key: "passed_hor", label: "PASSED HoR", sub: "Lower house" },
  { key: "passed_na", label: "PASSED NA", sub: "Upper house" },
  { key: "enacted", label: "ENACTED", sub: "In gazette" },
] as const;

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
  return { icon: "◆", bg: "#141414", fg: "#888" };
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
    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
      <div className="rounded-md border border-[#1e1e1e] bg-[#111] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#f59e0b]" aria-hidden />
          <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#666]">
            CABINET ACTIVITY
          </span>
        </div>
        <p className="mt-1.5 font-mono text-xl font-normal text-[#c0c0b8]">{cabinetDecisionsThisWeek}</p>
        <p className="mt-1 line-clamp-2 font-mono text-[9px] leading-snug text-[#3d3d38]">
          {lastCabinetSummary ?? "No cabinet decisions indexed this week."}
        </p>
      </div>
      <div className="rounded-md border border-[#1e1e1e] bg-[#111] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#3b82f6]" aria-hidden />
          <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#666]">
            PARLIAMENTARY SESSION
          </span>
        </div>
        <p className="mt-1.5 font-mono text-xl font-normal text-[#c0c0b8]">{billsRegistered}</p>
        <p className="mt-1 font-mono text-[9px] text-[#2e2e2e]">
          {billsSyncedTotal} rows · HoR scraper sync
        </p>
      </div>
      <div className="rounded-md border border-[#1e1e1e] bg-[#111] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#4ade80]" aria-hidden />
          <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#666]">
            COALITION HEALTH
          </span>
        </div>
        <p className="mt-1.5 font-mono text-[11px] leading-tight text-[#c0c0b8]">
          {seats} / 275 seats · {governingParty?.shortName ?? "—"} majority
        </p>
        <div className="mt-1.5 h-0.5 w-full overflow-hidden rounded-sm bg-[#1a1a1a]">
          <div className="h-full bg-[#4ade80]" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 font-mono text-[9px] text-[#2e2e2e]">
          Threshold {HOR_MAJORITY_THRESHOLD} · {overMajority ? "Over majority" : "Under majority"}
        </p>
      </div>
    </div>
  );
}

function CabinetWatchPanel(props: {
  rows: CabinetMinisterWatch[];
  weekly: { content: string; periodStart: string; periodEnd: string } | null;
}) {
  const { rows, weekly } = props;
  const pm = rows.filter(isPrimeMinisterRow);
  const ministers = rows.filter((r) => !isPrimeMinisterRow(r));

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0a0a0a]">
      <div className="shrink-0 border-b border-[#1a1a1a] px-3.5 pb-2.5 pt-3">
        <div className="flex items-center gap-2">
          <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-[#f59e0b]" aria-hidden />
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#666]">
            CABINET WATCH
          </span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#2a2a2a] px-3.5 pt-2 pb-1">
          PRIME MINISTER
        </div>
        {pm.map((row) => (
          <MinisterRow key={row.mp.id} row={row} />
        ))}
        <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#2a2a2a] px-3.5 pt-2 pb-1">
          MINISTERS
        </div>
        {ministers.map((row) => (
          <MinisterRow key={row.mp.id} row={row} />
        ))}
        <div className="mt-2 font-mono text-[8px] uppercase tracking-[0.1em] text-[#2a2a2a] px-3.5 pt-2 pb-1">
          THIS WEEK IN PARLIAMENT
        </div>
        <div className="px-3.5 pb-4 pt-2.5">
          {weekly ? (
            <p className="whitespace-pre-wrap font-mono text-[9px] leading-relaxed text-[#2a2a2a]">
              {weekly.content}
            </p>
          ) : (
            <p className="font-mono text-[9px] leading-relaxed text-[#2a2a2a]">
              Weekly digest appears after the Monday worker run (requires ANTHROPIC_API_KEY on worker).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MinisterRow({ row }: { row: CabinetMinisterWatch }) {
  const v = ministerVisual(row);
  const active = true;
  return (
    <div className="flex cursor-pointer items-center gap-2.5 border-b border-[#111] px-3.5 py-2 transition-colors hover:bg-[#111]">
      <div
        className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md text-[13px] leading-none"
        style={{ backgroundColor: v.bg, color: v.fg }}
      >
        {v.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-[10px] text-[#c0c0b8]">{row.mp.name}</p>
        <p className="mt-0.5 truncate font-mono text-[9px] text-[#444]">{row.ministryLabel}</p>
      </div>
      <span
        className="h-[5px] w-[5px] shrink-0 rounded-full"
        style={{ backgroundColor: active ? "#22c55e" : "#1e1e1e" }}
        aria-hidden
      />
    </div>
  );
}

export function GovernancePulseSection() {
  const [category, setCategory] = useState<string>("all");
  const [partyId, setPartyId] = useState<string>("");
  const [range, setRange] = useState<"today" | "week" | "month" | "all">("week");
  const [q, setQ] = useState("");

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

  return (
    <div
      className={cn(
        "grid min-h-0 w-full max-w-full grid-cols-1 gap-0 md:h-[calc(100vh-6rem)] md:grid-cols-[1fr_280px]",
        "md:overflow-hidden"
      )}
    >
      {/* Left column */}
      <div className="flex min-h-0 min-w-0 flex-col gap-4 overflow-y-auto py-4 pl-4 pr-4 md:pr-2 md:pl-6 md:py-4">
        <StatCardsRow
          cabinetDecisionsThisWeek={cabinetThisWeek}
          lastCabinetSummary={lastCabinetTitle}
          billsRegistered={regCount}
          billsSyncedTotal={billsPayload?.bills?.length ?? 0}
          governingParty={governingParty}
        />

        <div className={railShell}>
          <RailPanelHeader title="Governance pulse" leadingDotClass="bg-emerald-500" />
          <div className={cn(railListBody, "rounded-b-xl")}>
            <div className={cn(railCardInset, "space-y-3 px-3 py-3")}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#666]">Type</span>
                {(["all", "bills", "cabinet", "laws", "news"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={cn(
                      "rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-wider",
                      category === c
                        ? "border-sky-500/80 bg-sky-500/10 text-sky-200"
                        : "border-white/10 text-[#888] hover:border-white/20"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#666]">Party</span>
                <select
                  value={partyId}
                  onChange={(e) => setPartyId(e.target.value)}
                  className="rounded-md border border-white/10 bg-[#121212] px-2 py-1 font-mono text-[11px] text-[#ccc]"
                >
                  <option value="">All</option>
                  {(parties ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.shortName}
                    </option>
                  ))}
                </select>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#666]">Range</span>
                {(["today", "week", "month", "all"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className={cn(
                      "rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-wider",
                      range === r
                        ? "border-violet-500/80 bg-violet-500/10 text-violet-200"
                        : "border-white/10 text-[#888] hover:border-white/20"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input
                type="search"
                placeholder="Search title / summary…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-[#121212] px-3 py-2 font-mono text-[12px] text-[#e5e5e5] outline-none placeholder:text-[#555] focus:border-white/20"
              />
              <p className="font-mono text-[10px] text-[#555]">
                Last updated {dataUpdatedAt ? timeAgo(new Date(dataUpdatedAt).toISOString()) : "—"} · polling 30s
              </p>
              <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
                {(feed?.events ?? []).length === 0 ? (
                  <p className="col-span-full font-mono text-[12px] text-[#666]">
                    No events match filters yet.
                  </p>
                ) : (
                  feed!.events.map((ev) => (
                    <article
                      key={ev.id}
                      className="rounded-md border border-[#1e1e1e] bg-[#111] px-3 py-2.5"
                      style={{ borderLeftWidth: 2, borderLeftColor: eventLeftBorderColor(ev) }}
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-sm bg-[#1a1a1a] px-1.5 py-px font-mono text-[8px] uppercase tracking-[0.08em] text-[#555]">
                          {eventLabel(ev)}
                        </span>
                        {ev.partyIds.slice(0, 2).map((pid) => (
                          <span
                            key={pid}
                            className="rounded-sm border border-[#1a3a1a] bg-[#0d1f0d] px-1.5 py-px font-mono text-[8px] uppercase tracking-[0.08em] text-[#4ade80]"
                          >
                            {pid.replace("party-", "")}
                          </span>
                        ))}
                        {ev.importanceScore >= 8 ? (
                          <span className="rounded-sm border border-[#2a1e00] bg-[#1f1500] px-1.5 py-px font-mono text-[8px] uppercase tracking-[0.08em] text-[#fbbf24]">
                            PRIORITY
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-1 line-clamp-2 font-mono text-[11px] leading-snug text-[#c0c0b8]">
                        {ev.title}
                      </h3>
                      {ev.summary ? (
                        <p className="mt-0.5 truncate font-mono text-[10px] text-[#3d3d38]">{ev.summary}</p>
                      ) : null}
                      <div className="mt-1.5 flex items-center justify-between gap-2 font-mono text-[9px] text-[#2e2e2e]">
                        <span className="truncate">{ev.sourceName ?? "—"}</span>
                        <span className="shrink-0">{timeAgo(ev.publishedAt)}</span>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={railShell}>
          <RailPanelHeader title="Legislative tracker" leadingDotClass="bg-sky-500" />
          <div className={cn(railListBody, "rounded-b-xl")}>
            <div className={cn(railCardInset, "px-2 py-2")}>
              <div className="grid grid-cols-2 gap-1.5 md:grid-cols-5">
                {STAGES.map((s) => {
                  const n = counts[s.key] ?? 0;
                  return (
                    <div key={s.key} className="px-2 py-2.5 text-center">
                      <p className="mb-1.5 font-mono text-[8px] uppercase tracking-[0.08em] text-[#444]">
                        {s.label}
                      </p>
                      <p
                        className={cn(
                          "font-mono text-[20px] leading-none text-[#c0c0b8]",
                          s.key === "registered" && n > 0 && "text-[#8b5cf6]"
                        )}
                      >
                        {n}
                      </p>
                      <p className="mt-0.5 font-mono text-[9px] text-[#2a2a2a]">{s.sub}</p>
                    </div>
                  );
                })}
              </div>
              <p className="mt-1 px-1 font-mono text-[9px] text-[#2a2a2a]">
                Bills in pipeline: {billsPayload?.bills?.length ?? 0} rows synced from HoR scraper.
              </p>
            </div>
          </div>
        </div>

        <div className={railShell}>
          <RailPanelHeader title="Party snapshot" leadingDotClass="bg-fuchsia-500" />
          <div className={cn(railListBody, "rounded-b-xl")}>
            <div className={cn(railCardInset, "grid grid-cols-2 gap-1.5 px-2 py-2 md:grid-cols-4")}>
              {(parties ?? []).map((p) => (
                <div
                  key={p.id}
                  className="rounded-md border border-[#1e1e1e] bg-[#111] px-2.5 pb-2 pt-2.5"
                  style={{
                    borderTopWidth: 2,
                    borderTopColor: PARTY_TOP_ACCENTS[p.id] ?? p.colorHex ?? "#666",
                    borderLeft: "none",
                  }}
                >
                  <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#555]">{p.shortName}</p>
                  <p className="mt-1 font-mono text-[18px] font-normal leading-none text-[#c0c0b8]">
                    {p.totalSeats}
                  </p>
                  <p className="mt-1 font-mono text-[9px] text-[#2e2e2e]">
                    FPTP {p.fptpSeats} · PR {p.prSeats}
                  </p>
                  {p.isGoverning ? (
                    <span className="mt-1 inline-block rounded-sm border border-[#1a3a1a] bg-[#0d1f0d] px-1.5 py-px font-mono text-[8px] text-[#4ade80]">
                      Governing
                    </span>
                  ) : null}
                </div>
              ))}
              <div className="flex flex-col justify-center rounded-md border border-[#1e1e1e] bg-[#111] px-2.5 py-2 opacity-40">
                <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#555]">PULSE STATS</p>
                <p className="mt-1 font-mono text-[9px] text-[#2e2e2e]">
                  Bills: {stats?.totalBillsTracked ?? 0}
                </p>
                <p className="font-mono text-[9px] text-[#2e2e2e]">
                  Laws: {stats?.lawsEnacted ?? 0} · Cabinet: {stats?.cabinetDecisions ?? 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex min-h-[320px] min-w-0 flex-col border-t border-[#1a1a1a] bg-[#0a0a0a] md:min-h-0 md:border-l md:border-t-0 md:overflow-y-auto">
        <CabinetWatchPanel
          rows={cabinet ?? []}
          weekly={
            weekly
              ? { content: weekly.content, periodStart: weekly.periodStart, periodEnd: weekly.periodEnd }
              : null
          }
        />
      </div>
    </div>
  );
}
