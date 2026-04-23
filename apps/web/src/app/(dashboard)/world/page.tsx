"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/store";
import { toggleIntelRail } from "@/store/slices/uiSlice";
import { AlertCircle, DollarSign } from "@/components/icons";
import { fetchWorldArticles } from "@/lib/api";
import { env } from "@/lib/env";
import { getWorldFixtureArticles } from "@/lib/world-fixture";
import type { GeopoliticsArticle } from "@repo/shared";
import { FlatRailPanelHeader, IntelRailSections, railRowFlat } from "@/components/layout/intel-rail";
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
  "flex max-w-full flex-wrap items-center gap-1 rounded-full bg-white/[0.06] p-px shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";

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
      <div className="mb-1.5 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <h3 className="min-w-0 font-sans text-[14px] font-normal leading-snug text-[#ccc]">{article.title}</h3>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 self-start font-sans text-[11px] tracking-tight text-nepal-red/90 transition-colors hover:text-nepal-red sm:self-auto"
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
  const dispatch = useDispatch();
  const panelOpen = useSelector((s: RootState) => s.ui.intelRailOpen);
  const [activePanel, setActivePanel] = useState<WorldPanel>("south_asia");
  const useFixture = env.NEXT_PUBLIC_WORLD_ARTICLE_FIXTURE;

  const {
    data: articles = [],
    isPending,
    isFetching,
    isError,
    error,
    refetch,
    isSuccess,
    failureCount,
  } = useQuery({
    queryKey: ["world-articles", activePanel, useFixture ? "fixture" : "live"],
    queryFn: () =>
      useFixture
        ? Promise.resolve(getWorldFixtureArticles(activePanel))
        : fetchWorldArticles(activePanel, 20),
    refetchInterval: useFixture ? false : 60_000,
  });

  const openIntelRailForHealth = () => {
    if (!panelOpen) dispatch(toggleIntelRail());
  };

  const activeLabel = PANELS.find((p) => p.id === activePanel)?.label ?? "Global";

  return (
    <div
      className={cn(
        "-mx-4 px-4 pb-10 md:-mx-6 md:px-6 min-h-full bg-transparent text-[#e5e5e5] antialiased"
      )}
    >
      {/* Same pattern as Economy / Discover: intel rail is a flex column in document flow, not the fixed shell overlay. */}
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1 space-y-4">
          <nav
            className="-mx-1 flex justify-start overflow-x-auto px-1 pb-1 scrollbar-thin [-webkit-overflow-scrolling:touch]"
            role="tablist"
            aria-label="Global desk panels"
          >
            <div className={cn(deskTabsTrackClass, "min-w-min shrink-0")}>
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
                      "shrink-0 touch-manipulation whitespace-normal rounded-full px-2.5 py-1.5 text-center font-sans text-[11px] leading-snug tracking-tight transition-colors duration-150 sm:px-3 sm:py-1.5 sm:text-[12px]",
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

              {isPending ? (
                <p className="px-0 py-4 font-sans text-[13px] text-[#555]">Loading articles…</p>
              ) : isError ? (
                <div className="space-y-3 px-0 py-4">
                  <p className="font-sans text-[13px] leading-relaxed text-rose-300/90">
                    Couldn&apos;t load the World feed{" "}
                    {failureCount > 1 ? `(after ${failureCount} tries)` : ""}.
                    {error instanceof Error ? ` ${error.message}` : ""}
                  </p>
                  <p className="font-sans text-[12px] leading-snug text-[#666]">
                    This request uses the REST API (not the live ticker). Check{" "}
                    <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[11px]">
                      NEXT_PUBLIC_API_URL
                    </code>{" "}
                    and that the API is running.
                  </p>
                  <button
                    type="button"
                    onClick={() => void refetch()}
                    className="rounded-full border border-white/[0.12] bg-white/[0.06] px-3 py-1.5 font-sans text-[12px] text-[#ccc] transition-colors hover:bg-white/[0.1]"
                  >
                    Retry
                  </button>
                </div>
              ) : isSuccess && articles.length === 0 ? (
                <div className="space-y-3 px-0 py-4">
                  <p className="font-sans text-[13px] leading-relaxed text-[#a1a1aa]">
                    No articles for this panel yet. The API returned an empty list — this is not the
                    same as &quot;still loading&quot;.
                  </p>
                  <ul className="list-inside list-disc space-y-1.5 font-sans text-[12px] leading-snug text-[#666]">
                    <li>
                      Ingest runs in the worker (GDELT + UN RSS). If the worker isn&apos;t running or
                      GDELT returns no rows, the database stays empty until the next successful run.
                    </li>
                    <li>
                      Top-bar OFFLINE refers to the realtime signal stream (SSE), not this feed.
                    </li>
                  </ul>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={openIntelRailForHealth}
                      className="rounded-full border border-white/[0.12] bg-white/[0.06] px-3 py-1.5 font-sans text-[12px] text-[#ccc] transition-colors hover:bg-white/[0.1]"
                    >
                      Open Panel → source health
                    </button>
                    {!useFixture && (
                      <span className="font-sans text-[11px] text-[#555]">
                        For local UI without ingest, set{" "}
                        <code className="rounded bg-white/[0.06] px-1 font-mono">
                          NEXT_PUBLIC_WORLD_ARTICLE_FIXTURE=true
                        </code>
                        .
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col overflow-hidden rounded-xl">
                  {isFetching && !isPending && (
                    <p className="mb-2 font-sans text-[11px] text-[#555]">Refreshing…</p>
                  )}
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
