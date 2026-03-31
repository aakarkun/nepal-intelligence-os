"use client";

import { useMemo } from "react";
import { Pin, PinOff, CheckCircle2, Copy } from "@/components/icons";
import type { SignalEvent } from "@repo/shared";
import { cn, timeAgo } from "@/lib/utils";
import { SEVERITY_BADGE_CLASS, TYPE_BADGE_CLASS, titleForType } from "./severity";

type SignalCardProps = {
  event: SignalEvent;
  selected: boolean;
  isPinned: boolean;
  isReviewed: boolean;
  onSelect: () => void;
  onTogglePinned: () => void;
  onMarkReviewed: () => void;
  onCopyLink: () => void;
};

export function SignalCard({
  event,
  selected,
  isPinned,
  isReviewed,
  onSelect,
  onTogglePinned,
  onMarkReviewed,
  onCopyLink,
}: SignalCardProps) {
  const typeBadgeClass = TYPE_BADGE_CLASS[event.type] ?? "border-border/40 bg-muted/20 text-muted-foreground";
  const severityBadgeClass = SEVERITY_BADGE_CLASS[event.severity];

  const meta = useMemo(() => {
    const bits: string[] = [];
    if (event.source) bits.push(event.source);
    if (event.constituencyId) bits.push(`Constituency: ${event.constituencyId}`);
    if (event.districtId != null) bits.push(`District: ${event.districtId}`);
    return bits;
  }, [event]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group flex w-full gap-3 rounded-xl p-3 text-left transition-[border-color] duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
        selected ? "border border-white/[0.18]" : "border-0 border-transparent"
      )}
    >
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    typeBadgeClass
                  )}
                >
                  {titleForType(event.type)}
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    severityBadgeClass
                  )}
                >
                  {event.severity}
                </span>
                {isReviewed && (
                  <span className="rounded-full border border-white/[0.1] bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#888]">
                    Reviewed
                  </span>
                )}
                {isPinned && (
                  <span className="rounded-full border border-amber-500/25 bg-amber-500/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                    Pinned
                  </span>
                )}
              </div>

              <div
                className={cn(
                  "mt-2.5 line-clamp-2 font-sans text-[13px] font-semibold leading-relaxed transition-colors duration-150",
                  selected
                    ? "text-[#e5e5e5]"
                    : "text-[#e5e5e5]/50 group-hover:text-[#e5e5e5] group-focus-within:text-[#e5e5e5]"
                )}
              >
                {event.title}
              </div>
              {event.body && (
                <div className="mt-1.5 line-clamp-2 font-sans text-[12px] leading-relaxed text-[#8a8a8a]">
                  {event.body}
                </div>
              )}
            </div>

            <div className="shrink-0 text-right">
              <div className="font-sans text-[12px] tabular-nums text-[#888]">
                {timeAgo(event.timestamp)}
              </div>
            </div>
          </div>

          {meta.length > 0 && (
            <div className="flex flex-wrap gap-1.5 font-sans text-[11px] text-[#888]">
              {meta.slice(0, 2).map((m) => (
                <span
                  key={m}
                  className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[#a3a3a3]"
                >
                  {m}
                </span>
              ))}
            </div>
          )}

          <div
            className={cn(
              "flex flex-wrap items-center gap-2 transition-opacity duration-150",
              selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
            )}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMarkReviewed();
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-2.5 py-1 font-sans text-[12px] text-[#a1a1aa] hover:bg-white/[0.08] hover:text-[#e5e5e5]"
              aria-label="Mark reviewed"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Mark Reviewed
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePinned();
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-2.5 py-1 font-sans text-[12px] text-[#a1a1aa] hover:bg-white/[0.08] hover:text-[#e5e5e5]"
              aria-label={isPinned ? "Unpin" : "Pin"}
            >
              {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              {isPinned ? "Unpin" : "Pin"}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCopyLink();
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-2.5 py-1 font-sans text-[12px] text-[#a1a1aa] hover:bg-white/[0.08] hover:text-[#e5e5e5]"
              aria-label="Copy link"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy link
            </button>
          </div>
        </div>
    </div>
  );
}
