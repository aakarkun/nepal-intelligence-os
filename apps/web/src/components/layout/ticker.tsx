"use client";

import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils";
import { useRealtimeStore } from "@/stores/realtime-store";

const EVENT_TYPE_COLORS: Record<string, string> = {
  vote_update: "bg-status-live",
  anomaly: "bg-status-error",
  alert: "bg-status-stale",
  announcement: "bg-nepal-red",
};

export function Ticker() {
  const recentEvents = useRealtimeStore((s) => s.recentEvents);
  const events = recentEvents.slice(0, 20);

  if (events.length === 0) {
    return (
      <footer className="fixed inset-x-0 bottom-0 z-40 flex min-h-8 items-center border-t border-white/[0.06] bg-chrome-scrim px-4 pb-[env(safe-area-inset-bottom)] pt-0 md:z-50">
        <span className="text-xs text-muted-foreground/60">
          Waiting for signals…
        </span>
      </footer>
    );
  }

  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 min-h-8 overflow-hidden border-t border-white/[0.06] bg-chrome-scrim pb-[env(safe-area-inset-bottom)] md:z-50">
      <div className="animate-ticker flex h-full items-center whitespace-nowrap">
        {/* Duplicate for seamless loop */}
        {[...events, ...events].map((event, i) => (
          <span key={`${event.id}-${i}`} className="mx-4 flex items-center gap-2 text-xs">
            <span
              className={cn(
                "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
                EVENT_TYPE_COLORS[event.type] ?? "bg-muted-foreground"
              )}
            />
            <span className="text-foreground/80">{event.title}</span>
            <span className="font-sans text-[12px] text-muted-foreground tabular-nums">
              {timeAgo(event.timestamp)}
            </span>
          </span>
        ))}
      </div>
    </footer>
  );
}
