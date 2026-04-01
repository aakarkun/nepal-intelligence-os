import { createHash } from "crypto";

/**
 * Deterministic ID from content (e.g. article URL) so the same item
 * gets the same ID across fetches. Use for feed items so reactions
 * persist after reload.
 */
export function stableId(input: string): string {
  const normalized = input.trim() || "\0";
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}
