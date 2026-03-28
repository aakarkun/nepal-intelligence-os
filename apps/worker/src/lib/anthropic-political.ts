import type { PoliticalPulseEvent } from "@repo/shared";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-20250514";
const TIMEOUT_MS = 25_000;

const CLASSIFIER_PROMPT = `You are a Nepal political event classifier. Given this news article, return ONLY valid JSON (no markdown):
{
  "event_type": "bill_registered|bill_passed|cabinet_decision|policy_announcement|appointment|news",
  "summary": "two sentence plain English summary",
  "parties_mentioned": ["party names"],
  "mps_mentioned": ["MP names"],
  "ministry": "ministry name or null",
  "bill_number": "bill reference or null",
  "bill_status": "registered|committee|passed|enacted|rejected|null",
  "tags": ["tags"],
  "importance_score": 1,
  "is_legislation_related": false
}`;

export type ClassifierJson = {
  event_type: string;
  summary: string;
  parties_mentioned: string[];
  mps_mentioned: string[];
  ministry: string | null;
  bill_number: string | null;
  bill_status: string | null;
  tags: string[];
  importance_score: number;
  is_legislation_related: boolean;
};

function mapEventType(raw: string): string {
  const r = raw.toLowerCase();
  const allowed = new Set([
    "bill_registered",
    "bill_passed",
    "bill_rejected",
    "cabinet_decision",
    "parliament_sitting",
    "policy_announcement",
    "appointment",
    "news",
    "law_enacted",
  ]);
  if (allowed.has(r)) return r;
  return "news";
}

const PARTY_NAME_TO_ID: Record<string, string> = {
  "rastriya swatantra party": "party-rsp",
  rsp: "party-rsp",
  "nepali congress": "party-nc",
  nc: "party-nc",
  "cpn-uml": "party-uml",
  uml: "party-uml",
  "nepali communist party": "party-ncp",
  ncp: "party-ncp",
  "shram sanskriti": "party-ssp",
  ssp: "party-ssp",
  "rastriya prajatantra": "party-rpp",
  rpp: "party-rpp",
  independent: "party-ind",
};

function resolvePartyIds(names: string[]): string[] {
  const out = new Set<string>();
  for (const n of names) {
    const k = n.toLowerCase().trim();
    if (PARTY_NAME_TO_ID[k]) out.add(PARTY_NAME_TO_ID[k]);
    for (const [needle, id] of Object.entries(PARTY_NAME_TO_ID)) {
      if (k.includes(needle)) out.add(id);
    }
  }
  return Array.from(out);
}

function parseJsonObject(text: string): ClassifierJson | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as ClassifierJson;
  } catch {
    return null;
  }
}

export async function classifyNepalArticle(input: {
  title: string;
  content: string;
  sourceName: string;
  link: string;
  publishedAt: string;
}): Promise<Omit<PoliticalPulseEvent, "fetchedAt"> & { fetchedAt?: string }> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  const id = `evt-${await hashUrl(input.link)}`;

  if (!key) {
    return {
      id,
      eventType: "news",
      title: input.title,
      summary: (input.content || input.title).slice(0, 400),
      fullContent: input.content.slice(0, 8000),
      sourceName: input.sourceName,
      sourceUrl: input.link,
      partyIds: [],
      mpIds: [],
      ministry: null,
      billNumber: null,
      billStatus: null,
      tags: ["ne"],
      publishedAt: input.publishedAt,
      isVerified: false,
      importanceScore: 3,
    };
  }

  const userMessage = `${CLASSIFIER_PROMPT}

Article Title: ${input.title}
Article Content: ${input.content.slice(0, 12000)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        max_tokens: 1024,
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Anthropic ${res.status}: ${t.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = data.content?.find((c) => c.type === "text")?.text ?? "";
    const parsed = parseJsonObject(text);
    if (!parsed) {
      throw new Error("Classifier JSON parse failed");
    }
    const partyIds = resolvePartyIds(parsed.parties_mentioned ?? []);
    return {
      id,
      eventType: mapEventType(parsed.event_type),
      title: input.title,
      summary: parsed.summary ?? "",
      fullContent: input.content.slice(0, 8000),
      sourceName: input.sourceName,
      sourceUrl: input.link,
      partyIds,
      mpIds: [],
      ministry: parsed.ministry,
      billNumber: parsed.bill_number,
      billStatus: parsed.bill_status ?? null,
      tags: parsed.tags ?? [],
      publishedAt: input.publishedAt,
      isVerified: false,
      importanceScore: Math.min(10, Math.max(1, Math.round(Number(parsed.importance_score) || 5))),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function hashUrl(url: string): Promise<string> {
  const data = new TextEncoder().encode(url);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
}
