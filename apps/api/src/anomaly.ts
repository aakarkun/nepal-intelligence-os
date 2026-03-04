import type { Anomaly, ConstituencyResult, SignalSeverity } from "@repo/shared";

const SUDDEN_JUMP_THRESHOLD = 0.3;

export function detectAnomalies(
  newResult: ConstituencyResult,
  previousResult?: ConstituencyResult
): Anomaly[] {
  const detected: Anomaly[] = [];
  const now = new Date().toISOString();

  if (previousResult) {
    for (const candidate of newResult.candidates) {
      const prev = previousResult.candidates.find(
        (c) => c.candidateId === candidate.candidateId
      );
      if (!prev) continue;

      if (candidate.votes < prev.votes) {
        detected.push({
          id: crypto.randomUUID(),
          type: "vote_drop",
          severity: "critical" as SignalSeverity,
          constituencyId: newResult.constituencyId,
          details: `${candidate.candidateName} (${candidate.partyName}) votes dropped from ${prev.votes} to ${candidate.votes}`,
          timestamp: now,
          resolved: false,
        });
      }

      if (prev.votes > 0) {
        const increase = (candidate.votes - prev.votes) / prev.votes;
        if (increase > SUDDEN_JUMP_THRESHOLD) {
          detected.push({
            id: crypto.randomUUID(),
            type: "sudden_jump",
            severity: "warning" as SignalSeverity,
            constituencyId: newResult.constituencyId,
            details: `${candidate.candidateName} (${candidate.partyName}) votes jumped ${(increase * 100).toFixed(1)}% (${prev.votes} → ${candidate.votes})`,
            timestamp: now,
            resolved: false,
          });
        }
      }
    }
  }

  const candidateVoteSum = newResult.candidates.reduce(
    (sum, c) => sum + c.votes,
    0
  );
  if (candidateVoteSum !== newResult.totalVotes) {
    detected.push({
      id: crypto.randomUUID(),
      type: "count_mismatch",
      severity: "warning" as SignalSeverity,
      constituencyId: newResult.constituencyId,
      details: `Candidate vote sum (${candidateVoteSum}) does not match reported totalVotes (${newResult.totalVotes})`,
      timestamp: now,
      resolved: false,
    });
  }

  return detected;
}
