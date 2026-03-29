"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { PanelLeft } from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type NavItem, NAV_SECTIONS } from "./nav-config";

function routeIsActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

/** Icon-collapsed desktop header: “NIO” by default; hover shows panel icon; click expands the rail. */
function CollapsedSidebarBrand() {
  const { toggleSidebar } = useSidebar();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => toggleSidebar()}
          className={cn(
            "group/cbrand relative flex h-12 w-full min-w-0 flex-1 items-center justify-center overflow-hidden rounded-md px-1",
            "text-sidebar-foreground outline-none ring-sidebar-ring transition-colors",
            "hover:bg-sidebar-accent/35 focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "touch-manipulation"
          )}
          aria-label="Expand sidebar"
        >
          <span
            className={cn(
              "font-sans text-[0.7rem] font-bold tracking-[0.14em] transition-opacity duration-150",
              "group-hover/cbrand:opacity-0 group-focus-visible/cbrand:opacity-0"
            )}
          >
            NIO
          </span>
          <PanelLeft
            className={cn(
              "pointer-events-none absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-150",
              "group-hover/cbrand:opacity-100 group-focus-visible/cbrand:opacity-100"
            )}
            aria-hidden
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">Expand sidebar</TooltipContent>
    </Tooltip>
  );
}

/** Sliding vertical rail when expanded — height matches row; only `transform` animates. */
const RAIL_SLOT_PX_EXPANDED = 40;

