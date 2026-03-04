import type { Party, Province } from "./schemas";

export const HOR_TOTAL_SEATS = 275;
export const HOR_FPTP_SEATS = 165;
export const HOR_PR_SEATS = 110;
export const HOR_MAJORITY_THRESHOLD = 138;

export const PROVINCES: Province[] = [
  { id: 1, name: "Koshi" },
  { id: 2, name: "Madhesh" },
  { id: 3, name: "Bagmati" },
  { id: 4, name: "Gandaki" },
  { id: 5, name: "Lumbini" },
  { id: 6, name: "Karnali" },
  { id: 7, name: "Sudurpashchim" },
];

export const PARTIES: Party[] = [
  { id: "ncp-uml", name: "CPN (UML)", shortName: "UML", color: "#dc143c" },
  { id: "nc", name: "Nepali Congress", shortName: "NC", color: "#0066cc" },
  {
    id: "ncp-mc",
    name: "CPN (Maoist Centre)",
    shortName: "MC",
    color: "#cc0000",
  },
  {
    id: "rsp",
    name: "Rastriya Swatantra Party",
    shortName: "RSP",
    color: "#ff6600",
  },
  {
    id: "rppp",
    name: "Rastriya Prajatantra Party",
    shortName: "RPP",
    color: "#ff9900",
  },
  {
    id: "jspn",
    name: "Janata Samajbadi Party",
    shortName: "JSPN",
    color: "#009933",
  },
  {
    id: "lsp",
    name: "Loktantrik Samajbadi Party",
    shortName: "LSP",
    color: "#339966",
  },
  { id: "nwpp", name: "Nepal Workers Peasants Party", shortName: "NWPP", color: "#993366" },
  { id: "ind", name: "Independent", shortName: "IND", color: "#888888" },
  { id: "others", name: "Others", shortName: "OTH", color: "#666666" },
];

export const PARTY_MAP = new Map(PARTIES.map((p) => [p.id, p]));

export const SSE_HEARTBEAT_INTERVAL_MS = 30_000;
export const SSE_STALE_THRESHOLD_MS = 60_000;
export const SSE_ERROR_THRESHOLD_MS = 300_000;

export const ANOMALY_LABELS: Record<string, string> = {
  vote_drop: "Vote Drop",
  sudden_jump: "Sudden Jump",
  stale_feed: "Stale Feed",
  count_mismatch: "Count Mismatch",
  duplicate_candidate: "Duplicate Candidate",
  missing_constituency: "Missing Constituency",
};

export const NEPAL_TIMEZONE = "Asia/Kathmandu";
export const NEPAL_UTC_OFFSET = "+05:45";
