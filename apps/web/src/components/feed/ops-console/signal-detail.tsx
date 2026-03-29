"use client";

import { useMemo } from "react";
import { CheckCircle2, Pin, PinOff, ExternalLink } from "@/components/icons";
import type { SignalEvent } from "@repo/shared";
import Link from "next/link";
import { cn, timeAgo } from "@/lib/utils";
import {
  SEVERITY_BADGE_CLASS,
  TYPE_BADGE_CLASS,
  titleForType,
} from "./severity";

type SignalDetailProps = {
  event: SignalEvent | null;
  isPinned: boolean;
  isReviewed: boolean;
  onMarkReviewed: () => void;
  onTogglePinned: () => void;
  related: SignalEvent[];
};

export function SignalDetail({
  event,
  isPinned,
  isReviewed,
  onMarkReviewed,
  onTogglePinned,
  related,
}: SignalDetailProps) {
  const meta = useMemo(() => {
    if (!event) return null;
    return {
      typeBadgeClass:
        TYPE_BADGE_CLASS[event.type] ??
        "border-border/40 bg-muted/20 text-muted-foreground",
      severityBadgeClass: SEVERITY_BADGE_CLASS[event.severity],
      typeLabel: titleForType(event.type),
    };
  }, [event]);

  if (!event || !meta) {
    return (
      <div className="rounded-lg border border-dashed border-white/[0.1] px-4 py-10 text-center font-sans text-[13px] text-[#888]">
        Select a signal to see details.
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="border-b border-white/[0.06] px-2 pb-4 pt-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                  meta.typeBadgeClass
                )}
              >
                {meta.typeLabel}
              </span>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                  meta.severityBadgeClass
                )}
              >
                {event.severity}
              </span>
              {isReviewed && (
                <span className="rounded-full border border-white/[0.1] bg-white/[0.04] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#888]">
                  Reviewed
                </span>
              )}
              {isPinned && (
                <span className="rounded-full border border-amber-500/25 bg-amber-500/8 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-300">
                  Pinned
                </span>
              )}
            </div>
            <h2 className="mt-3 font-sans text-[17px] font-semibold leading-snug text-[#e5e5e5]">{event.title}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 font-sans text-[13px] text-[#888]">
              <span className="tabular-nums">{timeAgo(event.timestamp)}</span>
              {event.source && <span>via {event.source}</span>}
              {event.url && (
                <a
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-nepal-red hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Source
                </a>
              )}
              {event.constituencyId && (
                <Link
                  href={`/constituencies/${event.constituencyId}`}
                  className="text-nepal-red hover:underline"
                >
                  {event.constituencyId}
                </Link>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2">
            <button
              type="button"
              onClick={onMarkReviewed}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-2.5 py-1.5 font-sans text-[11px] text-[#a1a1aa] hover:bg-white/[0.08] hover:text-[#e5e5e5] sm:text-xs"
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark Reviewed
            </button>
            <button
              type="button"
              onClick={onTogglePinned}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-2.5 py-1.5 font-sans text-[11px] text-[#a1a1aa] hover:bg-white/[0.08] hover:text-[#e5e5e5] sm:text-xs"
            >
              {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              {isPinned ? "Unpin" : "Pin"}
            </button>
          </div>
        </div>
      </div>

      <div className="px-2 pb-2 pt-4">
        {event.body ? (
          <div className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-[#ccc]">
            {event.body}
          </div>
        ) : (
          <div className="font-sans text-[13px] text-[#888]">No additional details.</div>
        )}

        {related.length > 0 && (
          <div className="mt-6">
            <div className="font-sans text-[11px] font-semibold uppercase tracking-wider text-[#888]">
              Recent from same source
            </div>
            <div className="mt-2 space-y-2">
              {related.slice(0, 5).map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-2.5"
                >
                  <div className="line-clamp-2 font-sans text-[12px] font-medium text-[#ccc]">{r.title}</div>
                  <div className="mt-1 font-sans text-[12px] tabular-nums text-[#666]">
                    {timeAgo(r.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

