"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import type { ConstituencyResult } from "@repo/shared";
import { fetchConstituencies } from "@/lib/api";
import { cn, formatNepalDateTime, formatNumber, timeAgo } from "@/lib/utils";
import { useElectionDatasetStore } from "@/stores/election-dataset-store";
import { Badge } from "@/components/ui/badge";
import { FlatRailPanelHeader } from "@/components/layout/intel-rail";
import { discoverShellClass } from "@/components/discover/discover-rail-tokens";
import { PartyMark } from "@/components/party/party-mark";
import { ArrowUpDown, ChevronDown, ChevronUp, Eye, EyeOff, Search } from "@/components/icons";
import { useRealtimeStore } from "@/stores/realtime-store";

const panelBodyClass = "min-w-0 px-2 pb-2";

type Candidate = ConstituencyResult["candidates"][number];

function getLeader(candidates: Candidate[]): Candidate | undefined {
  if (candidates.length === 0) return undefined;
  return candidates.reduce((a, b) => (b.votes > a.votes ? b : a));
}

function getMargin(candidates: Candidate[]): number {
  if (candidates.length < 2) return candidates[0]?.votes ?? 0;
  const sorted = [...candidates].sort((a, b) => b.votes - a.votes);
  return sorted[0].votes - sorted[1].votes;
}

function marginColor(margin: number): string {
  if (margin > 5000) return "text-emerald-400/90";
  if (margin >= 1000) return "text-amber-400/85";
  return "text-rose-400/85";
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "counting":
      return (
        <span className="rounded px-1.5 py-0.5 font-sans text-[10px] uppercase tracking-wide text-amber-400/90">
          Counting
        </span>
      );
    case "final":
      return (
        <span className="rounded px-1.5 py-0.5 font-sans text-[10px] uppercase tracking-wide text-emerald-400/90">
          Final
        </span>
      );
    case "stale":
      return (
        <span className="rounded px-1.5 py-0.5 font-sans text-[10px] uppercase tracking-wide text-yellow-500/90">
          Stale
        </span>
      );
    case "error":
      return <Badge variant="error">Error</Badge>;
    default:
      return (
        <span className="font-sans text-[10px] uppercase tracking-wide text-[#888]">
          {status}
        </span>
      );
  }
}

const columnHelper = createColumnHelper<ConstituencyResult>();

const FILTER_TABS = [
  { id: "all", label: "All" },
  { id: "closest", label: "Closest" },
  { id: "volatile", label: "Volatile" },
  { id: "stale", label: "Stale" },
] as const;

