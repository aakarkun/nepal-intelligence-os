"use client";

import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Lock,
  Radio,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const MOCK_PARTICIPANTS = [
  { id: "1", name: "Analyst 1", initials: "A1", muted: false },
  { id: "2", name: "Observer 2", initials: "O2", muted: true },
  { id: "3", name: "Field Reporter 3", initials: "F3", muted: true },
];

function LockedState() {
  return (
    <Card className="max-w-md mx-auto mt-20">
      <CardContent className="py-12 text-center space-y-4">
        <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
        <h2 className="font-display text-xl font-bold">
          War Room is Disabled
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          The collaborative voice room requires LiveKit integration. Set{" "}
          <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
            NEXT_PUBLIC_ENABLE_WAR_ROOM=true
          </code>{" "}
          in your environment to enable this feature.
        </p>
      </CardContent>
    </Card>
  );
}

function VoiceRoom() {
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [ptt, setPtt] = useState(false);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {MOCK_PARTICIPANTS.map((p) => (
          <Card key={p.id}>
            <CardContent className="py-6 flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-lg font-bold font-display">
                {p.initials}
              </div>
              <span className="text-sm font-medium">{p.name}</span>
              <div className="flex items-center gap-1.5">
                {p.muted ? (
                  <MicOff className="h-3.5 w-3.5 text-red-500" />
                ) : (
                  <Mic className="h-3.5 w-3.5 text-green-500" />
                )}
                <span className="text-[10px] text-muted-foreground">
                  {p.muted ? "Muted" : "Speaking"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setMuted(!muted)}
              className={cn(
                "p-3 rounded-full border transition-colors",
                muted
                  ? "bg-red-500/10 border-red-500/30 text-red-500"
                  : "border-border hover:bg-muted text-muted-foreground"
              )}
            >
              {muted ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={() => setDeafened(!deafened)}
              className={cn(
                "p-3 rounded-full border transition-colors",
                deafened
                  ? "bg-red-500/10 border-red-500/30 text-red-500"
                  : "border-border hover:bg-muted text-muted-foreground"
              )}
            >
              {deafened ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>
            <button
              onMouseDown={() => setPtt(true)}
              onMouseUp={() => setPtt(false)}
              onMouseLeave={() => setPtt(false)}
              className={cn(
                "px-6 py-3 rounded-full border text-xs font-medium transition-colors",
                ptt
                  ? "bg-nepal-red border-nepal-red text-white"
                  : "border-border hover:bg-muted text-muted-foreground"
              )}
            >
              <Radio className="h-4 w-4 inline mr-2" />
              Push to Talk
            </button>
            <button className="p-3 rounded-full border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors">
              <PhoneOff className="h-5 w-5" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AIBriefingPanel() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-display">AI Briefing</CardTitle>
          <Badge variant="stale">Updated 5m ago</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Based on analysis of 140 constituencies counted, CPN (UML) maintains a
          narrow lead with 57 seats won, followed by Nepali Congress at 50 seats.
        </p>
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-xs">
            <span className="text-nepal-red mt-0.5">1.</span>
            <p className="text-muted-foreground">
              <span className="text-foreground font-medium">Kathmandu sweep:</span>{" "}
              NC has won 3 of 4 Kathmandu constituencies, signaling urban voter
              shift.
            </p>
          </div>
          <div className="flex items-start gap-2 text-xs">
            <span className="text-nepal-red mt-0.5">2.</span>
            <p className="text-muted-foreground">
              <span className="text-foreground font-medium">Madhesh battleground:</span>{" "}
              Province 2 remains highly competitive with JSPN gaining ground in
              Dhanusha and Siraha.
            </p>
          </div>
          <div className="flex items-start gap-2 text-xs">
            <span className="text-nepal-red mt-0.5">3.</span>
            <p className="text-muted-foreground">
              <span className="text-foreground font-medium">Coalition math:</span>{" "}
              Neither UML nor NC can form government alone. A UML+MC coalition would
              reach ~100 seats, still short of 138.
            </p>
          </div>
        </div>
        <div className="pt-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground">
            This briefing is AI-generated from current data feeds. Not for
            official citation.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function WarRoomPanel() {
  const enabled = process.env.NEXT_PUBLIC_ENABLE_WAR_ROOM === "true";

  if (!enabled) return <LockedState />;

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2">
        <VoiceRoom />
      </div>
      <div>
        <AIBriefingPanel />
      </div>
    </div>
  );
}
