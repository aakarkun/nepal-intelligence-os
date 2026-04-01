"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  BalanceScaleIcon,
  Notification03Icon,
  PineTreeIcon,
  RoseIcon,
  StarIcon,
  Sun01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

type PartyMarkProps = {
  partyId?: string;
  partyName?: string;
  partyShortName?: string;
  partyColor?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_MAP = {
  sm: {
    shell: "h-5 w-5",
    icon: 12,
  },
  md: {
    shell: "h-6 w-6",
    icon: 14,
  },
  lg: {
    shell: "h-8 w-8",
    icon: 18,
  },
} as const;

const PARTY_BRAND_COLORS: Record<string, string> = {
  rsp: "#1a97d5",
  nc: "#3f653b",
  "ncp-uml": "#ee1c25",
  "ncp-mc": "#ef4444",
  rppp: "#f97316",
  jspn: "#ef4444",
  nwpp: "#6b7280",
  ind: "#888888",
  others: "#666666",
};

export function resolvePartyColor(partyId?: string, fallback?: string) {
  if (!partyId) return fallback ?? "#666666";
  return PARTY_BRAND_COLORS[partyId] ?? fallback ?? "#666666";
}

function getPartyIcon(partyId?: string, partyName?: string) {
  const key = (partyId ?? "").toLowerCase();
  const name = (partyName ?? "").toLowerCase();

  if (key === "rsp" || name.includes("rastriya swatantra")) return Notification03Icon;
  if (key === "nc" || name.includes("congress")) return PineTreeIcon;
  if (key === "ncp-uml" || name.includes("uml")) return Sun01Icon;
  if (key === "ncp-mc" || name.includes("communist")) return StarIcon;
  if (key === "rppp" || name.includes("prajatantra")) return BalanceScaleIcon;
  if (key === "nwpp" || name.includes("workers") || name.includes("majdoor")) return RoseIcon;
  if (key === "jspn" || name.includes("samajbadi")) return RoseIcon;
  return StarIcon;
}

export function PartyMark({
  partyId,
  partyName,
  partyShortName,
  partyColor = "#666666",
  size = "md",
  className,
}: PartyMarkProps) {
  const scale = SIZE_MAP[size];
  const icon = getPartyIcon(partyId, partyName);
  const resolvedColor = resolvePartyColor(partyId, partyColor);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border",
        scale.shell,
        className
      )}
      style={{
        backgroundColor: `${resolvedColor}20`,
        borderColor: `${resolvedColor}55`,
        color: resolvedColor,
      }}
      title={partyName ?? partyShortName}
    >
      <HugeiconsIcon
        icon={icon}
        size={scale.icon}
        strokeWidth={1.8}
        primaryColor={resolvedColor}
      />
    </span>
  );
}
