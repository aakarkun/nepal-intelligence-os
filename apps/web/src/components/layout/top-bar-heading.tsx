"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getRouteHeader } from "@/lib/route-header";
import { useShellHeader } from "@/components/layout/shell-header-context";
import { cn } from "@/lib/utils";

export function TopBarHeading() {
  const pathname = usePathname();
  const { override } = useShellHeader();
  const header = override ?? getRouteHeader(pathname);

  if (header.mode === "breadcrumb") {
    return (
      <nav
        className="min-w-0 flex-1"
        aria-label="Breadcrumb"
      >
        <ol className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 font-sans text-[12px] sm:text-[13px]">
          {header.items.map((item, i) => (
            <li key={`${item.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
              {i > 0 ? (
                <span className="shrink-0 text-[#555]" aria-hidden>
                  ›
                </span>
              ) : null}
              {item.href ? (
                <Link
                  href={item.href}
                  className="truncate text-[#888] transition-colors hover:text-[#ccc]"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={cn("truncate", i === header.items.length - 1 ? "text-[#e5e5e5]" : "text-[#a1a1a1]")}>
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <h1 className="shrink-0 truncate font-sans text-[13px] font-normal uppercase tracking-[0.18em] text-[#e5e5e5] sm:text-sm">
        {header.title}
      </h1>
      {header.description ? (
        <>
          <span className="shrink-0 text-[#555]" aria-hidden>
            ·
          </span>
          <span className="min-w-0 truncate font-sans text-[10px] uppercase tracking-wider text-[#888] sm:text-[11px]">
            {header.description}
          </span>
        </>
      ) : null}
    </div>
  );
}
