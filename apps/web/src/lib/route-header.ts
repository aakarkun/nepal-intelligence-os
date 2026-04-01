import { flattenNavItems } from "@/components/layout/nav-config";

export type RouteHeaderTitle = {
  mode: "title";
  title: string;
  description?: string;
};

export type RouteHeaderBreadcrumb = {
  mode: "breadcrumb";
  items: { label: string; href?: string }[];
};

export type RouteHeaderResult = RouteHeaderTitle | RouteHeaderBreadcrumb;

const STATIC: Record<string, { title: string; description?: string }> = {
  "/": {
    title: "Discover",
    description: "Curated signals · Nepal Intelligence OS",
  },
  "/feed": {
    title: "Signals Feed",
    description:
      "Operational alerts · ingest · anomalies · high-attention news — triage desk",
  },
  "/constituencies": {
    title: "Constituencies",
    description: "HoR constituency results · live and archived election datasets",
  },
  "/parliament": {
    title: "Parliament",
    description: "House of representatives — 275 seats · composition & coalitions",
  },
  "/disasters": {
    title: "Crisis Monitor",
    description:
      "Seismic feed · flood & landslide · conflict watch · operational monitoring",
  },
  "/news-room": {
    title: "News Room",
    description:
      "Curated news by source & topic · editorial desk — use signals feed for triage",
  },
  "/political-pulse": {
    title: "Political Pulse",
    description: "Party standings · coalitions · electoral context — Nepal HoR",
  },
  "/war-room": {
    title: "War Room",
    description: "Collaborative voice room · AI briefing · crisis coordination",
  },
  "/economy": {
    title: "Macroeconomic Intelligence",
    description: "Nepal Rastra Bank · NEPSE · Global Commodities",
  },
  "/world": {
    title: "Global Desk",
    description:
      "South Asia · Diplomatic Wire · Remittance Corridor · Multilateral",
  },
  "/map": {
    title: "Tactical Map",
    description: "Nepal district choropleth — click to explore layers",
  },
};

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname || "/";
}

function titleCaseSegment(segment: string): string {
  return segment
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Heuristic: dynamic id slug (constituency id, uuid-ish) → generic “Detail” label */
function labelForLastSegment(segment: string): string {
  if (segment.length > 28 || /^[a-f0-9-]{12,}$/i.test(segment)) {
    return "Detail";
  }
  return titleCaseSegment(segment);
}

/**
 * Default heading for the top bar from the URL. Pages can override via
 * {@link import("@/components/layout/shell-header-context")} `setHeader`.
 */
export function getRouteHeader(pathname: string): RouteHeaderResult {
  const path = normalizePath(pathname);
  const direct = STATIC[path];
  if (direct) {
    return { mode: "title", title: direct.title, description: direct.description };
  }

  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) {
    const root = STATIC["/"]!;
    return { mode: "title", title: root.title, description: root.description };
  }

  if (segments.length >= 2) {
    const parentPath = `/${segments[0]}`;
    const nav = flattenNavItems().find((item) => item.href === parentPath);
    const parentLabel = nav?.label ?? titleCaseSegment(segments[0]!);
    const last = segments[segments.length - 1]!;
    return {
      mode: "breadcrumb",
      items: [
        { label: parentLabel, href: parentPath },
        { label: labelForLastSegment(last) },
      ],
    };
  }

  const singlePath = `/${segments[0]}`;
  const fallback = STATIC[singlePath];
  if (fallback) {
    return { mode: "title", title: fallback.title, description: fallback.description };
  }

  return {
    mode: "title",
    title: titleCaseSegment(segments[0]!),
    description: undefined,
  };
}
