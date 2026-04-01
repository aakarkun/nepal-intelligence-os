/**
 * Absolute origin for canonical URLs and Open Graph metadata (no trailing slash).
 * Prefer NEXT_PUBLIC_APP_URL in production; falls back to Vercel preview URL or localhost.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }
  return "http://localhost:3000";
}
