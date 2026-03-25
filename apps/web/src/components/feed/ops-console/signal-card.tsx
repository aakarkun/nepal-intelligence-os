"use client";

import { useMemo } from "react";
import { Pin, PinOff, CheckCircle2, Copy } from "@/components/icons";
import type { SignalEvent } from "@repo/shared";
import { cn, timeAgo } from "@/lib/utils";
import {
  SEVERITY_BADGE_CLASS,
  SEVERITY_STRIPE_CLASS,
  TYPE_BADGE_CLASS,
  titleForType,
} from "./severity";

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
        "group relative w-full rounded-md border text-left transition-colors",
        "hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border",
        selected ? "border-nepal-red/40 bg-nepal-red/5" : "border-border bg-card/30"
      )}
    >
      <span
        className={cn(
          "absolute left-0 top-0 h-full w-1 rounded-l-md",
          SEVERITY_STRIPE_CLASS[event.severity]
        )}
      />

      <div className="flex gap-3 p-3 pl-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("rounded-md border px-2 py-0.5 text-[12px] font-semibold uppercase tracking-wide", typeBadgeClass)}>
                  {titleForType(event.type)}
                </span>
                <span className={cn("rounded-md border px-2 py-0.5 text-[12px] font-semibold uppercase tracking-wide", severityBadgeClass)}>
                  {event.severity}
                </span>
                {isReviewed && (
                  <span className="rounded-md border border-border/40 bg-background/20 px-2 py-0.5 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Reviewed
                  </span>
                )}
                {isPinned && (
                  <span className="rounded-md border border-amber-500/25 bg-amber-500/8 px-2 py-0.5 text-[12px] font-semibold uppercase tracking-wide text-amber-300">
                    Pinned
                  </span>
                )}
              </div>

              <div className="mt-2 line-clamp-2 text-sm font-semibold leading-snug">
                {event.title}
              </div>
              {event.body && (
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {event.body}
                </div>
              )}
            </div>

            <div className="shrink-0 text-right">
              <div className="font-mono text-[12px] tabular-nums text-muted-foreground">
                {timeAgo(event.timestamp)}
              </div>
            </div>
          </div>

          {meta.length > 0 && (
            <div className="flex flex-wrap gap-2 text-[12px] text-muted-foreground">
              {meta.slice(0, 2).map((m) => (
                <span key={m} className="rounded border border-border/40 bg-background/10 px-2 py-0.5">
                  {m}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMarkReviewed();
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/20 px-2 py-1 text-[13px] text-muted-foreground hover:text-foreground"
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
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/20 px-2 py-1 text-[13px] text-muted-foreground hover:text-foreground"
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
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/20 px-2 py-1 text-[13px] text-muted-foreground hover:text-foreground"
              aria-label="Copy link"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
