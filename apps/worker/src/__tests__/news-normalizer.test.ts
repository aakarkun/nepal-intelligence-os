import { describe, expect, test } from "bun:test";
import {
  inferSeverity,
  inferSignalType,
  normalizeNewsToEvents,
} from "../normalizers/news";

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

describe("inferSignalType", () => {
  test("returns political for cabinet/parliament/coalition", () => {
    expect(inferSignalType("Cabinet reshuffle", "")).toBe("political");
    expect(inferSignalType("Parliament session", "")).toBe("political");
    expect(inferSignalType("Coalition talks", "")).toBe("political");
  });
  test("returns security for protest/police/bandh", () => {
    expect(inferSignalType("Protest in capital", "")).toBe("security");
    expect(inferSignalType("Police deployed", "")).toBe("security");
  });
  test("returns economic for NRB/NEPSE/inflation", () => {
    expect(inferSignalType("NRB rate decision", "")).toBe("economic");
    expect(inferSignalType("NEPSE index rises", "")).toBe("economic");
  });
  test("returns disaster for earthquake/flood/DHM", () => {
    expect(inferSignalType("Earthquake hits region", "")).toBe("disaster");
    expect(inferSignalType("Flood alert from DHM", "")).toBe("disaster");
  });
  test("returns diplomatic for embassy/treaty", () => {
    expect(inferSignalType("Embassy statement", "")).toBe("diplomatic");
    expect(inferSignalType("Bilateral treaty", "")).toBe("diplomatic");
  });
  test("returns health for outbreak/WHO", () => {
    expect(inferSignalType("Outbreak reported", "")).toBe("health");
    expect(inferSignalType("WHO advisory", "")).toBe("health");
  });
  test("returns news when no category matches", () => {
    expect(inferSignalType("Weather update", "")).toBe("news");
  });
});

describe("normalizeNewsToEvents", () => {
  test("applies inferSeverity and inferSignalType to each event", () => {
    const events = normalizeNewsToEvents(
      [
        { title: "Flood alert in valley", description: "Details", link: "https://a.com", pubDate: null },
        { title: "Cabinet meeting today", description: "Agenda", link: "https://b.com", pubDate: null },
      ],
      "source-1",
      "Test Source"
    );
    expect(events).toHaveLength(2);
    expect(events[0].severity).toBe("critical");
    expect(events[0].type).toBe("disaster");
    expect(events[1].severity).toBe("info");
    expect(events[1].type).toBe("political");
  });
});
