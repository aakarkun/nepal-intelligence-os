import { ConstituenciesTable } from "@/components/constituencies/constituencies-table";

export default function ConstituenciesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Constituencies
        </h1>
        <p className="text-muted-foreground text-sm">
          HoR constituency results — live data
        </p>
      </div>
      <ConstituenciesTable />
    </div>
  );
}
