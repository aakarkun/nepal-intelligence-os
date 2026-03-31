/** UI-only metadata for cabinet MPs; keys = mps.id from seed. */

export const MINISTER_METADATA: Record<
  string,
  {
    icon: string;
    iconBg: string;
    iconColor: string;
    tags: string[];
    ministryShort: string;
    /** ISO date for rough "days in office" (cabinet formation). */
    officeSinceIso: string;
  }
> = {
  "mp-rsp-balen": {
    icon: "🏛",
    iconBg: "#1a1200",
    iconColor: "#f59e0b",
    tags: ["Civil Engineer", "Rapper", "Mayor of KTM 2022–26", "RSP Founder"],
    ministryShort: "PM · Defence · Industry",
    officeSinceIso: "2025-01-01",
  },
  "mp-rsp-wagle": {
    icon: "₨",
    iconBg: "#0d1a0d",
    iconColor: "#4ade80",
    tags: ["Economist", "World Bank Alumni", "Author"],
    ministryShort: "Finance",
    officeSinceIso: "2025-01-01",
  },
  "mp-rsp-khanal": {
    icon: "🌐",
    iconBg: "#0d1220",
    iconColor: "#60a5fa",
    tags: ["Diplomat", "Foreign Policy Expert"],
    ministryShort: "Foreign Affairs",
    officeSinceIso: "2025-01-01",
  },
  "mp-rsp-gautam": {
    icon: "⚖",
    iconBg: "#1a0d1a",
    iconColor: "#c084fc",
    tags: ["Lawyer", "Activist", "Women's Rights"],
    ministryShort: "Law & Justice",
    officeSinceIso: "2025-01-01",
  },
  "mp-rsp-shrestha": {
    icon: "⚡",
    iconBg: "#1a1000",
    iconColor: "#fb923c",
    tags: ["Engineer", "Energy Sector"],
    ministryShort: "Energy & Water",
    officeSinceIso: "2025-01-01",
  },
  "mp-rsp-chaudhary": {
    icon: "🌿",
    iconBg: "#0d1a0d",
    iconColor: "#86efac",
    tags: ["Agriculture Expert", "Dalit Rights"],
    ministryShort: "Agriculture & Forest",
    officeSinceIso: "2025-01-01",
  },
  "mp-rsp-pokharel": {
    icon: "📚",
    iconBg: "#0d1220",
    iconColor: "#7dd3fc",
    tags: ["Educator", "Youth Leader"],
    ministryShort: "Education & Youth",
    officeSinceIso: "2025-01-01",
  },
  "mp-rsp-mehata": {
    icon: "✚",
    iconBg: "#1a0d0d",
    iconColor: "#fca5a5",
    tags: ["Medical Professional", "Public Health"],
    ministryShort: "Health & Population",
    officeSinceIso: "2025-01-01",
  },
  "mp-rsp-lamsal": {
    icon: "🏗",
    iconBg: "#1a1200",
    iconColor: "#fde68a",
    tags: ["Urban Planner", "Infrastructure"],
    ministryShort: "Infrastructure & Urban",
    officeSinceIso: "2025-01-01",
  },
  "mp-rsp-badi": {
    icon: "♀",
    iconBg: "#1a0d12",
    iconColor: "#f9a8d4",
    tags: ["Social Worker", "Women's Rights", "Dalit Advocate"],
    ministryShort: "Women & Children",
    officeSinceIso: "2025-01-01",
  },
  "mp-rsp-paudel": {
    icon: "✈",
    iconBg: "#0a1a18",
    iconColor: "#5eead4",
    tags: ["Tourism Expert", "Culture"],
    ministryShort: "Culture & Tourism",
    officeSinceIso: "2025-01-01",
  },
  "mp-rsp-rawal": {
    icon: "🗺",
    iconBg: "#0f0f1a",
    iconColor: "#a5b4fc",
    tags: ["Federal Affairs", "Public Administration"],
    ministryShort: "Federal Affairs",
    officeSinceIso: "2025-01-01",
  },
};
