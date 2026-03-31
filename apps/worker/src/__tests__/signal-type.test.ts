import { describe, expect, test } from "bun:test";
import { inferSignalType } from "../normalizers/news";

describe("inferSignalType", () => {
  test('"earthquake in Kathmandu" → "disaster"', () => {
    expect(inferSignalType("earthquake in Kathmandu", "")).toBe("disaster");
  });

  test('"NEPSE closes up 1.2%" → "economic"', () => {
    expect(inferSignalType("NEPSE closes up 1.2%", "")).toBe("economic");
  });

  test('"cabinet reshuffle today" → "political"', () => {
    expect(inferSignalType("cabinet reshuffle today", "")).toBe("political");
  });

  test('"bandh called by party" → "security"', () => {
    expect(inferSignalType("bandh called by party", "")).toBe("security");
  });

  test('"ambassador visits Kathmandu" → "diplomatic"', () => {
    expect(inferSignalType("ambassador visits Kathmandu", "")).toBe("diplomatic");
  });

  test('"EDCD issues dengue warning" → "health"', () => {
    expect(inferSignalType("EDCD issues dengue warning", "")).toBe("health");
  });

  test('"general article with no keywords" → "news"', () => {
    expect(inferSignalType("general article with no keywords", "")).toBe("news");
  });

  test("disaster keywords take priority over political", () => {
    expect(
      inferSignalType("earthquake relief cabinet meeting", "")
    ).toBe("disaster");
  });

  test("Nepali keyword match: भूकम्प → disaster", () => {
    expect(inferSignalType("काठमाडौंमा भूकम्प", "")).toBe("disaster");
  });

  test("case-insensitive: FLOOD WARNING → disaster", () => {
    expect(inferSignalType("FLOOD WARNING", "")).toBe("disaster");
  });
});
