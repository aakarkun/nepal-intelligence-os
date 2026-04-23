"use client";

import { useEffect } from "react";
import { DashboardPageHeader } from "@/components/layout/dashboard-page-header";
import { discoverShellClass } from "@/components/discover/discover-rail-tokens";
import { cn } from "@/lib/utils";

export default function PratipakchyaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      className={cn(
        "-mx-4 min-h-full bg-transparent px-4 pb-10 text-[#e5e5e5] antialiased",
        "md:-mx-6 md:px-6"
      )}
      role="alert"
    >
      <DashboardPageHeader
        title="Pratipakchya"
        description={<span>Could not load this page.</span>}
      />
      <div className={cn(discoverShellClass, "mt-4 px-4 py-6")}>
        <p className="font-sans text-[14px] text-[#ccc]">
          {error.message || "Something went wrong while loading Pratipakchya data."}
        </p>
        <button
          type="button"
          onClick={reset}
          className={cn(
            "mt-4 rounded-md border border-white/15 bg-white/[0.06] px-3 py-2",
            "font-sans text-[13px] text-[#e5e5e5] outline-none",
            "hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/25"
          )}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
