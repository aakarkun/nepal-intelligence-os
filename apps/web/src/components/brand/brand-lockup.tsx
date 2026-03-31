import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandLockupProps = {
  className?: string;
};

/** NIO — Nepal Intelligence OS (expanded sidebar / sheet). Icon-collapsed rail uses `CollapsedSidebarBrand` in the shell. */
export function BrandLockup({ className }: BrandLockupProps) {
  return (
    <Link
      href="/"
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 items-center rounded-md px-1.5 py-0.5 outline-none ring-sidebar-ring",
        "focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
      aria-label="Nepal Intelligence OS (NIO)"
    >
      <div className="flex min-w-0 flex-1 items-baseline gap-2.5">
        <span className="shrink-0 font-sans text-[0.8125rem] font-bold tracking-[0.12em] text-sidebar-foreground">
          NIO
        </span>
        <span className="min-w-0 truncate text-[0.625rem] font-medium leading-tight text-sidebar-foreground/55">
          Nepal Intelligence OS
        </span>
      </div>
    </Link>
  );
}
