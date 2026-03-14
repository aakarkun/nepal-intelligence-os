"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, DollarSign } from "lucide-react";
import { fetchWorldArticles } from "@/lib/api";
import type { GeopoliticsArticle } from "@repo/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, timeAgo } from "@/lib/utils";

type WorldPanel = GeopoliticsArticle["panel"];

const PANELS: { id: WorldPanel; label: string }[] = [
  { id: "south_asia", label: "South Asia" },
  { id: "diplomatic", label: "Diplomatic Wire" },
  { id: "remittance", label: "Remittance Corridor" },
  { id: "un", label: "UN & Multilateral" },
];

const REMITTANCE_COUNTRIES = [
  { code: "MY", name: "Malaysia" },
  { code: "QA", name: "Qatar" },
  { code: "AE", name: "UAE" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "KW", name: "Kuwait" },
];

function ArticleCard({ article }: { article: GeopoliticsArticle }) {
  const toneNegative = article.tone !== null && article.tone < -5;
  return (
    <Card className="border border-border bg-card/80">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium leading-tight">{article.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {article.source} · {timeAgo(article.publishedAt)}
              {toneNegative && (
                <span className="ml-2 inline-flex items-center gap-1 text-red-400">
                  <AlertCircle className="h-3 w-3" />
                  Negative tone
                </span>
              )}
            </p>
          </div>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs text-nepal-red hover:underline"
          >
            Read more →
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export default function WorldPage() {
  const [activePanel, setActivePanel] = useState<WorldPanel>("south_asia");
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["world-articles", activePanel],
    queryFn: () => fetchWorldArticles(activePanel, 20),
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Global Desk
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Nepal&apos;s geopolitical context — South Asia, diplomatic wire,
          remittance corridors, and multilateral.
        </p>
      </div>

      <Tabs value={activePanel} onValueChange={(v) => setActivePanel(v as WorldPanel)}>
        <TabsList className="flex flex-wrap gap-1">
          {PANELS.map((p) => (
            <TabsTrigger key={p.id} value={p.id}>
              {p.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {PANELS.map((p) => (
          <TabsContent key={p.id} value={p.id} className="space-y-4 mt-4">
            {p.id === "south_asia" && (
              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardContent className="p-4">
                  <p className="text-sm">
                    Nepal sits between India and China. Stories from both
                    neighbours directly affect Nepal&apos;s trade, politics, and
                    security.
                  </p>
                </CardContent>
              </Card>
            )}
            {p.id === "remittance" && (
              <Card className="border border-border bg-card/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Top remittance source countries
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {REMITTANCE_COUNTRIES.map((c) => (
                      <div
                        key={c.code}
                        className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                      >
                        <span className="font-mono text-xs text-muted-foreground">
                          {c.code}
                        </span>
                        <span>{c.name}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Gulf and Southeast Asian stories matter for Nepal&apos;s
                    migrant workers and remittance flows.
                  </p>
                </CardContent>
              </Card>
            )}
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : articles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recent articles — checking sources…
              </p>
            ) : (
              <div className="space-y-3">
                {articles.map((a) => (
                  <ArticleCard key={a.id} article={a} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <p className="text-[11px] text-muted-foreground">
        Tone score from GDELT: negative = more conflict-oriented coverage,
        positive = more cooperative.
      </p>
    </div>
  );
}
