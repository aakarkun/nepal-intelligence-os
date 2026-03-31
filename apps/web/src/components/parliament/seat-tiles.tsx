"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchNationalSummary } from "@/lib/api";
import {
  type HorSeatMapMode,
  type NationalSummary,
  horMajorityThresholdForMode,
  horSeatCapForMode,
  mergeHor2082NationalSummaryIfNeeded,
  partySeatsForHorMode,
} from "@repo/shared";
import { useElectionDatasetStore } from "@/stores/election-dataset-store";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Match typical chamber diagrams — spreads seats across more arcs. */
const HEMI_ROWS = 8;

const MIN_ARC_SPACING = 10;
const ROW_RADIAL_GAP = 12;

function allocateSeatCounts(total: number, numRows: number): number[] {
  const weights = Array.from({ length: numRows }, (_, i) => i + 1);
  const sumW = weights.reduce((a, b) => a + b, 0);
  const quotients = weights.map((w) => (total * w) / sumW);
  const floors = quotients.map((q) => Math.floor(q));
  const remainder = total - floors.reduce((a, b) => a + b, 0);
  const order = quotients
    .map((q, i) => ({ i, frac: q - Math.floor(q) }))
    .sort((a, b) => b.frac - a.frac);
  for (let j = 0; j < remainder; j++) {
    floors[order[j % numRows].i]++;
  }
  return floors;
}

type SeatPos = { x: number; y: number };

type LayoutResult = {
  positions: SeatPos[];
  viewW: number;
  viewH: number;
  cx: number;
  cy: number;
  rMax: number;
};

function buildHemicycleLayout(totalSeats: number, numRows: number): LayoutResult {
  const rowCounts = allocateSeatCounts(totalSeats, numRows);
  const rNominalMin = 44;
  const rNominalMax = 188;

  const radii: number[] = [];
  for (let row = 0; row < numRows; row++) {
    const n = rowCounts[row];
    const t = numRows === 1 ? 0 : row / (numRows - 1);
    let r = rNominalMin + t * (rNominalMax - rNominalMin);
    if (n > 1) {
      const rForSpacing = ((n - 1) * MIN_ARC_SPACING) / Math.PI;
      r = Math.max(r, rForSpacing);
    }
    if (row > 0) {
      r = Math.max(r, radii[row - 1] + ROW_RADIAL_GAP);
    }
    radii.push(r);
  }

  const rMax = radii[radii.length - 1];
  const cx = rMax + 48;
  const cy = rMax + 52;

  const positions: SeatPos[] = [];
  const angleStart = Math.PI * 0.998;
  const angleEnd = Math.PI * 0.002;

  for (let row = 0; row < numRows; row++) {
    const n = rowCounts[row];
    const r = radii[row];

    for (let k = 0; k < n; k++) {
      const angle =
        n === 1
          ? Math.PI / 2
          : angleStart - (k / (n - 1)) * (angleStart - angleEnd);
      positions.push({
        x: cx + r * Math.cos(angle),
        y: cy - r * Math.sin(angle),
      });
    }
  }

  /** Room below the outer arc for the bottom label (“275 Total seats”) without crowding chairs. */
  const bottomLabelPad = 42;

  const viewW = Math.ceil(cx + rMax + 28);
  const viewH = Math.ceil(cy + bottomLabelPad);

  return { positions, viewW, viewH, cx, cy, rMax };
}

function ParliamentChairIcon({
  fill,
  dimmed,
  muted,
}: {
  fill: string;
  /** Leading / provisional seat — softer when no party focus. */
  dimmed: boolean;
  /** Another party is focused — this seat is not selected. */
  muted: boolean;
}) {
  return (
    <g
      className={cn(
        "transition-opacity duration-200",
        muted && "opacity-[0.28]",
        !muted && dimmed && "opacity-55"
      )}
      transform="translate(-4.5, -5.5) scale(0.82)"
    >
      <path
        fill={fill}
        d="M2 1.5h7a1.5 1.5 0 011.5 1.5v3.5H.5V3A1.5 1.5 0 012 1.5z"
        opacity={0.95}
      />
      <path
        fill={fill}
        d="M1 6.5h9a1 1 0 011 1v2.5a.5.5 0 01-.5.5H.5A.5.5 0 010 10V7.5a1 1 0 011-1z"
      />
      <path fill={fill} d="M1.5 11h2v3h-2v-3zm6 0h2v3h-2v-3z" opacity={0.85} />
    </g>
  );
}

