"use client";

import { cn } from "@/lib/utils";
import {
  accentBaseGradientBackgroundImage,
  accentGlowBackground,
  accentPetalBackgroundImage,
} from "@/lib/accent-gradient";

export type NepalIntelligenceGradientSurfaceProps = {
  className?: string;
  mode?: "classic" | "demo";
  /**
   * When set, base + glows + petals are derived from this hex so they match category accent
   * (e.g. same hue as the feed card icon). Otherwise use `variant` / `glowA` / `glowB` Tailwind classes.
   */
  accentHex?: string;
  /** Same luminous recipe; swaps glow placement, petal rotation, grain scale. */
  pattern?: 0 | 1 | 2;
  /** Tailwind `bg-gradient-to-br` stops when `accentHex` is not set */
  variant?: string;
  glowA?: string;
  glowB?: string;
  petalA?: string;
  petalB?: string;
};

const DEFAULT_VARIANT =
  "from-cyan-300/90 via-sky-300/80 to-blue-400/85";
const DEFAULT_GLOW_A = "bg-cyan-200/80";
const DEFAULT_GLOW_B = "bg-blue-300/70";
const DEFAULT_PETAL_A = "from-white/70 via-cyan-100/45 to-transparent";
const DEFAULT_PETAL_B = "from-white/45 via-sky-100/35 to-transparent";

const PETAL_ROT: ReadonlyArray<{ a: string; b: string }> = [
  { a: "-12deg", b: "20deg" },
  { a: "6deg", b: "-16deg" },
  { a: "-18deg", b: "10deg" },
];

const GLOW_A_CLASS: ReadonlyArray<string> = [
  "absolute -left-10 top-0 h-40 w-40 rounded-full blur-3xl",
  "absolute right-[-8%] top-[-4%] h-44 w-44 rounded-full blur-3xl",
  "absolute left-[8%] bottom-[-12%] h-44 w-44 rounded-full blur-3xl",
];

const GLOW_B_CLASS: ReadonlyArray<string> = [
  "absolute right-[-10%] bottom-[-5%] h-44 w-44 rounded-full blur-3xl",
  "absolute -left-8 bottom-[-8%] h-40 w-40 rounded-full blur-3xl",
  "absolute right-[10%] top-[-2%] h-36 w-36 rounded-full blur-3xl",
];

const GRAIN_SIZE: ReadonlyArray<string> = [
  "[background-size:12px_12px]",
  "[background-size:14px_14px]",
  "[background-size:10px_10px]",
];

