"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { CabinetMinisterWatch, PartyIntelRow } from "@repo/shared";
import { HOR_MAJORITY_THRESHOLD } from "@repo/shared";
import { fetchPoliticalPulseParties } from "@/lib/api";
import { MINISTER_METADATA } from "@/lib/minister-metadata";
import { timeAgo } from "@/lib/utils";
import { useMinisterBio, useMinisterRelatedNews } from "@/hooks/use-minister-bio";

export interface MinisterProfileViewProps {
  ministerId: string;
  ministerRow: CabinetMinisterWatch;
  onClose: () => void;
}

export function MinisterProfileView(props: MinisterProfileViewProps) {
  const { ministerId, ministerRow, onClose } = props;
  const { mp, ministryLabel } = ministerRow;
  const meta = MINISTER_METADATA[ministerId];
  const { bio, isLoading } = useMinisterBio(ministerId);
  const { relatedNews } = useMinisterRelatedNews(ministerId);

  const { data: parties } = useQuery({
    queryKey: ["political-pulse-parties"],
    queryFn: fetchPoliticalPulseParties,
  });

  const party = useMemo(
    () => (parties ?? []).find((p: PartyIntelRow) => p.id === mp.partyId),
    [parties, mp.partyId]
  );

  const governing = useMemo(
    () => (parties ?? []).find((p: PartyIntelRow) => p.isGoverning),
    [parties]
  );

  const daysInOffice = useMemo(() => {
    const iso = meta?.officeSinceIso ?? "2025-01-01";
    const start = new Date(iso).getTime();
    if (Number.isNaN(start)) return "—";
    return String(Math.max(0, Math.floor((Date.now() - start) / (24 * 60 * 60 * 1000))));
  }, [meta?.officeSinceIso]);

  const icon = meta?.icon ?? "◆";
  const iconBg = meta?.iconBg ?? "#1a1d27";
  const tags = meta?.tags ?? [];
  const ministryFull = ministryLabel;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <style>{`
        @keyframes minister-bio-blink { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
        .minister-bio-dot { animation: minister-bio-blink 1s infinite; }
      `}</style>
      <button
        type="button"
        onClick={onClose}
        className="w-fit rounded-full px-1 py-1 font-sans text-[10px] uppercase tracking-[0.08em] text-slate-500 transition-colors hover:text-slate-300"
      >
        ← Back to feed
      </button>

      <div className="rounded-2xl border border-white/[0.06] bg-surface-card p-5 shadow-pulse-card-sm">
        <div
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl shadow-inner"
          style={{ backgroundColor: iconBg }}
        >
          <span className="text-[16px] leading-none">{icon}</span>
        </div>
        <div className="pname mb-1 font-sans text-xl font-semibold tracking-tight text-white">{mp.name}</div>
        <div className="mb-3 font-sans text-sm leading-snug text-slate-400">{ministryFull}</div>
        <div className="flex flex-wrap gap-1.5">
          {party ? (
            <span className="rounded-md border border-[#152615] bg-[#0a150a] px-2 py-0.5 font-sans text-[9px] text-[#4ade80]">
              {party.shortName}
            </span>
          ) : null}
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-white/[0.06] px-2 py-0.5 font-sans text-[9px] text-slate-400"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-white/[0.06] bg-surface-subtle p-3 text-center shadow-pulse-card-sm">
          <div className="font-sans text-[8px] uppercase tracking-[0.1em] text-slate-500">Days in office</div>
          <div className="mt-1.5 font-sans text-lg font-semibold tabular-nums tracking-tight text-white">
            {daysInOffice}
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-surface-subtle p-3 text-center shadow-pulse-card-sm">
          <div className="font-sans text-[8px] uppercase tracking-[0.1em] text-slate-500">Seats</div>
          <div className="mt-1.5 font-sans text-xs font-medium leading-tight text-slate-300">
            {governing ? `${governing.shortName} ${governing.totalSeats}` : "—"}
          </div>
          <div className="mt-1 font-sans text-[8px] text-slate-500">threshold {HOR_MAJORITY_THRESHOLD}</div>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-surface-subtle p-3 text-center shadow-pulse-card-sm">
          <div className="font-sans text-[8px] uppercase tracking-[0.1em] text-slate-500">News</div>
          <div className="mt-1.5 font-sans text-lg font-semibold tabular-nums tracking-tight text-white">
            {relatedNews.length}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-surface-subtle p-5 shadow-pulse-card-sm">
        <div className="mb-2 font-sans text-[9px] uppercase tracking-[0.12em] text-slate-500">Biography</div>
        {isLoading ? (
          <div className="flex items-center gap-1">
            <span className="minister-bio-dot inline-block h-1 w-1 rounded-full bg-slate-600" />
            <span
              className="minister-bio-dot inline-block h-1 w-1 rounded-full bg-slate-600"
              style={{ animationDelay: "0.2s" }}
            />
            <span
              className="minister-bio-dot inline-block h-1 w-1 rounded-full bg-slate-600"
              style={{ animationDelay: "0.4s" }}
            />
            <span className="ml-1 font-sans text-xs text-slate-500">Fetching from Wikipedia…</span>
          </div>
        ) : (
          <p className="pbio-txt font-sans text-[14px] leading-[1.75] text-slate-400">
            {bio?.trim() ? bio : "No biography available yet."}
          </p>
        )}
      </div>

      <div>
        <div className="mb-2 font-sans text-[9px] uppercase tracking-[0.12em] text-slate-500">Related news</div>
        {relatedNews.length === 0 ? (
          <div className="font-sans text-xs text-slate-500">No related news yet.</div>
        ) : (
          relatedNews.map((item) => (
            <button
              key={item.id}
              type="button"
              className="mb-2 w-full cursor-pointer rounded-2xl border border-white/[0.06] bg-surface-card px-4 py-3 text-left shadow-pulse-card-sm transition-colors hover:bg-[#232836]"
              onClick={() => {
                if (item.sourceUrl) window.open(item.sourceUrl, "_blank", "noopener,noreferrer");
              }}
            >
              <div className="pnews-t mb-1.5 font-sans text-sm font-medium leading-snug text-slate-200">
                {item.title}
              </div>
              <div className="font-sans text-[10px] text-slate-500">
                {item.sourceName ?? "—"} · {timeAgo(item.publishedAt)} ·{" "}
                {item.eventType.replace(/_/g, " ").toUpperCase()}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
