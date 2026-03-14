import { describe, expect, test } from "bun:test";
import {
  NepseSummarySchema,
  FloodAlertSchema,
  GeopoliticsArticleSchema,
} from "../schemas";

describe("NepseSummarySchema", () => {
  test("parses valid NEPSE summary object", () => {
    const valid = {
      sourceId: "nepse",
      sourceName: "Merolagani",
      timestamp: new Date().toISOString(),
      index: 2134.56,
      change: 12.34,
      changePercent: 0.58,
      totalTurnover: 1_000_000,
      marketStatus: "closed" as const,
      topGainers: [{ symbol: "NABIL", price: 500, changePercent: 2.5 }],
      topLosers: [{ symbol: "SCB", price: 200, changePercent: -1.2 }],
    };
    expect(NepseSummarySchema.parse(valid)).toEqual(valid);
  });

  test("rejects object missing required fields", () => {
    expect(() =>
      NepseSummarySchema.parse({
        sourceId: "nepse",
        sourceName: "Merolagani",
        // missing timestamp, index
      })
    ).toThrow();
  });

  test("rejects negative index value", () => {
    expect(() =>
      NepseSummarySchema.parse({
        sourceId: "nepse",
        sourceName: "Merolagani",
        timestamp: new Date().toISOString(),
        index: -1,
        change: null,
        changePercent: null,
      })
    ).toThrow();
  });
});

describe("FloodAlertSchema", () => {
  test("parses valid flood alert with all fields", () => {
    const valid = {
      id: "dhm-station1-koshi",
      stationName: "Station A",
      river: "Koshi",
      district: "Sunsari",
      province: 1,
      waterLevel: 5.2,
      normalLevel: 4,
      warningLevel: 6,
      dangerLevel: 8,
      status: "warning" as const,
      trend: "rising" as const,
      observedAt: new Date().toISOString(),
      source: "DHM" as const,
    };
    expect(FloodAlertSchema.parse(valid)).toEqual(valid);
  });

  test("rejects invalid status value", () => {
    expect(() =>
      FloodAlertSchema.parse({
        id: "dhm-x",
        stationName: "X",
        river: "Y",
        district: "Z",
        province: 1,
        waterLevel: 1,
        normalLevel: 1,
        warningLevel: 2,
        dangerLevel: 3,
        status: "invalid",
        observedAt: new Date().toISOString(),
        source: "DHM",
      })
    ).toThrow();
  });

  test("accepts optional trend field", () => {
    const withoutTrend = {
      id: "dhm-x",
      stationName: "X",
      river: "Y",
      district: "Z",
      province: 1,
      waterLevel: 1,
      normalLevel: 1,
      warningLevel: 2,
      dangerLevel: 3,
      status: "normal",
      observedAt: new Date().toISOString(),
      source: "DHM",
    };
    expect(FloodAlertSchema.parse(withoutTrend)).toEqual(withoutTrend);
  });
});

describe("GeopoliticsArticleSchema", () => {
  test("parses valid GDELT article", () => {
    const valid = {
      id: "gdelt-abc",
      title: "Nepal and India sign pact",
      url: "https://example.com/article",
      source: "example.com",
      panel: "south_asia" as const,
      tone: -2.5,
      publishedAt: new Date().toISOString(),
      language: "en",
      imageUrl: null,
      fetchedAt: new Date().toISOString(),
    };
    expect(GeopoliticsArticleSchema.parse(valid)).toEqual(valid);
  });

  test("rejects article with invalid panel value", () => {
    expect(() =>
      GeopoliticsArticleSchema.parse({
        id: "x",
        title: "Title",
        url: "https://example.com",
        source: "example.com",
        panel: "invalid_panel",
        tone: null,
        publishedAt: new Date().toISOString(),
        language: "en",
        imageUrl: null,
        fetchedAt: new Date().toISOString(),
      })
    ).toThrow();
  });
});
