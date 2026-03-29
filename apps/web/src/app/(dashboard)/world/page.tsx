"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { AlertCircle, DollarSign } from "@/components/icons";
import { fetchWorldArticles } from "@/lib/api";
import type { GeopoliticsArticle } from "@repo/shared";
import { IntelRailSections, FlatRailPanelHeader, railRowFlat } from "@/components/layout/intel-rail";
import { discoverShellClass } from "@/components/discover/discover-rail-tokens";
import { cn, timeAgo } from "@/lib/utils";

type WorldPanel = GeopoliticsArticle["panel"];

const PANELS: { id: WorldPanel; label: string }[] = [
  { id: "south_asia", label: "South Asia" },
  { id: "diplomatic", label: "Diplomatic Wire" },
  { id: "remittance", label: "Remittance Corridor" },
  { id: "un", label: "UN & Multilateral" },
];

const PANEL_DOT: Record<WorldPanel, string> = {
  south_asia: "bg-amber-500",
  diplomatic: "bg-sky-500",
  remittance: "bg-emerald-500",
  un: "bg-violet-500",
};

/** Same track as Anomalies — not full width: hugs tab labels. */
const deskTabsTrackClass =
  "inline-flex max-w-full flex-row rounded-full bg-white/[0.06] p-px shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";

const REMITTANCE_COUNTRIES = [
  { code: "MY", name: "Malaysia" },
  { code: "QA", name: "Qatar" },
  { code: "AE", name: "UAE" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "KW", name: "Kuwait" },
];

const deskTileClass = "rounded-xl bg-white/[0.05] px-3 py-2";
const panelBodyClass = "min-w-0";

function ArticleRow({
  article,
  isFirst,
  isLast,
}: {
  article: GeopoliticsArticle;
  isFirst: boolean;
  isLast: boolean;
}) {
  const toneNegative = article.tone !== null && article.tone < -5;
  return (
    <div
      className={cn(
        railRowFlat,
        isFirst && "rounded-t-lg",
        isLast && "rounded-b-lg"
      )}
    >
      <div className="mb-1.5 flex min-w-0 items-start justify-between gap-3">
        <h3 className="font-sans text-[14px] font-normal leading-snug text-[#ccc]">{article.title}</h3>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 font-sans text-[11px] tracking-tight text-nepal-red/90 transition-colors hover:text-nepal-red"
        >
          Open →
        </a>
      </div>
      <p className="font-sans text-[12px] text-[#555]">
        <span className="text-[#666]">{article.source}</span>
        {" · "}
        {timeAgo(article.publishedAt)}
        {toneNegative && (
          <span className="ml-2 inline-flex items-center gap-1 font-sans text-[11px] tracking-tight text-rose-400/85">
            <AlertCircle className="h-3 w-3" />
            Conflict-oriented tone
          </span>
        )}
      </p>
    </div>
  );
}

export default function WorldPage() {
  const panelOpen = useSelector((s: RootState) => s.ui.intelRailOpen);
  const [activePanel, setActivePanel] = useState<WorldPanel>("south_asia");
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["world-articles", activePanel],
    queryFn: () => fetchWorldArticles(activePanel, 20),
    refetchInterval: 60_000,
  });

  const activeLabel = PANELS.find((p) => p.id === activePanel)?.label ?? "Global";

  return (
    <div
      className={cn(
        "-mx-4 px-4 pb-10 md:-mx-6 md:px-6 min-h-full bg-transparent text-[#e5e5e5] antialiased"
      )}
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1 space-y-4">
          <nav className="flex justify-start" role="tablist" aria-label="Global desk panels">
            <div className={cn(deskTabsTrackClass, "overflow-x-auto")}>
              {PANELS.map((p) => {
                const on = p.id === activePanel;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    id={`desk-tab-${p.id}`}
                    aria-controls="global-desk-panel"
                    onClick={() => setActivePanel(p.id)}
                    className={cn(
                      "shrink-0 whitespace-nowrap rounded-full px-2.5 py-1.5 text-center font-sans text-[11px] leading-snug tracking-tight transition-colors duration-150 sm:px-3 sm:py-1.5 sm:text-[12px]",
                      on
                        ? "bg-white/[0.12] text-white"
                        : "text-[#6b6b6b] hover:text-[#9ca3af]"
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </nav>

          <div
            id="global-desk-panel"
            role="tabpanel"
            aria-labelledby={`desk-tab-${activePanel}`}
            className={discoverShellClass}
          >
            <FlatRailPanelHeader
              title={activeLabel}
              leadingDotClass={PANEL_DOT[activePanel]}
            />
            <div className={cn(panelBodyClass, "px-2 pb-2")}>
              {activePanel === "south_asia" && (
                <div className="border-b border-white/[0.06] px-0 py-3 font-sans text-[13px] leading-relaxed text-[#a1a1aa]">
                  Nepal sits between India and China. Stories from both neighbours directly affect
                  Nepal&apos;s trade, politics, and security.
                </div>
              )}

              {activePanel === "remittance" && (
                <div className="border-b border-white/[0.06] px-0 py-3">
                  <div className="mb-2 flex items-center gap-2 font-sans text-[12px] tracking-tight text-[#888]">
                    <DollarSign className="h-3.5 w-3.5 text-[#666]" aria-hidden />
                    Top remittance source countries
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {REMITTANCE_COUNTRIES.map((c) => (
                      <div key={c.code} className={cn(deskTileClass, "flex items-center gap-2")}>
                        <span className="font-mono text-[11px] text-[#666]">{c.code}</span>
                        <span className="font-sans text-[13px] text-[#ccc]">{c.name}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 font-sans text-[12px] leading-snug text-[#555]">
                    Gulf and Southeast Asian stories matter for Nepal&apos;s migrant workers and
                    remittance flows.
                  </p>
                </div>
              )}

              {isLoading ? (
                <p className="px-0 py-4 font-sans text-[13px] text-[#555]">Loading…</p>
              ) : articles.length === 0 ? (
                <p className="px-0 py-4 font-sans text-[13px] text-[#555]">
                  No recent articles — checking sources…
                </p>
              ) : (
                <div className="flex flex-col overflow-hidden rounded-xl">
                  {articles.map((a, i) => (
                    <ArticleRow
                      key={a.id}
                      article={a}
                      isFirst={i === 0}
                      isLast={i === articles.length - 1}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <p className="font-sans text-[12px] leading-snug text-[#666]">
            Tone score from GDELT: negative = more conflict-oriented coverage, positive = more
            cooperative.
          </p>
        </div>

        <aside
          className={cn(
            "hidden shrink-0 overflow-hidden transition-[transform,opacity,width] duration-200 ease-out lg:block",
            panelOpen
              ? "w-[var(--intel-rail-width)] translate-x-0 opacity-100"
              : "pointer-events-none w-0 translate-x-6 opacity-0"
          )}
        >
          <div className="space-y-3">
            <IntelRailSections />
          </div>
        </aside>
      </div>
    </div>
  );
}
