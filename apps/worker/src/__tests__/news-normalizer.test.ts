import { describe, expect, test } from "bun:test";
import { inferSeverity, normalizeNewsToEvents } from "../normalizers/news";

describe("inferSeverity", () => {
  test("returns critical for emergency/crisis/alert", () => {
    expect(inferSeverity("Emergency declared in Kathmandu", "")).toBe("critical");
    expect(inferSeverity("Nation in crisis", "")).toBe("critical");
    expect(inferSeverity("Flood alert", "issued for district")).toBe("critical");
  });

  test("returns critical for magnitude 6+", () => {
    expect(inferSeverity("Earthquake magnitude 6.2", "")).toBe("critical");
    expect(inferSeverity("M 7.1 quake", "")).toBe("critical");
  });

  test("returns warning for protest/strike/blockade", () => {
    expect(inferSeverity("Protest in capital", "")).toBe("warning");
    expect(inferSeverity("Nationwide strike", "")).toBe("warning");
    expect(inferSeverity("Blockade continues", "")).toBe("warning");
    expect(inferSeverity("Bandh tomorrow", "")).toBe("warning");
  });

  test("returns info when no escalation keywords", () => {
    expect(inferSeverity("Cabinet meeting today", "")).toBe("info");
    expect(inferSeverity("Regular update", "No major events")).toBe("info");
  });
});

describe("normalizeNewsToEvents", () => {
  test("applies inferSeverity to each event", () => {
    const events = normalizeNewsToEvents(
      [
        { title: "Emergency in valley", description: "Details", link: "https://a.com", pubDate: null },
        { title: "Routine meeting", description: "Agenda", link: "https://b.com", pubDate: null },
      ],
      "source-1",
      "Test Source"
    );
    expect(events).toHaveLength(2);
    expect(events[0].severity).toBe("critical");
    expect(events[1].severity).toBe("info");
  });
});
