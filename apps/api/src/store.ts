import type {
  NationalSummary,
  ConstituencyResult,
  SignalEvent,
  Anomaly,
  SourceHealth,
} from "@repo/shared";

// ─── In-Memory Stores ────────────────────────────────────────────────────────

let nationalSummary: NationalSummary = {
  totalSeats: 0,
  totalConstituencies: 0,
  countedConstituencies: 0,
  totalVotesCast: 0,
  timestamp: new Date().toISOString(),
  partyResults: [],
};

const constituencyResults = new Map<string, ConstituencyResult>();
const signalEvents: SignalEvent[] = [];
const anomalies: Anomaly[] = [];
const sourceHealth = new Map<string, SourceHealth>();

// ─── Readers ─────────────────────────────────────────────────────────────────

export function getNationalSummary(): NationalSummary {
  return nationalSummary;
}

export function getConstituencyResults(): ConstituencyResult[] {
  return Array.from(constituencyResults.values());
}

export function getConstituencyResult(
  id: string
): ConstituencyResult | undefined {
  return constituencyResults.get(id);
}

export function getSignalEvents(
  limit = 20,
  offset = 0
): { events: SignalEvent[]; total: number } {
  const sorted = signalEvents.slice().reverse();
  return {
    events: sorted.slice(offset, offset + limit),
    total: signalEvents.length,
  };
}

export function getAnomalies(): Anomaly[] {
  return anomalies.filter((a) => !a.resolved);
}

export function getSourceHealth(): SourceHealth[] {
  return Array.from(sourceHealth.values());
}

// ─── Writers ─────────────────────────────────────────────────────────────────

export function updateNationalSummary(summary: NationalSummary): void {
  nationalSummary = summary;
}

export function updateConstituencyResult(result: ConstituencyResult): void {
  constituencyResults.set(result.constituencyId, result);
}

export function addSignalEvent(event: SignalEvent): void {
  signalEvents.push(event);
}

export function addAnomaly(anomaly: Anomaly): void {
  anomalies.push(anomaly);
}

export function updateSourceHealth(health: SourceHealth): void {
  sourceHealth.set(health.sourceId, health);
}
