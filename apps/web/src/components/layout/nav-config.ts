import type { ComponentType } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  DiscoverCircle,
  Globe,
  Headphones,
  Map,
  Newspaper,
  Radio,
  TableProperties,
  TrendingUp,
} from "@/components/icons";

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

/** Grouped rail — order matches sidebar. Keep command palette in sync. */
export const NAV_SECTIONS: { label?: string; items: NavItem[] }[] = [
  {
    items: [
      { href: "/", icon: DiscoverCircle, label: "Discover" },
      { href: "/feed", icon: Radio, label: "Signals Feed" },
    ],
  },
  {
    label: "Political",
    items: [
      { href: "/political-pulse", icon: Activity, label: "Political Pulse" },
      { href: "/parliament", icon: Building2, label: "Parliament" },
      { href: "/constituencies", icon: TableProperties, label: "Constituencies" },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/news-room", icon: Newspaper, label: "News Room" },
      { href: "/world", icon: Globe, label: "World" },
    ],
  },
  {
    label: "Economy",
    items: [{ href: "/economy", icon: TrendingUp, label: "Economy" }],
  },
  {
    label: "Analysis",
    items: [
      { href: "/map", icon: Map, label: "Tactical Map" },
      { href: "/war-room", icon: Headphones, label: "War Room" },
      { href: "/disasters", icon: AlertTriangle, label: "Crisis" },
    ],
  },
];

export function flattenNavItems(): NavItem[] {
  return NAV_SECTIONS.flatMap((s) => s.items);
}
