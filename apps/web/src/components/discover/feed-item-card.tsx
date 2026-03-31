"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Info,
  Database,
  AlertTriangle,
  StickyNote,
  Newspaper,
  Landmark,
  Shield,
  TrendingUp,
  Mountain,
  Globe,
  Heart,
  Loader2,
  MoreHorizontal,
  Share2,
  Pin,
  ExternalLink,
} from "@/components/icons";
import { cn, timeAgo } from "@/lib/utils";
import type { SignalEventType } from "@repo/shared";
import type { FeedItem } from "@/hooks/use-discover-feed";
import { useReaction } from "@/hooks/use-reaction";
import { createWatchlistItem } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  NepalIntelligenceGradientSurface,
} from "@/components/discover/nepal-intelligence-gradient-surface";
import { accentIconPlateBackground } from "@/lib/accent-gradient";

const typeConfig: Record<
  SignalEventType,
  { color: string; icon: typeof Info; label: string }
> = {
  official: { color: "#3b82f6", icon: Info, label: "Official" },
  ingest: { color: "#60a5fa", icon: Database, label: "Ingest" },
  anomaly: { color: "#ef4444", icon: AlertTriangle, label: "Anomaly" },
  note: { color: "#f59e0b", icon: StickyNote, label: "Social" },
  news: { color: "#8b5cf6", icon: Newspaper, label: "News" },
  political: { color: "#60a5fa", icon: Landmark, label: "Political" },
  security: { color: "#2dd4bf", icon: Shield, label: "Security" },
  economic: { color: "#34d399", icon: TrendingUp, label: "Economic" },
  disaster: { color: "#fb923c", icon: Mountain, label: "Disaster" },
  diplomatic: { color: "#a78bfa", icon: Globe, label: "Diplomatic" },
  health: { color: "#f472b6", icon: Heart, label: "Health" },
};

function getTypeConfig(type: string): (typeof typeConfig)[SignalEventType] {
  return typeConfig[type as SignalEventType] ?? typeConfig.news;
}

/** Same luminous stack as `NepalIntelligenceGradientSurface` demo; only layout/grain varies. */
const FEED_GRADIENT_PATTERN: Record<SignalEventType, 0 | 1 | 2> = {
  official: 0,
  ingest: 1,
  anomaly: 2,
  note: 0,
  news: 1,
  political: 2,
  security: 0,
  economic: 1,
  disaster: 2,
  diplomatic: 0,
  health: 1,
};

type MeshStyle = {
  backgroundColor: string;
  backgroundImage: string;
};

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const s = hex.trim();
  if (!s.startsWith("#")) return null;
  const raw = s.slice(1);

  if (raw.length === 3) {
    const r = Number.parseInt(raw[0] + raw[0], 16);
    const g = Number.parseInt(raw[1] + raw[1], 16);
    const b = Number.parseInt(raw[2] + raw[2], 16);
    if ([r, g, b].some((x) => Number.isNaN(x))) return null;
    return { r, g, b };
  }

  if (raw.length === 6) {
    const r = Number.parseInt(raw.slice(0, 2), 16);
    const g = Number.parseInt(raw.slice(2, 4), 16);
    const b = Number.parseInt(raw.slice(4, 6), 16);
    if ([r, g, b].some((x) => Number.isNaN(x))) return null;
    return { r, g, b };
  }

  return null;
}

function mix(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number
) {
  const k = clamp01(t);
  return {
    r: Math.round(a.r * (1 - k) + b.r * k),
    g: Math.round(a.g * (1 - k) + b.g * k),
    b: Math.round(a.b * (1 - k) + b.b * k),
  };
}

function rgba(rgb: { r: number; g: number; b: number }, alpha: number) {
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
}

