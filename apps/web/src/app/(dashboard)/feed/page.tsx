import { SignalsFeed } from "@/components/feed/signals-feed";
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
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Signals Feed
        </h1>
        <p className="text-muted-foreground text-sm">
          What&apos;s signaling now: operational alerts, NEPSE trading signals, ingest, anomalies,
          social, and high-attention news. Invest wisely; full news in News Room.
        </p>
      </div>
      <SignalsFeed allowedTypes={FEED_ALLOWED_TYPES} />
    </div>
  );
}
