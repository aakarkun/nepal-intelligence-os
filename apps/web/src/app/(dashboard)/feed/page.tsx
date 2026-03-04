import { SignalsFeed } from "@/components/feed/signals-feed";

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
      <SignalsFeed />
    </div>
  );
}
