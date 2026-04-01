import { env } from "../env";
import { postWeeklyDigest } from "../ingest-client";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-20250514";

type EventLite = { title: string; eventType: string; publishedAt: string };

/**
 * Monday digest (Nepal time). Requires ANTHROPIC_API_KEY.
 */
export async function runWeeklyDigestIfDue(): Promise<void> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return;

  const now = new Date();
  const ktm = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kathmandu" }));
  const dow = ktm.getDay();
  const hour = ktm.getHours();
  if (dow !== 1 || hour < 6 || hour > 11) {
    return;
  }

  const res = await fetch(
    `${env.API_URL.replace(/\/$/, "")}/v1/political-pulse/events?limit=50&page=1`
  );
  if (!res.ok) return;
  const data = (await res.json()) as { events?: EventLite[] };
  const events = data.events ?? [];
  if (events.length === 0) return;

  const lines = events
    .slice(0, 40)
    .map((e) => `- [${e.eventType}] ${e.publishedAt} ${e.title}`)
    .join("\n");

  const userMessage = `Summarize this week in Nepal governance for a policy newsletter (English, 4–6 short paragraphs). Cover bills, cabinet, and parliament signals. Data:\n${lines}`;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 30_000);
  try {
    const ar = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!ar.ok) return;
    const body = (await ar.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = body.content?.find((c) => c.type === "text")?.text ?? "";
    if (!text.trim()) return;

    const start = new Date(ktm);
    start.setDate(start.getDate() - 7);
    await postWeeklyDigest(env.API_URL, {
      content: text,
      periodStart: start.toISOString().slice(0, 10),
      periodEnd: ktm.toISOString().slice(0, 10),
      generatedAt: new Date().toISOString(),
    });
    console.log("[political-weekly] Digest posted");
  } catch {
    clearTimeout(t);
  }
}