const columns = (
  isCurrentDataset: boolean,
  watchlist: string[],
  toggleWatchlist: (id: string) => void
) => [
  columnHelper.display({
    id: "watch",
    header: () => <span className="sr-only">Watch</span>,
    cell: ({ row }) => {
      const id = row.original.constituencyId;
      const isWatched = watchlist.includes(id);
      const Icon = isWatched ? EyeOff : Eye;
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleWatchlist(id);
          }}
          className="text-[#888] transition-colors hover:text-[#ccc]"
          title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      );
    },
  }),
  columnHelper.accessor("constituencyName", {
    header: "Constituency",
    cell: (info) => (
      <span className="font-medium text-[#e5e5e5]">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("districtName", {
    header: "District",
    cell: (info) => (
      <span className="text-[#a1a1aa]">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("provinceId", {
    header: "Province",
    cell: (info) => (
      <span className="tabular-nums text-[#a1a1aa]">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor(
    (row) => getLeader(row.candidates)?.candidateName ?? "",
    {
      id: "leadingCandidate",
      header: "Leading Candidate",
      cell: ({ row }) => {
        const leader = getLeader(row.original.candidates);
        if (!leader) return <span className="text-[#666]">—</span>;
        return (
          <div className="flex min-w-0 items-center gap-1.5">
            <PartyMark
              partyId={leader.partyId}
              partyName={leader.partyName}
              partyColor={leader.partyColor}
              size="sm"
            />
            <span className="truncate text-[#e5e5e5]">{leader.candidateName}</span>
          </div>
        );
      },
    }
  ),
  columnHelper.accessor(
    (row) => getLeader(row.candidates)?.partyName ?? "",
    {
      id: "party",
      header: "Party",
      cell: (info) => (
        <span className="text-[#a1a1aa]">{info.getValue() || "—"}</span>
      ),
    }
  ),
  columnHelper.accessor((row) => getMargin(row.candidates), {
    id: "margin",
    header: "Margin",
    cell: (info) => {
      const margin = info.getValue();
      return (
        <span className={cn("tabular-nums", marginColor(margin))}>
          {formatNumber(margin)}
        </span>
      );
    },
  }),
  columnHelper.accessor("totalVotes", {
    header: "Total Votes",
    cell: (info) => (
      <span className="tabular-nums text-[#e5e5e5]">
        {formatNumber(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => <StatusBadge status={info.getValue()} />,
    enableSorting: false,
  }),
  columnHelper.accessor("lastUpdate", {
    header: "Last Update",
    cell: (info) => (
      <span className="tabular-nums text-[#888]">
        {isCurrentDataset ? timeAgo(info.getValue()) : formatNepalDateTime(info.getValue())}
      </span>
    ),
  }),
];

export function ConstituenciesTable() {
  const router = useRouter();
  const { selectedDatasetId, datasets } = useElectionDatasetStore();
  const selectedDataset = datasets.find((dataset) => dataset.id === selectedDatasetId);
  const isCurrentDataset = selectedDataset?.isCurrent ?? true;
  const [activeTab, setActiveTab] = useState<(typeof FILTER_TABS)[number]["id"]>("all");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const watchlist = useRealtimeStore((s) => s.watchlist);
  const addToWatchlist = useRealtimeStore((s) => s.addToWatchlist);
  const removeFromWatchlist = useRealtimeStore((s) => s.removeFromWatchlist);

  const toggleWatchlist = (id: string) => {
    if (watchlist.includes(id)) {
      removeFromWatchlist(id);
    } else {
      addToWatchlist(id);
    }
  };

  const columnDefs = columns(isCurrentDataset, watchlist, toggleWatchlist);
  const columnCount = columnDefs.length;

  const { data: constituencies = [], isLoading, isError } = useQuery({
    queryKey: ["constituencies", selectedDatasetId],
    queryFn: () => fetchConstituencies({ dataset: selectedDatasetId }),
  });

  const filteredData = useMemo(() => {
    switch (activeTab) {
      case "closest":
        return constituencies.filter((c) => getMargin(c.candidates) < 2000);
      case "volatile":
        return constituencies.filter((c) => c.status === "counting");
      case "stale":
        return constituencies.filter((c) => c.status === "stale");
      default:
        return constituencies;
    }
  }, [constituencies, activeTab]);

  const tabCounts = useMemo(
    () => ({
      all: constituencies.length,
      closest: constituencies.filter((c) => getMargin(c.candidates) < 2000).length,
      volatile: constituencies.filter((c) => c.status === "counting").length,
      stale: constituencies.filter((c) => c.status === "stale").length,
    }),
    [constituencies]
  );

  const table = useReactTable({
    data: filteredData,
    columns: columnDefs,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const search = filterValue.toLowerCase();
      return (
        row.original.constituencyName.toLowerCase().includes(search) ||
        row.original.districtName.toLowerCase().includes(search)
      );
    },
  });

  if (isLoading) {
    return (
      <div className={cn(discoverShellClass, "min-w-0")}>
        <FlatRailPanelHeader title="Constituency results" leadingDotClass="bg-emerald-500" />
        <div className={panelBodyClass}>
          <div className="flex h-48 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04]">
            <p className="font-sans text-[12px] text-[#555] animate-pulse">
              Loading constituencies…
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(discoverShellClass, "min-w-0")}>
      <FlatRailPanelHeader
        title="Constituency results"
        leadingDotClass="bg-emerald-500"
        right={
          constituencies.length > 0 ? (
            <span className="font-sans text-[10px] uppercase tracking-wider text-[#666]">
              {table.getRowModel().rows.length} shown
              {globalFilter ? " · filtered" : ""}
            </span>
          ) : null
        }
      />
      <div className={panelBodyClass}>
        <p className="mb-3 font-sans text-[10px] text-[#555]">
          Click a row to open the constituency dossier. Use the watch icon to track a seat in the
          intel rail.
        </p>

        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div
            className="inline-flex items-center gap-0.5 rounded-full border border-white/[0.08] bg-white/[0.04] p-1"
            role="tablist"
            aria-label="Filter constituencies"
          >
            {FILTER_TABS.map(({ id, label }) => {
              const active = activeTab === id;
              const count =
                id === "all"
                  ? tabCounts.all
                  : id === "closest"
                    ? tabCounts.closest
                    : id === "volatile"
                      ? tabCounts.volatile
                      : tabCounts.stale;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    "rounded-full px-2.5 py-1.5 font-sans text-[11px] font-medium uppercase tracking-wide transition-colors",
                    active
                      ? "bg-white/[0.14] text-[#e5e5e5] shadow-sm shadow-black/20"
                      : "text-[#888] hover:bg-white/[0.06] hover:text-[#ccc]"
                  )}
                >
                  {label}{" "}
                  <span className="tabular-nums text-[10px] text-[#666]">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:max-w-[16rem]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#666]" />
            <input
              type="search"
              placeholder="Search name or district…"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="h-9 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] pl-8 pr-3 font-sans text-[12px] text-[#e5e5e5] placeholder:text-[#666] focus:outline-none focus:ring-1 focus:ring-white/20"
            />
          </div>
        </div>

        <div className="min-w-0 overflow-x-auto rounded-lg border border-white/[0.06] bg-white/[0.06]">
          <table className="w-full border-collapse font-sans text-[12px]">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="border-b border-white/[0.06] bg-white/[0.04] text-left text-[11px] uppercase tracking-wide text-[#666]"
                >
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="whitespace-nowrap px-2 py-2 font-medium">
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          className={cn(
                            "inline-flex items-center gap-1",
                            header.column.getCanSort() && "cursor-pointer select-none hover:text-[#a1a1aa]"
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {{
                            asc: <ChevronUp className="h-3 w-3 opacity-70" />,
                            desc: <ChevronDown className="h-3 w-3 opacity-70" />,
                          }[header.column.getIsSorted() as string] ??
                            (header.column.getCanSort() ? (
                              <ArrowUpDown className="h-3 w-3 opacity-35" />
                            ) : null)}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columnCount}
                    className="px-3 py-8 text-center font-sans text-[12px] leading-relaxed text-[#888]"
                  >
                    {isError ? (
                      "Could not load constituency data. Check that the API is running."
                    ) : constituencies.length === 0 ? (
                      <span className="mx-auto block max-w-lg">
                        No per-constituency rows for this dataset. Parliament totals can be loaded
                        without HoR seat-by-seat data—try another snapshot, or ensure the API has
                        seeded or ingested constituency results for this dataset.
                      </span>
                    ) : (
                      "No constituencies match the current tab or search."
                    )}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-b border-white/[0.04] transition-colors last:border-b-0 hover:bg-white/[0.04]"
                    onClick={() =>
                      router.push(`/constituencies/${row.original.constituencyId}`)
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="whitespace-nowrap px-2 py-1.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
