"use client";

import { cn, timeAgo } from "@/lib/utils";
import type { PoliticalPulseEvent } from "@repo/shared";

function getPartyShortName(partyId: string): string {
  return partyId.replace(/^party-/, "").toUpperCase();
}

function heroBorderClass(eventType: string): string {
  switch (eventType) {
    case "appointment":
      return "border-l-[#3b82f6]";
    case "law_enacted":
      return "border-l-[#22c55e]";
    case "cabinet_decision":
      return "border-l-[#f59e0b]";
    case "bill_passed":
    case "bill_registered":
      return "border-l-[#8b5cf6]";
    default:
      return "border-l-[#dc143c]";
  }
}

export interface HeroStoryCardProps {
  event: PoliticalPulseEvent;
}

export function HeroStoryCard({ event }: HeroStoryCardProps) {
  const open = () => {
    if (event.sourceUrl) window.open(event.sourceUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        "hero-card mb-0 w-full cursor-pointer rounded-2xl rounded-l-none border border-white/[0.08] border-l-[3px] bg-surface-card px-6 py-6 text-left shadow-pulse-card transition-[background,box-shadow] duration-200 hover:bg-[#1e2238]",
        heroBorderClass(event.eventType)
      )}
    >
      <div className="hero-eyebrow mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-white/[0.06] px-2 py-0.5 font-sans text-[9px] uppercase tracking-[0.08em] text-slate-400">
          {event.eventType.replace(/_/g, " ").toUpperCase()}
        </span>
        {event.partyIds?.[0] ? (
          <span className="rounded-md border border-[#1a3a1a] bg-[#0d1f0d] px-2 py-0.5 font-sans text-[9px] uppercase tracking-[0.08em] text-[#4ade80]">
            {getPartyShortName(event.partyIds[0])}
          </span>
        ) : null}
        {event.importanceScore >= 8 ? (
          <span className="rounded-md border border-[#2a1e00] bg-[#1f1500] px-2 py-0.5 font-sans text-[9px] uppercase tracking-[0.08em] text-[#fbbf24]">
            High priority
          </span>
        ) : null}
      </div>

      <h2 className="hero-title mb-3 font-sans text-[22px] font-semibold leading-[1.35] tracking-[-0.02em] text-white">
        {event.title}
      </h2>

      {event.summary ? (
        <p className="hero-summary mb-5 font-sans text-[15px] leading-[1.65] text-slate-400">{event.summary}</p>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <span className="hero-src font-sans text-[10px] text-slate-500">
          {event.sourceName ?? "—"} · {timeAgo(event.publishedAt)}
        </span>
        {event.sourceUrl ? (
          <span className="hero-read font-sans text-[10px] text-slate-400 transition-colors hover:text-white">
            Read full story →
          </span>
        ) : null}
      </div>
    </button>
  );
}
