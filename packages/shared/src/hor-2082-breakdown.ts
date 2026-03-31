import type { NationalSummary, PartyResult } from "./schemas";
import { partyTotalHorSeats } from "./election-seat-utils";
import {
  HOR_2082_PR_BALLOT_ROWS,
  HOR_2082_PR_BALLOT_VOTE_TOTAL,
} from "./hor-2082-pr-ballot";

/** Stored national_summary row id — stable for clients and seeds. */
export const HOR_2082_OFFICIAL_DATASET_ID = "hor-2082-official";

/** Official HoR 2082 FPTP (constituency) seats — parties that won at least one FPTP seat. */
const HOR_2082_FPTP_SEATS: Record<string, number> = {
  rsp: 125,
  nc: 18,
  "ncp-uml": 9,
  "ncp-nepal": 8,
  ssp: 3,
  rppp: 1,
  ind: 1,
};

function buildHor2082PartyResults(): PartyResult[] {
  const fromBallot: PartyResult[] = HOR_2082_PR_BALLOT_ROWS.map((row) => {
    const fptp = HOR_2082_FPTP_SEATS[row.partyId] ?? 0;
    return {
      partyId: row.partyId,
      partyName: row.partyName,
      partyShortName: row.partyShortName,
      partyColor: row.partyColor,
      seatsWon: fptp,
      seatsLeading: 0,
      totalVotes: 0,
      fptpSeats: fptp,
      prSeats: row.prSeats,
      prVotes: row.prVotes,
    };
  });

  const hasInd = fromBallot.some((p) => p.partyId === "ind");
  if (!hasInd) {
    fromBallot.push({
      partyId: "ind",
      partyName: "Independent",
      partyShortName: "IND",
      partyColor: "#888888",
      seatsWon: 1,
      seatsLeading: 0,
      totalVotes: 0,
      fptpSeats: 1,
      prSeats: 0,
      prVotes: 0,
    });
  }

  return fromBallot.sort((a, b) => partyTotalHorSeats(b) - partyTotalHorSeats(a));
}

export function buildHor2082OfficialNationalSummary(): NationalSummary {
  const timestamp = "2026-03-15T12:00:00.000Z";
  const partyResults = buildHor2082PartyResults();

  return {
    totalSeats: 275,
    totalConstituencies: 165,
    countedConstituencies: 165,
    totalVotesCast: 0,
    timestamp,
    partyResults,
    sourceId: "hor-official",
    sourceName: "Election 2026",
    sourceFetchedAt: timestamp,
    horBreakdown: "2082",
    horProportional: {
      totalVotesCast: HOR_2082_PR_BALLOT_VOTE_TOTAL,
      prSeatCap: 110,
      partiesInTally: HOR_2082_PR_BALLOT_ROWS.length,
      thresholdPercent: 3,
      lastUpdated: "2026-03-12T12:00:00.000Z",
      countingStatus: "completed",
    },
  };
}

/**
 * When the active dataset is the final HoR 2082 snapshot (by id, breakdown flag, or RSP seat fingerprint),
 * replace summary with the canonical full party list and PR ballot so all parliament views stay aligned.
 */
export function mergeHor2082NationalSummaryIfNeeded(
  summary: NationalSummary,
  datasetId: string | null
): NationalSummary {
  const rsp = summary.partyResults.find((p) => p.partyId === "rsp");
  const looksLikeHor2082Final =
    summary.totalSeats === 275 &&
    rsp !== undefined &&
    rsp.fptpSeats === 125 &&
    rsp.prSeats === 57;

  const byDatasetOrMeta =
    datasetId === HOR_2082_OFFICIAL_DATASET_ID ||
    summary.horBreakdown === "2082" ||
    summary.sourceId === "hor-official";

  if (!looksLikeHor2082Final && !byDatasetOrMeta) return summary;

  const canon = buildHor2082OfficialNationalSummary();
  return {
    ...summary,
    horProportional: canon.horProportional,
    partyResults: canon.partyResults,
    horBreakdown: "2082",
  };
}
