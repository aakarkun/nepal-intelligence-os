"use client";

import { SignalsFeed } from "@/components/feed/signals-feed";
import type { SignalEventType } from "@repo/shared";

export default function NewsRoomPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          News Room
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Election updates and news with source attribution from curated news sources.
        </p>
      </div>
      <SignalsFeed allowedTypes={["news"] as SignalEventType[]} />
    </div>
  );
}
