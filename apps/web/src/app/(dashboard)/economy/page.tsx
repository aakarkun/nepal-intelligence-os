import { TrendingUp, DollarSign, Globe, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const FEATURES = [
  {
    icon: TrendingUp,
    title: "GDP & Inflation",
    description:
      "NRB quarterly macro data with trend charts, CPI tracking, and year-over-year comparisons.",
  },
  {
    icon: BarChart3,
    title: "NEPSE Live",
    description:
      "Stock index ticker, sector breakdown, top movers, and trading volume analysis.",
  },
  {
    icon: DollarSign,
    title: "Remittance Flows",
    description:
      "Migration corridor map, quarterly totals by country, and dependency metrics by district.",
  },
  {
    icon: Globe,
    title: "Trade & Reserves",
    description:
      "Import/export balance, foreign reserves trend, forex rates, and trade corridor health.",
  },
];

export default function EconomyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Economic Pulse
        </h1>
        <p className="text-muted-foreground text-sm">
          NRB macro dashboard, NEPSE tracker, remittance flows
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
          Economic data integration (NRB, NEPSE, CBS) begins after the election
          launch. Core infrastructure and data pipelines are being designed.
        </p>
      </div>
    </div>
  );
}