function hashString(input: string): number {
  // FNV-1a 32-bit
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildGradientMesh(baseHex: string, seedKey: string): MeshStyle {
  const base = hexToRgb(baseHex) ?? { r: 52, g: 211, b: 153 };
  const rand = mulberry32(hashString(seedKey));

  // Bright luminous palette (soft + premium, not neon).
  const cBright = mix(base, { r: 255, g: 255, b: 255 }, 0.82);
  const cMid = mix(base, { r: 255, g: 255, b: 255 }, 0.40);
  const cDeep = mix(base, { r: 0, g: 0, b: 0 }, 0.14);
  const palette = [cBright, cMid, cDeep];

  // Category-based variety (deterministic per seedKey).
  const variantRoll = rand();
  const variant = variantRoll < 0.55 ? 0 : variantRoll < 0.75 ? 1 : variantRoll < 0.9 ? 2 : 3; // biased

  // Off-center bloom to feel “lit from within”.
  const bloomX = 26 + rand() * 48; // 26..74
  const bloomY = 18 + rand() * 44; // 18..62
  const bloom2X = Math.max(10, Math.min(90, bloomX + (rand() * 18 - 9)));
  const bloom2Y = Math.max(10, Math.min(90, bloomY + (rand() * 18 - 9)));

  // Higher-luminance but still soft/premium.
  const baseBgAlpha = 0.06 + rand() * 0.025;

  // Variant 0: “soft luminous field” (large diffused blob lighting)
  // This matches the airy, premium gradient panel feel.
  if (variant === 0) {
    const topBloom = `radial-gradient(circle at ${bloomX.toFixed(1)}% ${bloomY.toFixed(
      1
    )}%, ${rgba(base, 0.30)} 0%, transparent 60%)`;
    const whiteBloom = `radial-gradient(circle at 50% 10%, rgba(255,255,255,0.42) 0%, transparent 60%)`;
    const sideBloomA = `radial-gradient(ellipse at 15% 45%, ${rgba(base, 0.18)} 0%, transparent 72%)`;
    const sideBloomB = `radial-gradient(ellipse at 85% 35%, ${rgba(base, 0.14)} 0%, transparent 76%)`;
    const glaze = `linear-gradient(180deg, ${rgba(base, 0.18)} 0%, rgba(0,0,0,0) 58%)`;
    const edge = `linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.02) 98%)`;

    return {
      backgroundColor: rgba(base, baseBgAlpha),
      backgroundImage: [whiteBloom, topBloom, sideBloomA, sideBloomB, glaze, edge].join(", "),
    };
  }

  const anchors = [
    { x: Math.floor(10 + rand() * 80), y: Math.floor(10 + rand() * 80) },
    { x: Math.floor(10 + rand() * 80), y: Math.floor(10 + rand() * 80) },
    { x: Math.floor(10 + rand() * 80), y: Math.floor(10 + rand() * 80) },
  ];

  const points: string[] = [];
  if (variant === 2) {
    // Floral “petals” mesh (ellipse petals arranged around a ring).
    // This keeps the look decorative but still soft and glassy.
    const petals = 7;
    const start = rand() * 360;
    const radius = 18 + rand() * 16; // ring radius

    for (let i = 0; i < petals; i++) {
      const angle = ((start + (360 / petals) * i) * Math.PI) / 180;
      const px = 50 + Math.cos(angle) * radius;
      const py = 50 + Math.sin(angle) * radius;

      // Ellipse sizes create petal shape (not circular rings).
      const w = 70 + rand() * 12;
      const h = 32 + rand() * 10;

      const alphaBase = 0.125;
      const alpha = alphaBase + rand() * 0.05 - i * 0.002;
      const color = palette[i % palette.length];

      points.push(
        `radial-gradient(ellipse ${w.toFixed(1)}% ${h.toFixed(1)}% at ${px.toFixed(
          1
        )}% ${py.toFixed(
          1
        )}%, ${rgba(color, Math.max(0, alpha))} 0%, transparent 70%)`
      );
    }
  } else {
    // `variant` is 1 | 3 here (0 and 2 handled above).
    const count = variant === 1 ? 10 : 9;
    for (let i = 0; i < count; i++) {
      const a = anchors[i % anchors.length];
      const ax = i < 3 ? a.x : 10 + rand() * 80;
      const ay = i < 3 ? a.y : 10 + rand() * 80;

      const w = 44 + rand() * 48; // ellipse width %
      const h = 20 + rand() * 36; // ellipse height %

      // Keep point alpha gentle so texture doesn't “snap” into focus.
      const alphaBase = variant === 3 ? 0.135 : 0.125;
      const alpha = Math.max(0, alphaBase + rand() * 0.03 - i * 0.004);

      const color = palette[(i + (variant % 2)) % palette.length];
      points.push(
        `radial-gradient(ellipse ${w.toFixed(1)}% ${h.toFixed(1)}% at ${ax.toFixed(
          1
        )}% ${ay.toFixed(
          1
        )}%, ${rgba(color, alpha)} 0%, transparent 68%)`
      );
    }
  }

  const whiteBloom = `radial-gradient(circle at ${bloomX.toFixed(1)}% ${bloomY.toFixed(
    1
  )}%, rgba(255,255,255,0.42) 0%, transparent 64%)`;
  const coloredBloom = `radial-gradient(circle at ${bloom2X.toFixed(1)}% ${bloom2Y.toFixed(
    1
  )}%, ${rgba(base, 0.22)} 0%, transparent 66%)`;

  const glint = `linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 55%)`;
  const edge = `linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.02) 98%)`;

  return {
    backgroundColor: rgba(base, baseBgAlpha),
    backgroundImage: [whiteBloom, coloredBloom, glint, ...points, edge].join(", "),
  };
}

function LikeButton({
  liked,
  count,
  loading,
  onToggle,
  size,
}: {
  liked: boolean;
  count: number;
  loading: boolean;
  onToggle: () => void;
  size: "sm" | "xs";
}) {
  const [animating, setAnimating] = useState(false);
  const iconSize = size === "sm" ? "h-4 w-4" : "h-3.5 w-3.5";
  const textSize = size === "sm" ? "text-xs" : "text-[12px]";

  const handleClick = () => {
    if (loading) return;
    if (!liked) setAnimating(true);
    onToggle();
    if (!liked) setTimeout(() => setAnimating(false), 150);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-1 rounded-full px-2 py-1 transition-transform duration-150 hover:bg-white/[0.06] disabled:opacity-50"
      style={{ transform: animating ? "scale(1.3)" : "scale(1)" }}
      aria-label={liked ? "Unlike" : "Like"}
    >
      {loading ? (
        <Loader2 className={cn(iconSize, "animate-spin text-[#555]")} />
      ) : (
        <Heart
          className={cn(
            iconSize,
            liked ? "fill-emerald-400/90 text-emerald-400" : "text-[#888]"
          )}
        />
      )}
      <span className={cn(textSize, "tabular-nums", liked ? "text-[#e5e5e5]" : "text-[#888]")}>
        {count}
      </span>
    </button>
  );
}

function MoreMenu({
  onShare,
  onWatch,
  url,
  triggerClassName,
  iconClassName,
}: {
  onShare: () => void;
  onWatch: () => void;
  url?: string;
  triggerClassName?: string;
  iconClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "text-[#888] hover:bg-white/[0.06] hover:text-[#e5e5e5]",
          triggerClassName
        )}
        aria-label="More"
        onClick={() => setOpen((o) => !o)}
      >
        <MoreHorizontal className={iconClassName} />
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] overflow-hidden rounded-xl border border-white/[0.08] bg-surface-page p-1 shadow-xl shadow-black/50">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-none px-4 py-2 text-left text-sm text-[#ccc] transition-colors hover:rounded-xl hover:bg-white/[0.06]"
            onClick={() => {
              onShare();
              setOpen(false);
            }}
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-none px-4 py-2 text-left text-sm text-[#ccc] transition-colors hover:rounded-xl hover:bg-white/[0.06]"
            onClick={() => {
              onWatch();
              setOpen(false);
            }}
          >
            <Pin className="h-3.5 w-3.5" />
            Watch
          </button>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center gap-2 rounded-none px-4 py-2 text-left text-sm text-[#ccc] transition-colors hover:rounded-xl hover:bg-white/[0.06]"
              onClick={() => setOpen(false)}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open source
            </a>
          )}
        </div>
      )}
    </div>
  );
}

