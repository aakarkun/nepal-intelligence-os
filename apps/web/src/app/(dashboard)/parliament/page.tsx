import { SeatTiles } from "@/components/parliament/seat-tiles";
import { MajorityBar } from "@/components/parliament/majority-bar";
import { SeatFlipLog } from "@/components/parliament/seat-flip-log";
import { CoalitionBuilder } from "@/components/parliament/coalition-builder";
import { ElectionDatasetSelector } from "@/components/election-dataset-selector";

export default function ParliamentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Parliament
        </h1>
        <p className="text-muted-foreground text-sm">
          House of Representatives — 275 seats
        </p>
        <div className="mt-3">
          <ElectionDatasetSelector />
        </div>
      </div>
      <SeatTiles />
      <MajorityBar />
      <div className="grid grid-cols-2 gap-4">
        <SeatFlipLog />
        <CoalitionBuilder />
      </div>
    </div>
  );
}
