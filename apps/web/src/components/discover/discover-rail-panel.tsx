"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FlatRailPanelHeader } from "@/components/layout/intel-rail";
import {
  discoverShellClass,
  discoverInnerCardClass,
} from "@/components/discover/discover-rail-tokens";

export {
  discoverShellClass,
  discoverInnerCardClass,
  discoverInnerWellClass,
} from "@/components/discover/discover-rail-tokens";

/** @deprecated Use {@link discoverShellClass} */
export const discoverFlatCardClass = discoverShellClass;

/**
 * Optional micro-tint (e.g. party tiles) — opacity only, no border.
 * @deprecated Prefer explicit `bg-white/[0.05]` at call sites when adding new UI.
 */
export const discoverSidebarSurface = "bg-white/[0.05]";

/** Footer link row under stacked content — divider only. */
export const discoverSidebarFooterStrip =
  "border-t border-white/[0.06] px-0 pt-2.5 mt-2";

interface DiscoverRailPanelProps {
  title: string;
  leadingDotClass?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

/**
 * Bordered transparent shell + transparent title row + single inner card with tint.
 */
export function DiscoverRailPanel({
  title,
  leadingDotClass,
  right,
  children,
  className,
  bodyClassName,
}: DiscoverRailPanelProps) {
  return (
    <div className={cn(discoverShellClass, className)}>
      <FlatRailPanelHeader
        title={title}
        leadingDotClass={leadingDotClass}
        right={right}
      />
      <div className={cn(discoverInnerCardClass, bodyClassName)}>{children}</div>
    </div>
  );
}
