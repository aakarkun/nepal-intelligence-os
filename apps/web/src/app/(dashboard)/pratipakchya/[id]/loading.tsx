import { DashboardPageHeader } from "@/components/layout/dashboard-page-header";
import { discoverShellClass } from "@/components/discover/discover-rail-tokens";
import { cn } from "@/lib/utils";

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-white/[0.06]", className)}
      aria-hidden
    />
  );
}

export default function PratipakchyaDetailLoading() {
  return (
    <div
      className={cn(
        "-mx-4 min-h-full bg-transparent px-4 pb-10 text-[#e5e5e5] antialiased",
        "md:-mx-6 md:px-6"
      )}
    >
      <div className="pt-2">
        <SkeletonBlock className="h-7 w-24" />
      </div>
      <DashboardPageHeader
        title="Promise"
        description={<span>Loading…</span>}
      />
      <div className="mt-4 space-y-4">
        <div className={discoverShellClass}>
          <div className="space-y-2 px-2 pb-4 pt-2">
            <SkeletonBlock className="h-16 w-full" />
            <SkeletonBlock className="h-16 w-full" />
          </div>
        </div>
        <div className={discoverShellClass}>
          <SkeletonBlock className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}
