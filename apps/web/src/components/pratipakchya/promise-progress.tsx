import { cn } from "@/lib/utils";

export function PromiseProgress({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const safe = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  const width = `${safe}%`;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="relative h-2 w-24 overflow-hidden rounded-full bg-white/[0.06]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(safe)}
        aria-label="Progress"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-300/70 to-pink-300/60"
          style={{ width }}
        />
      </div>
      <span className="font-mono text-[11px] tabular-nums text-[#888]">
        {Math.round(safe)}%
      </span>
    </div>
  );
}