export function NepalIntelligenceGradientSurface({
  className,
  variant = DEFAULT_VARIANT,
  glowA = DEFAULT_GLOW_A,
  glowB = DEFAULT_GLOW_B,
  petalA = DEFAULT_PETAL_A,
  petalB = DEFAULT_PETAL_B,
  accentHex,
  pattern = 0,
  mode = "classic",
}: NepalIntelligenceGradientSurfaceProps) {
  const pi = pattern % 3;
  const rot = PETAL_ROT[pi] ?? PETAL_ROT[0];
  const glowACls = GLOW_A_CLASS[pi] ?? GLOW_A_CLASS[0];
  const glowBCls = GLOW_B_CLASS[pi] ?? GLOW_B_CLASS[0];
  const grainCls = GRAIN_SIZE[pi] ?? GRAIN_SIZE[0];

  if (mode === "demo") {
    const useAccent = Boolean(accentHex);

    return (
      <div
        className={cn(
          "relative h-full w-full overflow-hidden rounded-lg",
          className
        )}
        aria-hidden
      >
        {useAccent && accentHex ? (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: accentBaseGradientBackgroundImage(accentHex),
            }}
          />
        ) : (
          <div className={cn("absolute inset-0 bg-gradient-to-br", variant)} />
        )}
        <div className="absolute inset-0 bg-white/10" />

        {useAccent && accentHex ? (
          <>
            <div
              className={glowACls}
              style={{
                backgroundColor: accentGlowBackground(accentHex, 0.52, 0.52),
              }}
            />
            <div
              className={glowBCls}
              style={{
                backgroundColor: accentGlowBackground(accentHex, 0.28, 0.48),
              }}
            />
          </>
        ) : (
          <>
            <div className={cn(glowACls, glowA)} />
            <div className={cn(glowBCls, glowB)} />
          </>
        )}

        <div className="absolute left-[18%] bottom-[10%] h-40 w-[75%] rounded-full bg-white/30 blur-3xl" />
        <div className="absolute right-[8%] top-[8%] h-32 w-24 rounded-full bg-white/35 blur-2xl" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.65),transparent_20%),radial-gradient(circle_at_78%_24%,rgba(255,255,255,0.28),transparent_18%),radial-gradient(circle_at_55%_72%,rgba(255,255,255,0.16),transparent_24%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.24),transparent_38%)]" />

        {useAccent && accentHex ? (
          <>
            <div
              className="absolute -left-[8%] bottom-[8%] h-[52%] w-[70%] rounded-full blur-2xl opacity-80"
              style={{
                backgroundImage: accentPetalBackgroundImage(accentHex, "a"),
                transform: `rotate(${rot.a})`,
              }}
            />
            <div
              className="absolute right-[-8%] top-[10%] h-[42%] w-[52%] rounded-full blur-2xl opacity-75"
              style={{
                backgroundImage: accentPetalBackgroundImage(accentHex, "b"),
                transform: `rotate(${rot.b})`,
              }}
            />
          </>
        ) : (
          <>
            <div
              className={cn(
                "absolute -left-[8%] bottom-[8%] h-[52%] w-[70%] rounded-full blur-2xl opacity-80 bg-gradient-to-tr",
                petalA
              )}
              style={{ transform: `rotate(${rot.a})` }}
            />
            <div
              className={cn(
                "absolute right-[-8%] top-[10%] h-[42%] w-[52%] rounded-full blur-2xl opacity-75 bg-gradient-to-bl",
                petalB
              )}
              style={{ transform: `rotate(${rot.b})` }}
            />
          </>
        )}

        <div className="absolute left-[30%] top-[14%] h-[34%] w-[28%] rounded-full bg-gradient-to-b from-white/45 via-white/10 to-transparent blur-2xl opacity-70" />

        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),transparent_26%,rgba(255,255,255,0.04)_65%,rgba(255,255,255,0.1))]" />
        <div className="absolute inset-0 backdrop-blur-[1px]" />
        <div
          className={cn(
            "absolute inset-0 opacity-[0.05] mix-blend-overlay [background-image:radial-gradient(rgba(255,255,255,0.9)_0.6px,transparent_0.6px)]",
            grainCls
          )}
        />

        <div className="absolute inset-[1px] rounded-lg ring-1 ring-white/15" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-lg",
        className
      )}
      aria-hidden
    >
      {accentHex ? (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: accentBaseGradientBackgroundImage(accentHex),
          }}
        />
      ) : (
        <div className={cn("absolute inset-0 bg-gradient-to-br", variant)} />
      )}

      <div className="absolute inset-0 bg-white/10" />

      {accentHex ? (
        <>
          <div
            className="absolute -left-10 top-0 h-40 w-40 rounded-full blur-3xl"
            style={{
              backgroundColor: accentGlowBackground(accentHex, 0.52, 0.52),
            }}
          />
          <div
            className="absolute right-[-10%] bottom-[-5%] h-44 w-44 rounded-full blur-3xl"
            style={{
              backgroundColor: accentGlowBackground(accentHex, 0.28, 0.48),
            }}
          />
        </>
      ) : (
        <>
          <div
            className={cn(
              "absolute -left-10 top-0 h-40 w-40 rounded-full blur-3xl",
              glowA
            )}
          />
          <div
            className={cn(
              "absolute right-[-10%] bottom-[-5%] h-44 w-44 rounded-full blur-3xl",
              glowB
            )}
          />
        </>
      )}

      <div className="absolute left-[18%] bottom-[10%] h-40 w-[75%] rounded-full bg-white/30 blur-3xl" />

      <div className="absolute right-[8%] top-[8%] h-32 w-24 rounded-full bg-white/35 blur-2xl" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.22),transparent_38%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_28%,rgba(255,255,255,0.04)_65%,rgba(255,255,255,0.12))]" />

      <div className="absolute inset-0 opacity-[0.07] mix-blend-overlay [background-image:radial-gradient(rgba(255,255,255,0.9)_0.6px,transparent_0.6px)] [background-size:12px_12px]" />
    </div>
  );
}
