/**
 * Simple named-entity extraction for signals (parties, districts).
 * Uses regex and keyword lists; returns empty arrays when no match.
 */

export type ExtractedEntities = {
  people: string[];
  parties: string[];
  districts: string[];
};

/** Common party abbreviations and names (Nepal). */
const PARTY_KEYWORDS = [
  "NC",
  "Nepali Congress",
  "UML",
  "CPN-UML",
  "Maoist",
  "CPN Maoist",
  "Maoist Centre",
  "RSP",
  "Rastriya Swatantra Party",
  "RPP",
  "Rastriya Prajatantra Party",
  "Janata Samajwadi",
  "JSP",
  "Loktantrik Samajwadi",
  "Nagrik Unmukti",
  "Janamat",
  "Congress",
  "Socialist",
  "Unified Socialist",
  "CPN-US",
];

/** District names (Nepal, English). Partial list for matching; extend as needed. */
const DISTRICT_KEYWORDS = [
  "Kathmandu",
  "Lalitpur",
  "Bhaktapur",
  "Sunsari",
  "Morang",
  "Jhapa",
  "Kaski",
  "Chitwan",
  "Nawalparasi",
  "Rupandehi",
  "Kapilvastu",
  "Banke",
  "Bardiya",
  "Kailali",
  "Kanchanpur",
  "Dadeldhura",
  "Doti",
  "Achham",
  "Dang",
  "Surkhet",
  "Dailekh",
  "Jajarkot",
  "Rukum",
  "Rolpa",
  "Pyuthan",
  "Arghakhanchi",
  "Gulmi",
  "Palpa",
  "Syangja",
  "Tanahun",
  "Lamjung",
  "Gorkha",
  "Manang",
  "Mustang",
  "Myagdi",
  "Parbat",
  "Baglung",
  "Dolakha",
  "Sindhuli",
  "Ramechhap",
  "Dolakha",
  "Sindhupalchok",
  "Rasuwa",
  "Nuwakot",
  "Dhading",
  "Makwanpur",
  "Parsa",
  "Bara",
  "Rautahat",
  "Sarlahi",
  "Mahottari",
  "Dhanusha",
  "Siraha",
  "Saptari",
  "Udayapur",
  "Okhaldhunga",
  "Khotang",
  "Bhojpur",
  "Dhankuta",
  "Terhathum",
  "Panchthar",
  "Ilam",
  "Taplejung",
  "Sankhuwasabha",
  "Solukhumbu",
  "Bajhang",
  "Bajura",
  "Humla",
  "Mugu",
  "Jumla",
  "Kalikot",
  "Darchula",
  "Baitadi",
  "Dandeldhura",
];

function findMatches(text: string, keywords: string[]): string[] {
  const seen = new Set<string>();
  for (const kw of keywords) {
    if (kw.length < 2) continue;
    const pattern = new RegExp(`\\b${escapeRegex(kw)}\\b`, "gi");
    if (pattern.test(text)) seen.add(kw);
  }
  return Array.from(seen);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extracts people, parties, and districts from text using keyword lists.
 * People: left as empty (no NER model); parties and districts use known lists.
 */
export function extractEntities(text: string): ExtractedEntities {
  if (!text || typeof text !== "string") {
    return { people: [], parties: [], districts: [] };
  }
  const parties = findMatches(text, PARTY_KEYWORDS);
  const districts = findMatches(text, DISTRICT_KEYWORDS);
  return {
    people: [],
    parties,
    districts,
  };
}
