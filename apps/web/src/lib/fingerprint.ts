const STORAGE_KEY = "nepal-intel-fp";

function djb2(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
    hash = hash & 0x7fffffff;
  }
  return Math.abs(hash).toString(36);
}

export function getFingerprint(): string {
  if (typeof window === "undefined") {
    return "ssr";
  }
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) return cached;
    const parts = [
      navigator.userAgent,
      navigator.language,
      `${screen.width}x${screen.height}`,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      new Date().getTimezoneOffset().toString(),
    ];
    const combined = parts.join("|");
    const fp = djb2(combined);
    localStorage.setItem(STORAGE_KEY, fp);
    return fp;
  } catch {
    return "unknown";
  }
}
