"use client";

import { useRealtimeStore } from "@/stores/realtime-store";
import { timeAgo } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export function SeatFlipLog() {
  const events = useRealtimeStore((s) => s.recentEvents);
  const officialEvents = events
    .filter((e) => e.type === "official")
    .slice(0, 15);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-display">
          Result Declarations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          {officialEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No official results yet — waiting for declarations
            </p>
          ) : (
            <div className="space-y-2">
              {officialEvents.map((e) => (
                <div
                  key={e.id}
                  className="flex items-start gap-3 py-2 border-b border-border last:border-0"
                >
                  <span className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{e.title}</p>
                    <p className="text-[12px] text-muted-foreground">
                      {timeAgo(e.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
