import { WarRoomPanel } from "@/components/war-room/war-room-panel";

export default function WarRoomPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          War Room
        </h1>
        <p className="text-muted-foreground text-sm">
          Collaborative voice room + AI briefing
        </p>
      </div>
      <WarRoomPanel />
    </div>
  );
}
