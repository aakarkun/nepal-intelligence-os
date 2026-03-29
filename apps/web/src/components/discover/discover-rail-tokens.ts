import { cn } from "@/lib/utils";

/** Outer frame: border only — page mesh shows through (no fill). */
export const discoverShellClass =
  "overflow-hidden rounded-xl border border-white/[0.08]";

/**
 * Inner well: single tint block — subheaders / lists sit inside this (no extra outer fill).
 * No horizontal padding so `railRowFlat` rows can span edge-to-edge inside the rounded rect.
 */
export const discoverInnerWellClass =
  "mx-3 mb-3 mt-1 min-w-0 overflow-hidden rounded-xl bg-white/[0.06] text-[#ccc]";

/** Discover sidebar body: padded inner card (Weather, Market, etc.). */
export const discoverInnerCardClass = cn(discoverInnerWellClass, "px-3 pb-3 pt-2.5");
