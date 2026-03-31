"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "@/components/icons";
import { PromiseProgress } from "@/components/pratipakchya/promise-progress";
import { PromiseStatusBadge } from "@/components/pratipakchya/promise-badge";
import type { PratipakchyaPromise } from "@/lib/pratipakchya-shared";
import { cn } from "@/lib/utils";

const rowCellBg =
  "bg-white/[0.03] transition-colors duration-150 group-hover:bg-white/[0.08]";

export function PratipakchyaPromisesTable({ data }: { data: PratipakchyaPromise[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of data) {
      if (!seen.has(p.category)) seen.set(p.category, p.categoryEn);
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (!q) return true;
      const haystack = `${p.id} ${p.titleEn} ${p.titleNe} ${p.categoryEn} ${p.categoryNe} ${p.status}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [data, query, category]);

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-2 border-b border-white/[0.06] px-2 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Search className="h-3 w-3 shrink-0 text-[#555]" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="FILTER PROMISES..."
            className="min-w-0 flex-1 border-none bg-transparent py-1.5 pl-0 font-sans text-[13px] text-[#ccc] placeholder:text-[#555] focus:outline-none focus:ring-0"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <label className="font-sans text-[11px] uppercase tracking-wider text-[#555]">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={cn(
              "h-8 rounded-md border border-white/10 bg-white/[0.03] px-2",
              "font-sans text-[12px] text-[#ccc] outline-none",
              "focus:border-white/20"
            )}
            aria-label="Filter by category"
          >
            <option value="all">All</option>
            {categories.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-b-lg">
        <table className="w-full border-separate border-spacing-0 text-left">
          <thead className="bg-white/[0.04]">
            <tr className="border-b border-white/[0.06]">
              {["ID", "Title", "Status", "Progress", "Deadline", "Updated"].map((h, i, arr) => (
                <th
                  key={h}
                  className={cn(
                    "px-3 py-2 font-sans text-[11px] font-normal uppercase tracking-wider text-[#a1a1aa]",
                    i === arr.length - 1 && "text-right"
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, idx) => {
              const first = idx === 0;
              const last = idx === filtered.length - 1;
              return (
                <tr key={p.id} className="group">
                  <td
                    className={cn(
                      "w-16 px-3 py-2 font-mono text-[12px] text-[#888]",
                      rowCellBg,
                      first && "rounded-tl-xl",
                      last && "rounded-bl-xl"
                    )}
                  >
                    {p.id}
                  </td>
                  <td className={cn("min-w-0 px-3 py-2", rowCellBg)}>
                    <Link
                      href={`/pratipakchya/${p.id}`}
                      className="block min-w-0 outline-none"
                    >
                      <div className="truncate font-sans text-[13px] text-[#e5e5e5]">
                        {p.titleEn}
                      </div>
                      <div className="mt-0.5 truncate font-sans text-[11px] text-[#555]">
                        {p.categoryEn}
                      </div>
                    </Link>
                  </td>
                  <td className={cn("px-3 py-2", rowCellBg)}>
                    <PromiseStatusBadge status={p.status} />
                  </td>
                  <td className={cn("px-3 py-2", rowCellBg)}>
                    <PromiseProgress value={p.progress} />
                  </td>
                  <td className={cn("px-3 py-2 font-sans text-[12px] text-[#888]", rowCellBg)}>
                    {p.deadlineDate || "—"}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2 text-right font-sans text-[12px] text-[#555]",
                      rowCellBg,
                      first && "rounded-tr-xl",
                      last && "rounded-br-xl"
                    )}
                  >
                    {p.lastUpdated || "—"}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="rounded-b-xl px-3 py-8 text-center font-sans text-[13px] text-[#555]"
                >
                  NO PROMISES MATCHING FILTER
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