type SeatTile = {
  partyId: string;
  color: string;
  party: string;
  leading: boolean;
};

function buildSeatTiles(summary: NationalSummary, mode: HorSeatMapMode): SeatTile[] {
  const tiles: SeatTile[] = [];
  const hasFullBreakdown = summary.partyResults.some(
    (p) => p.fptpSeats !== undefined && p.prSeats !== undefined
  );

  for (const p of summary.partyResults) {
    if (mode === "total" && !hasFullBreakdown) {
      for (let i = 0; i < p.seatsWon; i++) {
        tiles.push({
          partyId: p.partyId,
          color: p.partyColor,
          party: p.partyShortName,
          leading: false,
        });
      }
      for (let i = 0; i < p.seatsLeading; i++) {
        tiles.push({
          partyId: p.partyId,
          color: p.partyColor,
          party: p.partyShortName,
          leading: true,
        });
      }
      continue;
    }

    const n = partySeatsForHorMode(p, mode);
    for (let i = 0; i < n; i++) {
      tiles.push({
        partyId: p.partyId,
        color: p.partyColor,
        party: p.partyShortName,
        leading: false,
      });
    }
  }

  return tiles;
}

export function SeatTiles({
  mode,
  focusPartyId,
  onClearFocus,
}: {
  mode: HorSeatMapMode;
  focusPartyId: string | null;
  onClearFocus: () => void;
}) {
  const { selectedDatasetId } = useElectionDatasetStore();
  const { data: summary } = useQuery({
    queryKey: ["national-summary", selectedDatasetId],
    queryFn: () => fetchNationalSummary(selectedDatasetId),
    refetchInterval: 15_000,
  });

  const mergedSummary = useMemo(
    () => (summary ? mergeHor2082NationalSummaryIfNeeded(summary, selectedDatasetId) : undefined),
    [summary, selectedDatasetId]
  );

  const chamberCap = horSeatCapForMode(mode);
  const majorityThreshold = horMajorityThresholdForMode(mode);

  const hasHorBreakdown = useMemo(
    () =>
      mergedSummary?.partyResults.some(
        (p) => p.fptpSeats !== undefined && p.prSeats !== undefined
      ) ?? false,
    [mergedSummary]
  );

  const focusParty =
    mergedSummary && focusPartyId
      ? mergedSummary.partyResults.find((p) => p.partyId === focusPartyId)
      : undefined;

  const focusSeatCount =
    focusParty && mergedSummary ? partySeatsForHorMode(focusParty, mode) : 0;

  const effectiveFocusId =
    focusPartyId && focusParty ? focusPartyId : null;

  const highlightActive = Boolean(effectiveFocusId && focusSeatCount > 0);

  const modeLabel =
    mode === "total" ? "Total" : mode === "fptp" ? "FPTP" : "PR";

  const tiles = useMemo(() => {
    if (!mergedSummary) {
      return [] as SeatTile[];
    }
    if (effectiveFocusId && focusSeatCount === 0) {
      return [] as SeatTile[];
    }
    const base = buildSeatTiles(mergedSummary, mode);
    const remaining = Math.max(0, chamberCap - base.length);
    const empty: SeatTile[] = [];
    for (let i = 0; i < remaining; i++) {
      empty.push({
        partyId: "__uncounted__",
        color: "#2a2a3e",
        party: "Uncounted",
        leading: false,
      });
    }
    return [...base, ...empty];
  }, [mergedSummary, mode, chamberCap, effectiveFocusId, focusSeatCount]);

  const layout = useMemo(
    () => buildHemicycleLayout(chamberCap, HEMI_ROWS),
    [chamberCap]
  );

  const barSegments = useMemo(() => {
    if (!mergedSummary) return [];
    return [...mergedSummary.partyResults]
      .map((p) => ({ p, n: partySeatsForHorMode(p, mode) }))
      .filter(({ n }) => n > 0)
      .sort((a, b) => b.n - a.n);
  }, [mergedSummary, mode]);

  const barAssignedTotal = useMemo(
    () => barSegments.reduce((s, x) => s + x.n, 0),
    [barSegments]
  );
  const barRemainder = Math.max(0, chamberCap - barAssignedTotal);

  const { positions, viewW, viewH, cx, cy, rMax } = layout;

  const guidePath = `M ${cx - rMax} ${cy} A ${rMax} ${rMax} 0 0 1 ${cx + rMax} ${cy}`;

  const showMajorityGuide = true;

  /** Constituency-only summaries have no per-party PR numbers — PR tab would be all grey. */
  if (mergedSummary && mode === "pr" && !hasHorBreakdown) {
    return (
      <TooltipProvider delayDuration={0}>
        <div className="space-y-2 rounded-lg border border-amber-500/15 bg-amber-500/[0.06] px-3 py-3">
          <p className="font-sans text-[13px] font-medium text-[#e8e8e8]">
            No PR data in this dataset
          </p>
          <p className="font-sans text-[12px] leading-relaxed text-[#a1a1aa]">
            The proportional list seats (110) are not part of constituency feeds. This summary only
            has FPTP-style totals. To see the PR seat map and table, select the election dataset that
            includes the full House result with FPTP + PR split (e.g. the final 2082 HoR snapshot).
          </p>
        </div>
      </TooltipProvider>
    );
  }

  if (mergedSummary && effectiveFocusId && focusSeatCount === 0) {
    return (
      <TooltipProvider delayDuration={0}>
        <div className="space-y-3 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-3">
          <p className="font-sans text-[13px] text-[#a1a1aa]">
            This party has no {modeLabel} seats in the current view.
          </p>
          <button
            type="button"
            onClick={onClearFocus}
            className="font-sans text-[12px] text-sky-400/90 underline-offset-2 hover:underline"
          >
            Clear selection
          </button>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="relative w-full space-y-2">
        {highlightActive && focusParty ? (
          <div className="flex items-center justify-between gap-2 px-0.5">
            <span className="truncate font-sans text-[11px] text-[#888]">
              Highlighting{" "}
              <span className="text-[#ccc]">{focusParty.partyShortName}</span>
            </span>
            <button
              type="button"
              onClick={onClearFocus}
              className="shrink-0 font-sans text-[11px] text-sky-400/90 hover:underline"
            >
              Clear
            </button>
          </div>
        ) : null}
        <svg
          viewBox={`0 0 ${viewW} ${viewH}`}
          className="h-auto w-full max-h-[min(56vh,26rem)] text-[#e5e5e5]"
          preserveAspectRatio="xMidYMax meet"
          role="img"
          aria-label={
            highlightActive && focusParty
              ? `House of Representatives seating, ${chamberCap} ${modeLabel} seats, ${focusParty.partyShortName} highlighted`
              : `House of Representatives seating, ${chamberCap} ${modeLabel} seats`
          }
        >
          <defs>
            <filter id="parliament-seat-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="0" stdDeviation="0.25" floodOpacity="0.12" />
            </filter>
          </defs>
          {showMajorityGuide ? (
            <text
              x={cx}
              y={16}
              textAnchor="middle"
              fill="#888"
              fontSize={11}
              fontWeight={600}
              fontFamily="var(--font-display, ui-sans-serif, system-ui)"
              pointerEvents="none"
            >
              Majority {majorityThreshold}
            </text>
          ) : null}
          {showMajorityGuide ? (
            <line
              x1={cx}
              y1={cy - rMax - 6}
              x2={cx}
              y2={cy + 4}
              stroke="rgba(255,255,255,0.28)"
              strokeWidth={1}
              strokeDasharray="4 3"
              pointerEvents="none"
            />
          ) : null}
          <path
            d={guidePath}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
          />
          <g filter="url(#parliament-seat-glow)">
            {positions.map((pos, i) => {
              const tile = tiles[i];
              if (!tile) return null;
              const muted =
                Boolean(effectiveFocusId) &&
                tile.partyId !== "__uncounted__" &&
                tile.partyId !== effectiveFocusId;
              return (
                <g key={`chair-${i}`} transform={`translate(${pos.x} ${pos.y})`}>
                  <ParliamentChairIcon
                    fill={tile.color}
                    dimmed={tile.leading}
                    muted={muted}
                  />
                </g>
              );
            })}
          </g>
          <g>
            {positions.map((pos, i) => {
              const tile = tiles[i];
              if (!tile) return null;
              return (
                <Tooltip key={`tip-${i}`}>
                  <TooltipTrigger asChild>
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="6.5"
                      fill="transparent"
                      className="cursor-default outline-none"
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    {tile.party}
                    {tile.leading ? " (leading)" : ""}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </g>
          <text
            x={cx}
            y={viewH - 12}
            textAnchor="middle"
            fill="#a8a8a8"
            fontSize={13}
            fontWeight={600}
            fontFamily="var(--font-display, ui-sans-serif, system-ui)"
            className="tabular-nums"
            pointerEvents="none"
          >
            {highlightActive && focusParty
              ? `${chamberCap} ${modeLabel} seats · ${focusParty.partyShortName}`
              : `${chamberCap} ${modeLabel} seats`}
          </text>
        </svg>

        {mergedSummary && barSegments.length > 0 ? (
          <div
            className="flex h-2.5 w-full min-w-0 overflow-hidden rounded-sm bg-white/[0.06]"
            role="group"
            aria-label="Seat share by party"
          >
            {barSegments.map(({ p, n }) => {
              const pctOfChamber =
                chamberCap > 0 ? ((n / chamberCap) * 100).toFixed(1) : "0.0";
              const barMuted =
                Boolean(effectiveFocusId) && p.partyId !== effectiveFocusId;
              return (
                <Tooltip key={p.partyId}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "min-h-full min-w-0 shrink cursor-default outline-none transition-opacity duration-200",
                        barMuted && "opacity-[0.28]"
                      )}
                      style={{
                        flex: `${n} 1 0%`,
                        backgroundColor: p.partyColor,
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="font-sans text-[13px] leading-snug">
                      <span className="font-semibold text-[#e5e5e5]">
                        {p.partyShortName}
                      </span>
                      <span className="block text-[12px] text-[#a1a1aa] tabular-nums">
                        {n} {modeLabel} seats · {pctOfChamber}% of {chamberCap}
                      </span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
            {barRemainder > 0 ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="min-h-full min-w-0 shrink cursor-default bg-[#2a2a3e] outline-none"
                    style={{ flex: `${barRemainder} 1 0%` }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <span className="font-sans text-[13px] text-[#a1a1aa]">
                    Uncounted / remaining · {barRemainder} of {chamberCap}
                  </span>
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        ) : null}

        {mergedSummary ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-2 font-sans text-[11px] text-[#888]">
            <span>
              Declared:{" "}
              <span className="tabular-nums text-[#ccc]">
                {tiles.filter((t) => t.partyId !== "__uncounted__").length}/
                {chamberCap}
              </span>
            </span>
            <span>
              Majority:{" "}
              <span className="tabular-nums text-[#ccc]">
                {majorityThreshold}
              </span>
            </span>
            <span>
              Parties:{" "}
              <span className="tabular-nums text-[#ccc]">
                {mergedSummary.partyResults.filter((p) => partySeatsForHorMode(p, mode) > 0)
                  .length}
              </span>
            </span>
          </div>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