/** Active marker: vertical bar when sidebar is open; small dot at the left edge when icon-collapsed. */
function NavMenuItems({ items, pathname }: { items: NavItem[]; pathname: string }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const containerRef = useRef<HTMLDivElement>(null);
  /** Plain object — avoids runtime issues with `Map` + ref callbacks in some React/Turbopack builds. */
  const itemRefs = useRef<Partial<Record<string, HTMLLIElement>>>({});
  const [indicator, setIndicator] = useState<{ top: number; height: number } | null>(null);

  const activeHref = useMemo(
    () => items.find((item) => routeIsActive(pathname, item.href))?.href ?? null,
    [items, pathname]
  );

  const updateIndicator = useCallback(() => {
    if (!activeHref || !containerRef.current) {
      setIndicator(null);
      return;
    }
    const li = itemRefs.current[activeHref];
    const container = containerRef.current;
    if (!li) {
      setIndicator(null);
      return;
    }
    const cr = container.getBoundingClientRect();
    const ir = li.getBoundingClientRect();
    setIndicator({
      top: ir.top - cr.top + container.scrollTop,
      height: ir.height,
    });
  }, [activeHref]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator, pathname, collapsed]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => updateIndicator());
    ro.observe(container);

    const scrollRoot = container.closest("[data-sidebar=\"content\"]");
    scrollRoot?.addEventListener("scroll", updateIndicator, { passive: true });
    window.addEventListener("resize", updateIndicator);

    return () => {
      ro.disconnect();
      scrollRoot?.removeEventListener("scroll", updateIndicator);
      window.removeEventListener("resize", updateIndicator);
    };
  }, [updateIndicator]);

  return (
    <div ref={containerRef} className="relative">
      {/* Expanded: left-edge vertical highlighter (glow + bar) */}
      {!collapsed && indicator && activeHref ? (
        <div
          className={cn(
            "pointer-events-none absolute left-0 top-0 z-20 flex w-3 items-center justify-start pl-0",
            "will-change-transform motion-reduce:transform-none",
            "transition-[transform] duration-100 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          )}
          style={{
            height: RAIL_SLOT_PX_EXPANDED,
            transform: `translate3d(0, ${indicator.top + indicator.height / 2 - RAIL_SLOT_PX_EXPANDED / 2}px, 0)`,
            backfaceVisibility: "hidden",
          }}
          aria-hidden
        >
          <span
            className="pointer-events-none absolute left-0 top-1/2 z-0 h-8 w-6 -translate-y-1/2 rounded-full bg-gradient-to-r from-violet-400/30 via-pink-300/14 to-transparent opacity-90 blur-md"
            aria-hidden
          />
          <span className="relative z-10 h-[22px] w-[3px] shrink-0 rounded-full bg-gradient-to-b from-violet-200 to-pink-300 shadow-[0_0_14px_rgba(167,139,250,0.45)]" />
        </div>
      ) : null}

      {/* Collapsed: dot pinned to the rail edge */}
      {collapsed && indicator && activeHref ? (
        <div
          className={cn(
            "pointer-events-none absolute -left-2 top-0 z-20",
            "will-change-[top] motion-reduce:transition-none",
            "transition-[top] duration-100 ease-[cubic-bezier(0.22,1,0.36,1)]"
          )}
          style={{
            top: indicator.top + indicator.height / 2,
            transform: "translate3d(0, -50%, 0)",
            backfaceVisibility: "hidden",
          }}
          aria-hidden
        >
          <span className="block h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-violet-300 to-pink-300 shadow-[0_0_10px_rgba(167,139,250,0.55)] ring-1 ring-white/15" />
        </div>
      ) : null}

      <SidebarMenu>
        {items.map((item) => {
          const isActive = routeIsActive(pathname, item.href);
          return (
            <SidebarMenuItem
              key={item.href}
              ref={(el) => {
                if (el) itemRefs.current[item.href] = el;
                else delete itemRefs.current[item.href];
              }}
              className={cn(
                "flex min-w-0 items-stretch gap-0 group-data-[collapsible=icon]:justify-center",
                "group-data-[collapsible=icon]:py-0.5",
                isActive && "overflow-visible"
              )}
            >
              <div className="w-3 shrink-0 group-data-[collapsible=icon]:hidden" aria-hidden />
              <SidebarMenuButton
                asChild
                variant="nav"
                isActive={isActive}
                tooltip={item.label}
                className={cn(
                  "min-w-0 flex-1 rounded-xl border border-transparent transition-[background-color,border-color] duration-150",
                  "group-data-[collapsible=icon]:rounded-full",
                  "text-[13px] font-medium leading-5 tracking-tight antialiased",
                  "text-sidebar-foreground/68",
                  /* No fill on idle/hover — only the active route gets the mesh-aligned pill */
                  "[&:not([data-active=true])]:bg-transparent [&:not([data-active=true])]:hover:bg-transparent [&:not([data-active=true])]:hover:text-white/90",
                  "[&:not([data-active=true])]:active:bg-transparent",
                  "data-[active=true]:bg-gradient-to-br data-[active=true]:from-violet-400/[0.09] data-[active=true]:to-pink-300/[0.06] data-[active=true]:font-semibold data-[active=true]:text-white/94",
                  "data-[active=true]:border-transparent data-[active=true]:hover:from-violet-400/12 data-[active=true]:hover:to-pink-300/9",
                  "[&>svg]:opacity-[0.92] data-[active=true]:[&>svg]:opacity-100",
                  "group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:justify-center",
                  /* Collapsed: 44×44px target (overrides shadcn !size-8) — clear, easy taps */
                  "group-data-[collapsible=icon]:!size-11 group-data-[collapsible=icon]:!min-h-11 group-data-[collapsible=icon]:!min-w-11 group-data-[collapsible=icon]:!p-0",
                  "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0",
                  "group-data-[collapsible=icon]:touch-manipulation"
                )}
              >
                <Link href={item.href}>
                  <item.icon className="size-4 shrink-0 group-data-[collapsible=icon]:size-[1.125rem]" />
                  <span className="group-data-[collapsible=icon]:sr-only">{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </div>
  );
}

/**
 * Top strip of the sidebar column (h-12): expanded = brand link + collapse trigger;
 * desktop icon mode = full-width “NIO” control (hover → panel icon, click → expand).
 */
export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar
      collapsible="icon"
      className="z-40 !top-0 !h-svh border-r-0 group-data-[side=left]:border-r-0 group-data-[side=right]:border-l-0"
    >
      <SidebarHeader className="box-border flex h-12 min-h-12 shrink-0 items-center border-b border-white/[0.06] py-0 pl-2 pr-1 md:group-data-[collapsible=icon]:px-1.5">
        {/* Expanded (and mobile sheet): home link + collapse control — trigger flush right */}
        <div className="flex min-h-0 min-w-0 flex-1 items-center gap-1 md:group-data-[collapsible=icon]:hidden">
          <BrandLockup className="min-h-0 min-w-0 flex-1" />
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarTrigger className="ml-auto h-7 w-7 shrink-0 -mr-0.5" />
            </TooltipTrigger>
            <TooltipContent side="right">Toggle sidebar</TooltipContent>
          </Tooltip>
        </div>
        {/* Desktop icon rail: full-width logo control — hover shows panel icon, click expands */}
        <div className="hidden w-full min-w-0 flex-1 md:group-data-[collapsible=icon]:flex">
          <CollapsedSidebarBrand />
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0 pt-2">
        {NAV_SECTIONS.map((section, index) => (
          <SidebarGroup
            key={section.label ?? `section-${index}`}
            className={cn(
              "border-0 pb-0 pl-0 pr-2 shadow-none group-data-[collapsible=icon]:pl-2",
              index === 0 ? "pt-2" : "pt-4"
            )}
          >
            {section.label ? (
              <SidebarGroupLabel className="mb-1 h-auto min-h-0 shrink-0 border-0 px-2 pb-1.5 pt-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45 shadow-none">
                {section.label}
              </SidebarGroupLabel>
            ) : null}
            <NavMenuItems items={section.items} pathname={pathname} />
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
