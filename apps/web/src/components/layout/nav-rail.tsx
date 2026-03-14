"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  TableProperties,
  Building2,
  Radio,
  Newspaper,
  TrendingUp,
  Globe,
  AlertTriangle,
  Headphones,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, label: "Political Pulse" },
  { href: "/map", icon: Map, label: "Tactical Map" },
  { href: "/constituencies", icon: TableProperties, label: "Constituencies" },
  { href: "/parliament", icon: Building2, label: "Parliament" },
  { href: "/feed", icon: Radio, label: "Signals Feed" },
  { href: "/news-room", icon: Newspaper, label: "News Room" },
  { href: "/economy", icon: TrendingUp, label: "Economy" },
  { href: "/world", icon: Globe, label: "World" },
  { href: "/disasters", icon: AlertTriangle, label: "Crisis" },
  { href: "/war-room", icon: Headphones, label: "War Room" },
] as const;

export function NavRail() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop / tablet rail */}
      <nav className="group/rail fixed bottom-8 left-0 top-12 z-40 hidden w-14 flex-col border-r border-border bg-card transition-all duration-200 hover:w-48 md:flex">
        <div className="flex flex-1 flex-col gap-1 overflow-hidden py-2">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "mx-2 flex h-10 items-center gap-3 rounded-md px-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-nepal-red/15 text-nepal-red"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate opacity-0 transition-opacity duration-200 group-hover/rail:opacity-100">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-center justify-between border-t border-border bg-background/95 px-2 backdrop-blur md:hidden">
        <div className="flex w-full items-center justify-around gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1 text-[10px] font-medium",
                  isActive
                    ? "text-nepal-red"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
