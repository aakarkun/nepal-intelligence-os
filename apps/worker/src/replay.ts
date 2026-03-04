import { Database } from "bun:sqlite";
import path from "node:path";
import type {
  NationalSummary,
  ConstituencyResult,
  SignalEvent,
} from "@repo/shared";

type ReplayEvent =
  | { kind: "summary"; timestamp: string; data: NationalSummary }
  | { kind: "snapshot"; timestamp: string; data: ConstituencyResult }
  | { kind: "event"; timestamp: string; data: SignalEvent };

const FIXTURES_DIR = path.resolve(import.meta.dir, "../fixtures");

async function loadFixtures(): Promise<ReplayEvent[]> {
  const summaries: NationalSummary[] = await Bun.file(
    path.join(FIXTURES_DIR, "national_summary.json")
  ).json();
  const constituencies: ConstituencyResult[] = await Bun.file(
    path.join(FIXTURES_DIR, "constituency_results.json")
  ).json();
  const events: SignalEvent[] = await Bun.file(
    path.join(FIXTURES_DIR, "event_feed.json")
  ).json();

  const timeline: ReplayEvent[] = [
    ...summaries.map(
      (d): ReplayEvent => ({ kind: "summary", timestamp: d.timestamp, data: d })
    ),
    ...constituencies.map(
      (d): ReplayEvent => ({
        kind: "snapshot",
        timestamp: d.lastUpdate,
        data: d,
      })
    ),
    ...events.map(
      (d): ReplayEvent => ({ kind: "event", timestamp: d.timestamp, data: d })
    ),
  ];

  timeline.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return timeline;
}

const ENDPOINT_MAP: Record<ReplayEvent["kind"], string> = {
  summary: "/v1/ingest/summary",
  snapshot: "/v1/ingest/snapshot",
  event: "/v1/ingest/event",
};

function openCursorDb(): Database {
  const dbPath = path.resolve(import.meta.dir, "../.replay-cursor.sqlite");
  const db = new Database(dbPath, { create: true });
  db.run(
    "CREATE TABLE IF NOT EXISTS cursor (id INTEGER PRIMARY KEY CHECK (id = 1), position INTEGER NOT NULL)"
  );
  const row = db.query("SELECT position FROM cursor WHERE id = 1").get() as
    | { position: number }
    | null;
  if (row === null) {
    db.run("INSERT INTO cursor (id, position) VALUES (1, 0)");
  }
  return db;
}

function getCursor(db: Database): number {
  const row = db.query("SELECT position FROM cursor WHERE id = 1").get() as {
    position: number;
  };
  return row.position;
}

function setCursor(db: Database, position: number): void {
  db.run("UPDATE cursor SET position = ? WHERE id = 1", [position]);
}

export async function runReplay(options: {
  apiUrl: string;
  speed: number;
}): Promise<void> {
  const { apiUrl, speed } = options;

  const timeline = await loadFixtures();
  const db = openCursorDb();
  const startIndex = getCursor(db);

  console.log(
    `[replay] Loaded ${timeline.length} events | Starting from index ${startIndex} | Speed: ${speed}x`
  );

  if (startIndex >= timeline.length) {
    console.log("[replay] All events already replayed. Reset cursor to replay again.");
    db.close();
    return;
  }

  for (let i = startIndex; i < timeline.length; i++) {
    const event = timeline[i];
    const endpoint = `${apiUrl}${ENDPOINT_MAP[event.kind]}`;

    if (i > startIndex) {
      const prevTime = new Date(timeline[i - 1].timestamp).getTime();
      const currTime = new Date(event.timestamp).getTime();
      const delayMs = Math.max(0, (currTime - prevTime) / speed);

      if (delayMs > 0) {
        await Bun.sleep(delayMs);
      }
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event.data),
      });

      const status = res.ok ? "OK" : `ERR ${res.status}`;
      console.log(
        `[replay] [${i + 1}/${timeline.length}] ${event.kind.toUpperCase()} → ${status} | ${event.timestamp}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[replay] [${i + 1}/${timeline.length}] ${event.kind.toUpperCase()} → FAIL | ${message}`
      );
    }

    setCursor(db, i + 1);
  }

  console.log("[replay] Replay complete.");
  db.close();
}
