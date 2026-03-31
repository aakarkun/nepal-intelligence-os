import { DashboardPageHeader } from "@/components/layout/dashboard-page-header";
import {
  FlatRailPanelHeader,
  railRowFlat,
} from "@/components/layout/intel-rail";
import { PratipakchyaPromisesTable } from "@/components/pratipakchya/promises-table";
import { discoverShellClass } from "@/components/discover/discover-rail-tokens";
import { getPratipakchyaPromises } from "@/lib/pratipakchya-promises";
import { normalizePratipakchyaPromiseStatus } from "@/lib/pratipakchya-shared";
import { cn } from "@/lib/utils";

function summarize(data: { status: string; progress: number }[]) {
  let completed = 0;
  let inProgress = 0;
  let notStarted = 0;
  let sum = 0;
  for (const p of data) {
    const s = normalizePratipakchyaPromiseStatus(p.status);
    if (s === "completed") completed++;
    else if (s === "in-progress") inProgress++;
    else notStarted++;
    sum += Number.isFinite(p.progress) ? p.progress : 0;
  }
  const avg = data.length ? Math.round(sum / data.length) : 0;
  return { completed, inProgress, notStarted, avg };
}

const metricTile = "rounded-xl bg-white/[0.05] p-3";

export default async function PratipakchyaPage() {
  const promises = await getPratipakchyaPromises();
  const stats = summarize(promises);

  return (
    <div
      className={cn(
        "-mx-4 min-h-full bg-transparent px-4 pb-10 text-[#e5e5e5] antialiased",
        "md:-mx-6 md:px-6"
      )}
    >
      <DashboardPageHeader
        title="Pratipakchya"
        description={
          <span>
            Government commitments tracker (list + detail, with status/progress and evidence).
          </span>
        }
      />

      <div className="mt-4 space-y-4">
        <div className={discoverShellClass}>
          <FlatRailPanelHeader title="Overview" leadingDotClass="bg-violet-500" />
          <div className="min-w-0 px-2 pb-2">
            <div className="flex flex-wrap gap-2">
              <div className={cn(metricTile, "min-w-[150px] flex-1")}>
                <div className="mb-1 font-sans text-[12px] uppercase tracking-wider text-[#888]">
                  Total
                </div>
                <div className="font-sans text-[22px] tabular-nums text-[#e5e5e5]">
                  {promises.length}
                </div>
              </div>
              <div className={cn(metricTile, "min-w-[150px] flex-1")}>
                <div className="mb-1 font-sans text-[12px] uppercase tracking-wider text-[#888]">
                  In progress
                </div>
                <div className="font-sans text-[22px] tabular-nums text-[#e5e5e5]">
                  {stats.inProgress}
                </div>
              </div>
              <div className={cn(metricTile, "min-w-[150px] flex-1")}>
                <div className="mb-1 font-sans text-[12px] uppercase tracking-wider text-[#888]">
                  Completed
                </div>
                <div className="font-sans text-[22px] tabular-nums text-[#e5e5e5]">
                  {stats.completed}
                </div>
              </div>
              <div className={cn(metricTile, "min-w-[150px] flex-1")}>
                <div className="mb-1 font-sans text-[12px] uppercase tracking-wider text-[#888]">
                  Avg progress
                </div>
                <div className="font-sans text-[22px] tabular-nums text-[#e5e5e5]">
                  {stats.avg}%
                </div>
              </div>
            </div>
            <div className={cn(railRowFlat, "mt-2 rounded-lg")}>
              <p className="font-sans text-[12px] uppercase text-[#555]">
                Data source: `data/pratipakchya/promises.json`
              </p>
            </div>
          </div>
        </div>

        <div className={discoverShellClass}>
          <FlatRailPanelHeader title="Promises" leadingDotClass="bg-pink-500" />
          <div className="min-w-0">
            <PratipakchyaPromisesTable data={promises} />
          </div>
        </div>
      </div>
    </div>
  );
}

