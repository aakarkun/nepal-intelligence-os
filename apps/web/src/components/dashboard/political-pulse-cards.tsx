"use client";

import { Building2, Users, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PLACEHOLDERS = [
  {
    icon: Building2,
    title: "Cabinet stability index",
    description: "Coming soon — minister changes, reshuffles",
  },
  {
    icon: Users,
    title: "Parliamentary session tracker",
    description: "Coming soon — bills tabled, passed, rejected",
  },
  {
    icon: Calendar,
    title: "Coalition health",
    description: "Coming soon — government seat math, coalition status",
  },
] as const;

export function PoliticalPulseCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {PLACEHOLDERS.map((item) => {
        const Icon = item.icon;
        return (
          <Card
            key={item.title}
            className="border border-border bg-card/80 border-dashed"
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">
                  {item.title}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {item.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