interface FeedItemCardBaseProps {
  item: FeedItem;
  variant: "hero" | "grid";
  onShare?: (item: FeedItem) => void;
  onWatch?: (item: FeedItem) => void;
  reactionInitial?: { count: number; liked: boolean };
  onEmailPrompt?: () => void;
  /** Called after like/unlike so parent can refetch batch (keeps likes in sync after reload). */
  onReactionChange?: () => void;
}

export function FeedItemCard({
  item,
  variant,
  onShare,
  onWatch,
  reactionInitial,
  onEmailPrompt,
  onReactionChange,
}: FeedItemCardBaseProps) {
  const config = getTypeConfig(item.type);
  const gradientPattern =
    FEED_GRADIENT_PATTERN[item.type as SignalEventType] ?? 0;
  const { count, liked, loading, toggle, setFromBatch } = useReaction(item.id, item.title, {
    initial: reactionInitial,
    onEmailPrompt,
    onReactionChange,
  });

  // Sync from batch when it arrives (e.g. after reload) so likes/count persist
  useEffect(() => {
    if (reactionInitial == null) return;
    setFromBatch(reactionInitial);
  }, [reactionInitial, setFromBatch]);

  const handleShare = useCallback(() => {
    if (onShare) onShare(item);
    else if (typeof window !== "undefined") {
      try {
        if (navigator.share && item.title) {
          navigator.share({
            title: item.title,
            text: item.summary ?? item.title,
            url: item.url ?? window.location.href,
          });
        }
      } catch {
        // toast "Sharing coming soon" per spec
        const toast = (window as unknown as { toast?: { info: (s: string) => void } }).toast;
        if (toast?.info) toast.info("Sharing coming soon");
      }
    }
  }, [item, onShare]);

  const handleWatch = useCallback(async () => {
    if (onWatch) {
      onWatch(item);
      return;
    }
    const keyword = item.title.split(/\s+/).slice(0, 5).join(" ");
    try {
      await createWatchlistItem({
        label: item.title.slice(0, 60),
        type: "keyword",
        value: keyword,
        active: true,
      });
      const toast = (window as unknown as { toast?: { success: (s: string) => void } }).toast;
      if (toast?.success) toast.success("Added to watchlist");
    } catch {
      const toast = (window as unknown as { toast?: { error: (s: string) => void } }).toast;
      if (toast?.error) toast.error("Failed to add to watchlist");
    }
  }, [item, onWatch]);

  if (variant === "hero") {
    return (
      <article
        className={cn(
          "group flex flex-col gap-4 rounded-xl px-5 pt-4 pb-5 transition-colors duration-150 hover:bg-white/[0.02] sm:flex-row sm:gap-6 sm:px-6 sm:pt-5 sm:pb-6"
        )}
      >
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="font-sans text-lg font-semibold leading-tight tracking-tight text-[#e5e5e5] sm:text-xl">
            {item.title}
          </h2>
          <p className="font-sans text-[12px] uppercase tracking-wider text-[#888]">
            {item.source} · {timeAgo(item.publishedAt)}
          </p>
          {item.summary && (
            <p className="line-clamp-3 text-sm leading-relaxed text-[#a1a1aa]">{item.summary}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {item.sourceCount != null && item.sourceCount > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-1.5 py-0.5 font-sans text-[11px] font-medium uppercase tracking-wide"
                style={{
                  color: config.color,
                }}
              >
                {item.sourceCount} source{item.sourceCount !== 1 ? "s" : ""}
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <LikeButton
                liked={liked}
                count={count}
                loading={loading}
                onToggle={toggle}
                size="sm"
              />
              <MoreMenu
                onShare={handleShare}
                onWatch={handleWatch}
                url={item.url}
                triggerClassName="h-8 w-8"
                iconClassName="h-4 w-4"
              />
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 sm:w-48">
          <div className="relative h-36 w-full overflow-hidden rounded-lg sm:h-40 sm:w-48">
            <NepalIntelligenceGradientSurface
              accentHex={config.color}
              pattern={gradientPattern}
              mode="demo"
              className="absolute inset-0"
            />

            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt=""
                className="relative z-10 h-full w-full object-cover opacity-92 transition-opacity group-hover:opacity-97"
              />
            ) : (
              <div className="relative z-10 flex h-full w-full items-center justify-center">
                <div
                  className="inline-flex items-center justify-center rounded-full p-3 sm:p-3.5"
                  style={{
                    backgroundColor: accentIconPlateBackground(config.color),
                  }}
                >
                  <config.icon
                    className="h-7 w-7 sm:h-8 sm:w-8"
                    style={{ color: config.color }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl transition-colors duration-150 hover:bg-white/[0.02]">
      <div
        className="relative h-32 w-full flex-shrink-0 overflow-hidden rounded-lg"
        aria-hidden
      >
        <NepalIntelligenceGradientSurface
          accentHex={config.color}
          pattern={gradientPattern}
          mode="demo"
          className="absolute inset-0"
        />

        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt=""
            className="relative z-10 h-full w-full object-cover opacity-92 transition-opacity group-hover:opacity-97"
          />
        ) : (
          <div className="relative z-10 flex h-full w-full items-center justify-center">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full"
              style={{
                backgroundColor: accentIconPlateBackground(config.color),
              }}
            >
              <config.icon
                className="h-6 w-6"
                style={{ color: config.color }}
              />
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-4 pt-3 pb-4">
        <h3
          className="line-clamp-2 text-[15px] font-medium leading-snug text-[#e5e5e5]"
          title={item.title}
        >
          {item.title}
        </h3>
        <p className="font-sans text-[11px] uppercase tracking-wider text-[#666]">
          {item.source} · {timeAgo(item.publishedAt)}
        </p>
        {item.sourceCount != null && item.sourceCount > 1 && (
          <span
            className="inline-flex items-center rounded-full bg-white/[0.06] px-1.5 py-0.5 font-sans text-[11px] font-medium uppercase tracking-wide"
            style={{ color: config.color }}
          >
            {item.sourceCount} sources
          </span>
        )}
        <div className="mt-1 flex items-center gap-1">
          <LikeButton
            liked={liked}
            count={count}
            loading={loading}
            onToggle={toggle}
            size="xs"
          />
          <MoreMenu
            onShare={handleShare}
            onWatch={handleWatch}
            url={item.url}
            triggerClassName="h-7 w-7"
            iconClassName="h-3.5 w-3.5"
          />
        </div>
      </div>
    </article>
  );
}
