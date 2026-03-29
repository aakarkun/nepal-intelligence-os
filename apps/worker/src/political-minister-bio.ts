import { fetchWikipediaMinisterExtract } from "@repo/shared";
import { postMinisterBio } from "./ingest-client";

async function fetchStaleMinisterBioQueue(
  apiUrl: string
): Promise<Array<{ id: string; name: string }>> {
  const base = apiUrl.replace(/\/$/, "");
  const headers: Record<string, string> = {};
  if (process.env.WORKER_SECRET) headers["X-Worker-Secret"] = process.env.WORKER_SECRET;
  const res = await fetch(`${base}/v1/political-pulse/ministers/bio-stale-queue?limit=12`, {
    headers,
  });
  if (!res.ok) {
    console.warn(`[bio-worker] stale queue failed: ${res.status}`);
    return [];
  }
  const data = (await res.json()) as { ministers?: Array<{ id: string; name: string }> };
  return data.ministers ?? [];
}

export async function runMinisterBioWorker(apiUrl: string): Promise<void> {
  const ministers = await fetchStaleMinisterBioQueue(apiUrl);
  if (ministers.length === 0) {
    return;
  }

  for (const m of ministers) {
    console.log(`[bio-worker] Fetching bio for ${m.name}`);
    const bio = await fetchWikipediaMinisterExtract(m.id, m.name);
    const at = new Date().toISOString();
    const ok = await postMinisterBio(apiUrl, m.id, {
      bioText: bio,
      bioSource: "wikipedia",
      bioFetchedAt: at,
    });
    if (ok) {
      console.log(
        `[bio-worker] ✓ Stored bio for ${m.name}${bio ? ` (${bio.length} chars)` : " (empty)"}`
      );
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}
