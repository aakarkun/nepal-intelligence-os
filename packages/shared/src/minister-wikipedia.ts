/** Wikipedia REST summary slugs for cabinet MPs (en.wikipedia.org). Keys = mps.id from seed. */

export const MINISTER_WIKIPEDIA_SLUGS: Record<string, string> = {
  "mp-rsp-balen": "Balendra_Shah",
  "mp-rsp-wagle": "Swarnim_Wagle",
  "mp-rsp-khanal": "Shishir_Khanal",
  "mp-rsp-gautam": "Sobita_Gautam",
  "mp-rsp-shrestha": "Biraj_Bhakta_Shrestha",
  "mp-rsp-chaudhary": "Gita_Chaudhary_(politician)",
  "mp-rsp-pokharel": "Sasmit_Pokharel",
  "mp-rsp-mehata": "Nisha_Mehata",
  "mp-rsp-lamsal": "Sunil_Lamsal_(politician)",
  "mp-rsp-badi": "Sita_Badi",
  "mp-rsp-paudel": "Khadka_Raj_Paudel",
  "mp-rsp-rawal": "Pratibha_Rawal",
};

const WIKIPEDIA_API = "https://en.wikipedia.org/api/rest_v1/page/summary";

const UA = "NepalIntelligenceOS/1.0 (contact@nepalintelligence.os)";

export async function fetchWikipediaMinisterExtract(
  ministerId: string,
  ministerName: string
): Promise<string | null> {
  const slug = MINISTER_WIKIPEDIA_SLUGS[ministerId];

  if (!slug) {
    const titleGuess = ministerName.replace(/\s*\([^)]*\)\s*/g, "").trim().replace(/\s+/g, "_");
    const searchUrl = `${WIKIPEDIA_API}/${encodeURIComponent(titleGuess)}`;
    try {
      const res = await fetch(searchUrl, { headers: { "User-Agent": UA } });
      if (!res.ok) return null;
      const data = (await res.json()) as { extract?: string };
      return data.extract ?? null;
    } catch {
      return null;
    }
  }

  try {
    const res = await fetch(`${WIKIPEDIA_API}/${slug}`, {
      headers: { "User-Agent": UA },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { extract?: string };
    return data.extract ?? null;
  } catch {
    return null;
  }
}
