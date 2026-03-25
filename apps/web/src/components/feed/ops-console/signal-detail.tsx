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
      <div className="rounded-xl border border-border bg-card/30 p-4 text-sm text-muted-foreground">
        Select a signal to see details.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card/30">
      <div className="border-b border-border p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[12px] font-semibold uppercase tracking-wide",
                  meta.typeBadgeClass
                )}
              >
                {meta.typeLabel}
              </span>
              <span
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[12px] font-semibold uppercase tracking-wide",
                  meta.severityBadgeClass
                )}
              >
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
            <h2 className="mt-3 text-lg font-semibold leading-snug">{event.title}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
              <span className="font-mono tabular-nums">{timeAgo(event.timestamp)}</span>
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
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/20 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark Reviewed
            </button>
            <button
              type="button"
              onClick={onTogglePinned}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/20 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              {isPinned ? "Unpin" : "Pin"}
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {event.body ? (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {event.body}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No additional details.</div>
        )}

        {related.length > 0 && (
          <div className="mt-6">
            <div className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
              Recent from same source
            </div>
            <div className="mt-2 space-y-2">
              {related.slice(0, 5).map((r) => (
                <div
                  key={r.id}
                  className="rounded-md border border-border/40 bg-background/10 p-2"
                >
                  <div className="text-xs font-medium line-clamp-2">{r.title}</div>
                  <div className="mt-1 font-mono text-[12px] tabular-nums text-muted-foreground">
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

