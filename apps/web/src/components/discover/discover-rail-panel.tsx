"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  RailPanelHeader,
  railShell,
  railListBody,
  railCardInset,
} from "@/components/layout/intel-rail";

/**
 * Inner surface for Discover sidebar widgets — Intel Rail style: fill only, no outline
 * (same family as {@link railRow} / panel rows).
 */
export const discoverSidebarSurface = "rounded-xl bg-[#181818]/60";

/** Dark footer strip — light vertical padding; body above already has bottom space. */
export const discoverSidebarFooterStrip =
  "rounded-bl-xl rounded-br-xl bg-[#0c0c0c]/80 px-3 py-1";

interface DiscoverRailPanelProps {
  title: string;
  leadingDotClass?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Extra classes on the rail inset wrapper (same as Signal stream: `railCardInset`). */
  bodyClassName?: string;
}

/**
 * Shell + header + list body aligned with the main **Signal stream** panel on Discover
 * (`railShell` → `RailPanelHeader` → `railListBody` → `railCardInset`).
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
    <div className={cn(railShell, className)}>
      <RailPanelHeader title={title} leadingDotClass={leadingDotClass} right={right} />
      <div className={cn(railListBody, "rounded-b-xl")}>
        <div className={cn(railCardInset, "text-[#ccc]", bodyClassName)}>{children}</div>
      </div>
    </div>
  );
}
