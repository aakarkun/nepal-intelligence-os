import { SignalsConsole } from "@/components/feed/ops-console/signals-console";
import { cn } from "@/lib/utils";
import type { SignalEventType } from "@repo/shared";

/**
 * Signals Feed = "what's signaling now" — things that need attention or are trending:
 * - Operational: official, ingest (e.g. earthquakes), anomaly, social (note).
 * - Signaling news: when any ingested news is high-impact (viral, justice, disaster,
 *   security, political, etc.) it appears here too, so one stream shows both
 *   operational alerts and stories everyone is talking about.
 * News Room stays the place to browse all news by type and source.
 */
const FEED_ALLOWED_TYPES: SignalEventType[] = [
  "official",
  "ingest",
  "anomaly",
  "note",
  "news",
  "political",
  "security",
  "economic",
  "disaster",
  "diplomatic",
  "health",
];

export default function FeedPage() {
  return (
    <div
      className={cn(
        "-mx-4 flex w-full gap-6 px-4 pb-10 antialiased md:-mx-6 md:pl-6 md:pr-0",
        "min-h-full bg-transparent text-[#e5e5e5]"
      )}
    >
      <div className="min-w-0 flex-1 space-y-4">
        <SignalsConsole allowedTypes={FEED_ALLOWED_TYPES} />
      </div>
    </div>
  );
}
