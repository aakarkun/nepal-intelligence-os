export type UpcomingIssuesCategory =
  | "ipo"
  | "right"
  | "fpo"
  | "ipo-local"
  | "mutual-fund"
  | "bonds-debentures"
  | "ipo-migrant-workers"
  | "ipo-for-qiis";

export type UpcomingIssueRow = {
  category: UpcomingIssuesCategory;
  sn: number;
  symbol: string;
  company: string;
  units: number;
  sector: string;
  remark: string;
  sourceUrl?: string | null;
  fetchedAt?: string;
  updatedAt?: string;
};

export async function fetchUpcomingIssuesFromHtmlSource(_url: string): Promise<UpcomingIssueRow[]> {
  // Intentionally not implemented until product chooses an authoritative source URL/page(s).
  // This function is the seam for a future parser (static HTML vs Playwright).
  return [];
}

