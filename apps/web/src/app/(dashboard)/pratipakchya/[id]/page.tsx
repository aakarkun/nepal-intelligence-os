import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "@/components/icons";
import { DashboardPageHeader } from "@/components/layout/dashboard-page-header";
import { FlatRailPanelHeader, railRowFlat } from "@/components/layout/intel-rail";
import { PromiseProgress } from "@/components/pratipakchya/promise-progress";
import { PromiseStatusBadge } from "@/components/pratipakchya/promise-badge";
import { discoverShellClass } from "@/components/discover/discover-rail-tokens";
import { getPratipakchyaPromiseById } from "@/lib/pratipakchya-promises";
import { cn } from "@/lib/utils";

export default async function PratipakchyaPromiseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const num = Number(id);
  if (!Number.isFinite(num)) notFound();

  const promise = await getPratipakchyaPromiseById(num);
  if (!promise) notFound();

  return (
    <div
      className={cn(
        "-mx-4 min-h-full bg-transparent px-4 pb-10 text-[#e5e5e5] antialiased",
        "md:-mx-6 md:px-6"
      )}
    >
      <div className="pt-2">
        <Link
          href="/pratipakchya"
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-2 py-1 font-sans text-[12px] uppercase tracking-wider",
            "text-[#888] hover:bg-white/5 hover:text-[#e5e5e5]",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          )}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Back
        </Link>
      </div>

      <DashboardPageHeader
        title={`Promise #${promise.id}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="text-[#888]">{promise.categoryEn}</span>
            <span className="text-[#555]">·</span>
            <PromiseStatusBadge status={promise.status} />
          </span>
        }
        right={<PromiseProgress value={promise.progress} className="justify-end" />}
      />

      <div className="mt-4 space-y-4">
        <div className={discoverShellClass}>
          <FlatRailPanelHeader title="Titles" leadingDotClass="bg-violet-500" />
          <div className="min-w-0 px-2 pb-2">
            <div className={cn(railRowFlat, "rounded-t-lg")}>
              <div className="font-sans text-[11px] uppercase tracking-wider text-[#555]">
                English
              </div>
              <div className="mt-1 font-sans text-[14px] leading-snug text-[#e5e5e5]">
                {promise.titleEn}
              </div>
            </div>
            <div className={cn(railRowFlat, "rounded-b-lg border-t border-white/[0.06]")}>
              <div className="font-sans text-[11px] uppercase tracking-wider text-[#555]">
                नेपाली
              </div>
              <div className="mt-1 font-sans text-[14px] leading-snug text-[#e5e5e5]">
                {promise.titleNe}
              </div>
            </div>
          </div>
        </div>

        <div className={discoverShellClass}>
          <FlatRailPanelHeader title="Metadata" leadingDotClass="bg-pink-500" />
          <div className="min-w-0 px-2 pb-2">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {[
                { k: "Category", v: promise.categoryEn },
                { k: "Deadline", v: promise.deadlineDate || promise.deadline || "—" },
                { k: "Last updated", v: promise.lastUpdated || "—" },
              ].map((row) => (
                <div key={row.k} className="rounded-xl bg-white/[0.05] p-3">
                  <div className="font-sans text-[11px] uppercase tracking-wider text-[#888]">
                    {row.k}
                  </div>
                  <div className="mt-1 font-sans text-[13px] text-[#e5e5e5]">{row.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={discoverShellClass}>
          <FlatRailPanelHeader title="Evidence" leadingDotClass="bg-amber-500" />
          <div className="min-w-0 px-2 pb-2">
            <div className={cn(railRowFlat, "rounded-lg")}>
              <p className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-[#ccc]">
                {promise.evidence?.trim() ? promise.evidence : "—"}
              </p>
            </div>
          </div>
        </div>

        <div className={discoverShellClass}>
          <FlatRailPanelHeader title="Notes" leadingDotClass="bg-cyan-500" />
          <div className="min-w-0 px-2 pb-2">
            <div className={cn(railRowFlat, "rounded-lg")}>
              <p className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-[#ccc]">
                {promise.notes?.trim() ? promise.notes : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

