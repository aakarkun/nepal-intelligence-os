import { Activity, CloudRain, AlertTriangle, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const FEATURES = [
  {
    icon: Activity,
    title: "Seismic Activity",
    description:
      "USGS + NSC Nepal earthquake feed with magnitude, depth, and proximity to population centers.",
  },
  {
    icon: CloudRain,
    title: "Flood & Landslide",
    description:
      "Risk overlay map with live incidents, historical patterns, and seasonal prediction models.",
  },
  {
    icon: AlertTriangle,
    title: "BIPAD Integration",
    description:
      "Live disaster incident stream from Nepal's official disaster information portal.",
  },
  {
    icon: Heart,
    title: "Relief Tracker",
    description:
      "Distribution tracking by district, responder deployment map, and aid gap analysis.",
  },
];

export default function DisastersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Crisis Monitor
        </h1>
        <p className="text-muted-foreground text-sm">
          BIPAD integration, seismic feeds, flood risk overlays
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <Card key={f.title}>
              <CardContent className="p-6 space-y-3">
                <Icon className="h-8 w-8 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-sm font-semibold">
                    {f.title}
                  </h3>
                  <Badge variant="secondary" className="text-[9px]">
                    Phase 2
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="bg-card border border-border border-l-2 border-l-nepal-red p-4 rounded-md">
        <p className="text-xs text-muted-foreground">
          <span className="text-foreground font-medium">
            This module is under development.
          </span>{" "}
          BIPAD and seismic feed integration begins in Phase 2. Disaster data
          pipelines, risk models, and relief tracking infrastructure are being
          designed.
        </p>
      </div>
    </div>
  );
}
