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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PartyMark } from "@/components/party/party-mark";
import { ArrowUpDown, ChevronDown, ChevronUp, Eye, EyeOff, Search } from "@/components/icons";
import { useRealtimeStore } from "@/stores/realtime-store";

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
  if (margin > 5000) return "text-green-500";
  if (margin >= 1000) return "text-yellow-500";
  return "text-red-500";
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "counting":
      return <Badge variant="stale">Counting</Badge>;
    case "final":
      return <Badge variant="final">Final</Badge>;
    case "stale":
      return (
        <Badge
          variant="outline"
          className="border-transparent bg-yellow-500/15 text-yellow-500"
        >
          Stale
        </Badge>
      );
    case "error":
      return <Badge variant="error">Error</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

const columnHelper = createColumnHelper<ConstituencyResult>();

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
          className="text-muted-foreground hover:text-nepal-red transition-colors"
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
      <span className="font-semibold text-foreground">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("districtName", {
    header: "District",
  }),
  columnHelper.accessor("provinceId", {
    header: "Province",
    cell: (info) => <span className="tabular-nums">{info.getValue()}</span>,
  }),
  columnHelper.accessor(
    (row) => getLeader(row.candidates)?.candidateName ?? "",
    {
      id: "leadingCandidate",
      header: "Leading Candidate",
      cell: ({ row }) => {
        const leader = getLeader(row.original.candidates);
        if (!leader) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex items-center gap-1.5">
            <PartyMark
              partyId={leader.partyId}
              partyName={leader.partyName}
              partyColor={leader.partyColor}
              size="sm"
            />
            <span className="truncate">{leader.candidateName}</span>
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
      <span className="tabular-nums">{formatNumber(info.getValue())}</span>
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
      <span className="text-muted-foreground tabular-nums">
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
  const [activeTab, setActiveTab] = useState("all");
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

  const { data: constituencies = [], isLoading } = useQuery({
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
      closest: constituencies.filter((c) => getMargin(c.candidates) < 2000)
        .length,
      volatile: constituencies.filter((c) => c.status === "counting").length,
      stale: constituencies.filter((c) => c.status === "stale").length,
    }),
    [constituencies]
  );

  const table = useReactTable({
    data: filteredData,
    columns: columns(isCurrentDataset, watchlist, toggleWatchlist),
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
      <div className="flex h-64 items-center justify-center md:h-96">
        <p className="text-sm text-muted-foreground animate-pulse px-4 text-center">
          Loading constituencies…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full sm:w-auto justify-start sm:justify-center">
            <TabsTrigger value="all">
              All{" "}
              <span className="ml-1 text-xs text-muted-foreground">
                {tabCounts.all}
              </span>
            </TabsTrigger>
            <TabsTrigger value="closest">
              Closest Races{" "}
              <span className="ml-1 text-xs text-muted-foreground">
                {tabCounts.closest}
              </span>
            </TabsTrigger>
            <TabsTrigger value="volatile">
              Most Volatile{" "}
              <span className="ml-1 text-xs text-muted-foreground">
                {tabCounts.volatile}
              </span>
            </TabsTrigger>
            <TabsTrigger value="stale">
              Stale Feeds{" "}
              <span className="ml-1 text-xs text-muted-foreground">
                {tabCounts.stale}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:ml-auto sm:w-auto">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name or district…"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring sm:w-56"
          />
        </div>
      </div>

      <div className="overflow-auto rounded-md border border-white/5 bg-card/10">
        <table className="min-w-full border-separate border-spacing-0 text-[13px] sm:text-xs">
          <thead className="sticky top-0 z-10 bg-background/85 backdrop-blur">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="whitespace-nowrap border-b border-white/10 px-3 py-2 text-left text-xs font-medium text-muted-foreground"
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        className={cn(
                          "inline-flex items-center gap-1",
                          header.column.getCanSort() &&
                            "cursor-pointer select-none"
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: <ChevronUp className="h-3 w-3" />,
                          desc: <ChevronDown className="h-3 w-3" />,
                        }[header.column.getIsSorted() as string] ??
                          (header.column.getCanSort() ? (
                            <ArrowUpDown className="h-3 w-3 opacity-40" />
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
                  colSpan={columns.length}
                  className="px-3 py-8 text-center text-sm text-muted-foreground"
                >
                  No constituencies found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer transition-colors odd:bg-background even:bg-muted/30 hover:bg-muted"
                  onClick={() =>
                    router.push(
                      `/constituencies/${row.original.constituencyId}`
                    )
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="whitespace-nowrap border-b border-white/5 px-3 py-2"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
