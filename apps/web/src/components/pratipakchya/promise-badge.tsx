import { Badge } from "@/components/ui/badge";
import { normalizePratipakchyaPromiseStatus } from "@/lib/pratipakchya-shared";
import { cn } from "@/lib/utils";
import type { PratipakchyaPromiseStatus } from "@/lib/pratipakchya-shared";

export function PromiseStatusBadge({
  status,
  className,
}: {
  status: PratipakchyaPromiseStatus | (string & {});
  className?: string;
}) {
  const s = normalizePratipakchyaPromiseStatus(status);
  const variant =
    s === "completed"
      ? ("live" as const)
      : s === "in-progress"
        ? ("stale" as const)
        : ("outline" as const);

  const label =
    s === "completed" ? "COMPLETED" : s === "in-progress" ? "IN PROGRESS" : "NOT STARTED";

  return (
    <Badge
      variant={variant}
      className={cn(
        "font-sans text-[11px] font-semibold uppercase tracking-[0.12em]",
        variant === "outline" && "border-white/10 text-[#888]",
        className
      )}
    >
      {label}
    </Badge>
  );
}

