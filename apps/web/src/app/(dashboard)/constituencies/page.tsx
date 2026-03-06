import { ConstituenciesTable } from "@/components/constituencies/constituencies-table";
import { ElectionDatasetSelector } from "@/components/election-dataset-selector";

export default function ConstituenciesPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Constituencies
          </h1>
          <p className="text-muted-foreground text-sm">
            HoR constituency results — switch between live and archived datasets
          </p>
        </div>
        <ElectionDatasetSelector />
      </div>
      <ConstituenciesTable />
    </div>
  );
}
