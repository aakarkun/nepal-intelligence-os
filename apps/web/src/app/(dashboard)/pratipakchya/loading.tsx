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

export default function PratipakchyaLoading() {
  return (
    <div
      className={cn(
        "-mx-4 min-h-full bg-transparent px-4 pb-10 text-[#e5e5e5] antialiased",
        "md:-mx-6 md:px-6"
      )}
    >
      <DashboardPageHeader
        title="Pratipakchya"
        description={<span>Loading promises…</span>}
      />
      <div className="mt-4 space-y-4">
        <div className={discoverShellClass}>
          <div className="px-2 pb-3 pt-2">
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonBlock key={i} className="h-[72px] min-w-[150px] flex-1" />
              ))}
            </div>
            <SkeletonBlock className="mt-2 h-4 w-full max-w-md" />
          </div>
        </div>
        <div className={discoverShellClass}>
          <div className="px-2 pb-4 pt-2">
            <SkeletonBlock className="mb-3 h-9 w-full" />
            <SkeletonBlock className="h-[220px] w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
