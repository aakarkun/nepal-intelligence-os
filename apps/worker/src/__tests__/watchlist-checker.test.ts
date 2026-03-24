import { describe, expect, test } from "bun:test";
import type { WatchlistItem } from "@repo/shared";
import {
  evaluateWatchlistItem,
  normalizeSignalsFromFeedResponse,
  type WatchlistContext,
} from "../lib/watchlist-checker";

function item(
  overrides: Partial<WatchlistItem> & { type: WatchlistItem["type"]; value: string }
): WatchlistItem {
  return {
    id: "test-id",
    label: "Test",
    type: overrides.type,
    value: overrides.value,
    threshold: overrides.threshold,
    telegramChatId: overrides.telegramChatId,
    createdAt: new Date().toISOString(),
    lastTriggeredAt: overrides.lastTriggeredAt,
    active: true,
  };
}

function emptyContext(): WatchlistContext {
  return {
    signals: [],
    crisisSummary: null,
    crisisIncidents: [],
    floodAlerts: [],
    earthquakes: [],
    nepseSummary: null,
    assetQuotes: [],
  };
}

describe("evaluateWatchlistItem", () => {
  describe("keyword", () => {
    test("matches when value appears in signal title", () => {
      const ctx = emptyContext();
      ctx.signals = [{ title: "Earthquake hits Kathmandu", body: "" }];
      expect(
        evaluateWatchlistItem(item({ type: "keyword", value: "kathmandu" }), ctx)
      ).toBe(true);
    });
    test("matches when value appears in signal body", () => {
      const ctx = emptyContext();
      ctx.signals = [{ title: "Update", body: "Flood alert in Sunsari district" }];
      expect(
        evaluateWatchlistItem(item({ type: "keyword", value: "sunsari" }), ctx)
      ).toBe(true);
    });
    test("no match when value not in any signal", () => {
      const ctx = emptyContext();
      ctx.signals = [{ title: "Other news", body: "No match" }];
      expect(
        evaluateWatchlistItem(item({ type: "keyword", value: "kathmandu" }), ctx)
      ).toBe(false);
    });
    test("no match for empty value", () => {
      const ctx = emptyContext();
      ctx.signals = [{ title: "Anything", body: "" }];
      expect(
        evaluateWatchlistItem(item({ type: "keyword", value: "" }), ctx)
      ).toBe(false);
    });
  });

  describe("constituency", () => {
    test("matches when constituencyId equals value", () => {
      const ctx = emptyContext();
      ctx.signals = [
        { title: "Result", body: "", constituencyId: "kathmandu-1" },
      ];
      expect(
        evaluateWatchlistItem(
          item({ type: "constituency", value: "kathmandu-1" }),
          ctx
        )
      ).toBe(true);
    });
    test("matches when value appears in title", () => {
      const ctx = emptyContext();
      ctx.signals = [{ title: "Kathmandu 1 result", body: "" }];
      expect(
        evaluateWatchlistItem(
          item({ type: "constituency", value: "kathmandu" }),
          ctx
        )
      ).toBe(true);
    });
    test("no match when no signals have constituency", () => {
      const ctx = emptyContext();
      ctx.signals = [{ title: "Other", body: "No constituency" }];
      expect(
        evaluateWatchlistItem(
          item({ type: "constituency", value: "kathmandu-1" }),
          ctx
        )
      ).toBe(false);
    });
  });

  describe("district", () => {
    test("matches when earthquake place contains value", () => {
      const ctx = emptyContext();
      ctx.earthquakes = [{ place: "10 km E of Kathmandu, Nepal" }];
      expect(
        evaluateWatchlistItem(item({ type: "district", value: "Kathmandu" }), ctx)
      ).toBe(true);
    });
    test("matches when flood alert district contains value", () => {
      const ctx = emptyContext();
      ctx.floodAlerts = [{ district: "Sunsari" }];
      expect(
        evaluateWatchlistItem(item({ type: "district", value: "sunsari" }), ctx)
      ).toBe(true);
    });
    test("matches when crisis incident place contains value", () => {
      const ctx = emptyContext();
      ctx.crisisIncidents = [{ place: "Protest in Lalitpur" }];
      expect(
        evaluateWatchlistItem(item({ type: "district", value: "lalitpur" }), ctx)
      ).toBe(true);
    });
    test("no match when value not in any source", () => {
      const ctx = emptyContext();
      ctx.earthquakes = [{ place: "Somewhere else" }];
      expect(
        evaluateWatchlistItem(item({ type: "district", value: "kathmandu" }), ctx)
      ).toBe(false);
    });
  });

  describe("price_threshold", () => {
    test("matches when NEPSE index >= threshold", () => {
      const ctx = emptyContext();
      ctx.nepseSummary = { index: 2100 };
      expect(
        evaluateWatchlistItem(
          item({ type: "price_threshold", value: "nepse", threshold: 2000 }),
          ctx
        )
      ).toBe(true);
    });
    test("no match when NEPSE index < threshold", () => {
      const ctx = emptyContext();
      ctx.nepseSummary = { index: 1900 };
      expect(
        evaluateWatchlistItem(
          item({ type: "price_threshold", value: "nepse", threshold: 2000 }),
          ctx
        )
      ).toBe(false);
    });
    test("matches when asset price >= threshold", () => {
      const ctx = emptyContext();
      ctx.assetQuotes = [
        { assetCode: "BTC", price: 50000 },
        { assetCode: "ETH", price: 3000 },
      ];
      expect(
        evaluateWatchlistItem(
          item({ type: "price_threshold", value: "BTC", threshold: 45000 }),
          ctx
        )
      ).toBe(true);
    });
    test("no match when threshold undefined", () => {
      const ctx = emptyContext();
      ctx.nepseSummary = { index: 2100 };
      expect(
        evaluateWatchlistItem(
          item({ type: "price_threshold", value: "nepse" }),
          ctx
        )
      ).toBe(false);
    });
    test("no match when no nepse and value is nepse", () => {
      const ctx = emptyContext();
      expect(
        evaluateWatchlistItem(
          item({ type: "price_threshold", value: "nepse", threshold: 1000 }),
          ctx
        )
      ).toBe(false);
    });
  });

  describe("crisis_severity", () => {
    test("matches when severity count > 0", () => {
      const ctx = emptyContext();
      ctx.crisisSummary = {
        incidentsBySeverity: {
          minor: 2,
          light: 1,
          moderate: 0,
          strongPlus: 0,
        },
      };
      expect(
        evaluateWatchlistItem(
          item({ type: "crisis_severity", value: "moderate" }),
          ctx
        )
      ).toBe(false);
      expect(
        evaluateWatchlistItem(
          item({ type: "crisis_severity", value: "minor" }),
          ctx
        )
      ).toBe(true);
    });
    test("no match when crisis summary null", () => {
      const ctx = emptyContext();
      expect(
        evaluateWatchlistItem(
          item({ type: "crisis_severity", value: "moderate" }),
          ctx
        )
      ).toBe(false);
    });
    test("no match when severity count 0", () => {
      const ctx = emptyContext();
      ctx.crisisSummary = {
        incidentsBySeverity: {
          minor: 0,
          light: 0,
          moderate: 0,
          strongPlus: 0,
        },
      };
      expect(
        evaluateWatchlistItem(
          item({ type: "crisis_severity", value: "strongPlus" }),
          ctx
        )
      ).toBe(false);
    });
  });
});

describe("normalizeSignalsFromFeedResponse", () => {
  test("extracts events from paginated feed payload", () => {
    const payload = {
      events: [{ title: "Kathmandu update", body: "Signal body", constituencyId: "ktm-1" }],
      total: 1,
    };
    expect(normalizeSignalsFromFeedResponse(payload)).toEqual(payload.events);
  });

  test("supports legacy array payload", () => {
    const payload = [{ title: "Headline", body: "Body" }];
    expect(normalizeSignalsFromFeedResponse(payload)).toEqual(payload);
  });

  test("returns empty array for invalid payload", () => {
    expect(normalizeSignalsFromFeedResponse({ total: 10 })).toEqual([]);
    expect(normalizeSignalsFromFeedResponse(null)).toEqual([]);
  });
});
