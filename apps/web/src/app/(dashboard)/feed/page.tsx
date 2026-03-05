import { SignalsFeed } from "@/components/feed/signals-feed";
import type { SignalEventType } from "@repo/shared";

export default function FeedPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Signals Feed
        </h1>
        <p className="text-muted-foreground text-sm">
          Live intelligence stream — all signals
        </p>
      </div>
      <SignalsFeed
        socialOnly
        allowedTypes={["note"] as SignalEventType[]}
      />
    </div>
  );
}
