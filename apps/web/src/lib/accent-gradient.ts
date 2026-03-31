/** Shared helpers for category accent (hex) → luminous gradient + glow tints. */

export function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const s = hex.trim();
  if (!s.startsWith("#")) return null;
  const raw = s.slice(1);

  if (raw.length === 3) {
    const r = Number.parseInt(raw[0] + raw[0], 16);
    const g = Number.parseInt(raw[1] + raw[1], 16);
    const b = Number.parseInt(raw[2] + raw[2], 16);
    if ([r, g, b].some((x) => Number.isNaN(x))) return null;
    return { r, g, b };
  }

  if (raw.length === 6) {
    const r = Number.parseInt(raw.slice(0, 2), 16);
    const g = Number.parseInt(raw.slice(2, 4), 16);
    const b = Number.parseInt(raw.slice(4, 6), 16);
    if ([r, g, b].some((x) => Number.isNaN(x))) return null;
    return { r, g, b };
  }

  return null;
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

export function mixRgb(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number
) {
  const k = clamp01(t);
  return {
    r: Math.round(a.r * (1 - k) + b.r * k),
    g: Math.round(a.g * (1 - k) + b.g * k),
    b: Math.round(a.b * (1 - k) + b.b * k),
  };
}

export function rgbaString(
  rgb: { r: number; g: number; b: number },
  alpha: number
) {
  const a = clamp01(alpha);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
}

const FALLBACK = { r: 59, g: 130, b: 246 };

export function accentBaseGradientBackgroundImage(hex: string): string {
  const base = parseHex(hex) ?? FALLBACK;
  const light = mixRgb(base, { r: 255, g: 255, b: 255 }, 0.44);
  const mid = mixRgb(base, { r: 255, g: 255, b: 255 }, 0.1);
  const deep = mixRgb(base, { r: 15, g: 15, b: 22 }, 0.22);
  return `linear-gradient(to bottom right, ${rgbaString(light, 0.92)}, ${rgbaString(
    mid,
    0.78
  )}, ${rgbaString(deep, 0.86)})`;
}

export function accentGlowBackground(hex: string, mixWhite: number, alpha: number): string {
  const base = parseHex(hex) ?? FALLBACK;
  const c = mixRgb(base, { r: 255, g: 255, b: 255 }, mixWhite);
  return rgbaString(c, alpha);
}

/**
 * Frosted plate behind the feed icon (no-image state).
 * Neutral white so the category color stays on the glyph + shadow only.
 */
export function accentIconPlateBackground(_hex?: string): string {
  return "rgba(255, 255, 255, 0.22)";
}

/** Soft petal overlays tinted to the category accent (demo mode). */
export function accentPetalBackgroundImage(hex: string, which: "a" | "b"): string {
  const base = parseHex(hex) ?? FALLBACK;
  const tint = mixRgb(base, { r: 255, g: 255, b: 255 }, 0.48);
  if (which === "a") {
    return `linear-gradient(to top right, rgba(255,255,255,0.72), ${rgbaString(
      tint,
      0.4
    )}, transparent)`;
  }
  return `linear-gradient(to bottom left, rgba(255,255,255,0.48), ${rgbaString(
    tint,
    0.28
  )}, transparent)`;
}
