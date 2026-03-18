import type { AppLanguage } from "@/providers/language-provider";

const NEPALI_SCRIPT_RE = /[\u0900-\u097F]/;

export function looksNepaliText(input: string | null | undefined): boolean {
  if (!input) return false;
  return NEPALI_SCRIPT_RE.test(input);
}

export function shouldShowByLanguage(
  language: AppLanguage,
  parts: Array<string | null | undefined>
): boolean {
  const isNepali = parts.some((p) => looksNepaliText(p));
  if (language === "np") return isNepali;
  return !isNepali;
}

