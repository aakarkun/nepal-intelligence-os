import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared page hero title — Discover / Economy / module pages. */
export const dashboardPageTitleClass =
  "font-sans text-lg uppercase tracking-[0.14em] text-[#e5e5e5] sm:text-xl sm:tracking-[0.2em]";

/** Shared muted subtitle under the title. */
export const dashboardPageDescriptionClass =
  "mt-1 font-sans text-[13px] uppercase tracking-wider text-[#888]";

type DashboardPageHeaderProps = {
  title: string;
  description: ReactNode;
  /** Optional right column (e.g. live indicator, toolbar). */
  right?: ReactNode;
  className?: string;
};

/**
 * Standard dashboard page title + description (border strip under hero).
 * Typography matches Discover and Economy; slightly larger than legacy `text-lg` / `12px`.
 */
export function DashboardPageHeader({
  title,
  description,
  right,
  className,
}: DashboardPageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-b border-white/10 pb-4 pt-2 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className={dashboardPageTitleClass}>{title}</h1>
        <p className={dashboardPageDescriptionClass}>{description}</p>
      </div>
      {right ? <div className="flex shrink-0 flex-wrap items-center gap-2">{right}</div> : null}
    </div>
  );
}
