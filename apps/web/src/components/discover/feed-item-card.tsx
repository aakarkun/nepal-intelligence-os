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
} from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import type { SignalEventType } from "@repo/shared";
import type { FeedItem } from "@/hooks/use-discover-feed";
import { useReaction } from "@/hooks/use-reaction";
import { createWatchlistItem } from "@/lib/api";
import { Button } from "@/components/ui/button";

const typeConfig: Record<
  SignalEventType,
  { color: string; icon: typeof Info; label: string }
> = {
  official: { color: "#3b82f6", icon: Info, label: "Official" },
  ingest: { color: "#6b7280", icon: Database, label: "Ingest" },
  anomaly: { color: "#ef4444", icon: AlertTriangle, label: "Anomaly" },
  note: { color: "#f59e0b", icon: StickyNote, label: "Social" },
  news: { color: "#94a3b8", icon: Newspaper, label: "News" },
  political: { color: "#60a5fa", icon: Landmark, label: "Political" },
  security: { color: "#f87171", icon: Shield, label: "Security" },
  economic: { color: "#34d399", icon: TrendingUp, label: "Economic" },
  disaster: { color: "#fb923c", icon: Mountain, label: "Disaster" },
  diplomatic: { color: "#a78bfa", icon: Globe, label: "Diplomatic" },
  health: { color: "#f472b6", icon: Heart, label: "Health" },
};

function getTypeConfig(type: string): (typeof typeConfig)[SignalEventType] {
  return typeConfig[type as SignalEventType] ?? typeConfig.news;
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
  const textSize = size === "sm" ? "text-xs" : "text-[10px]";

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
      className="inline-flex items-center gap-1 rounded p-1 transition-transform duration-150 hover:bg-muted/50 disabled:opacity-50"
      style={{ transform: animating ? "scale(1.3)" : "scale(1)" }}
      aria-label={liked ? "Unlike" : "Like"}
    >
      {loading ? (
        <Loader2 className={cn(iconSize, "animate-spin text-muted-foreground")} />
      ) : (
        <Heart
          className={cn(iconSize, liked ? "fill-nepal-red text-nepal-red" : "text-muted-foreground")}
        />
      )}
      <span className={cn(textSize, "tabular-nums", liked ? "text-foreground" : "text-muted-foreground")}>
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
        className={triggerClassName}
        aria-label="More"
        onClick={() => setOpen((o) => !o)}
      >
        <MoreHorizontal className={iconClassName} />
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] rounded-md border border-border bg-card py-1 shadow-md">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
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
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
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
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
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
          "flex flex-col gap-4 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm sm:flex-row sm:gap-6 sm:p-5"
        )}
      >
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="font-display text-xl font-bold leading-tight tracking-tight sm:text-2xl">
            {item.title}
          </h2>
          <p className="text-xs text-muted-foreground">
            {item.source} · {timeAgo(item.publishedAt)}
          </p>
          {item.summary && (
            <p className="line-clamp-3 text-sm text-muted-foreground">{item.summary}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {item.sourceCount != null && item.sourceCount > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: `${config.color}20`,
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
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt=""
              className="h-36 w-full rounded-md object-cover sm:h-40 sm:w-48"
            />
          ) : (
            <div
              className="flex h-36 w-full items-center justify-center rounded-md sm:h-40 sm:w-48"
              style={{ backgroundColor: `${config.color}25` }}
            >
              <config.icon className="h-10 w-10" style={{ color: config.color }} />
            </div>
          )}
        </div>
      </article>
    );
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm">
      <div className="relative h-32 w-full flex-shrink-0">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ backgroundColor: `${config.color}25` }}
          >
            <config.icon className="h-8 w-8" style={{ color: config.color }} />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3
          className="line-clamp-2 font-medium leading-tight text-foreground"
          title={item.title}
        >
          {item.title}
        </h3>
        <p className="text-[10px] text-muted-foreground">
          {item.source} · {timeAgo(item.publishedAt)}
        </p>
        {item.sourceCount != null && item.sourceCount > 1 && (
          <span
            className="text-[10px] font-medium"
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
