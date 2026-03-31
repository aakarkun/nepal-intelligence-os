import { describe, expect, test } from "bun:test";
import {
  getWorldArticles,
  upsertWorldArticles,
} from "../store";
import type { GeopoliticsArticle } from "@repo/shared";

const now = new Date().toISOString();

function sampleArticle(overrides: Partial<GeopoliticsArticle> = {}): GeopoliticsArticle {
  return {
    id: `id-${Math.random().toString(36).slice(2)}`,
    title: "Test",
    url: "https://example.com/a",
    source: "example.com",
    panel: "south_asia",
    tone: null,
    publishedAt: now,
    language: "en",
    imageUrl: null,
    fetchedAt: now,
    ...overrides,
  };
}

describe("World articles (store)", () => {
  test("GET /world/articles returns array", () => {
    const list = getWorldArticles();
    expect(Array.isArray(list)).toBe(true);
  });

  test("GET /world/articles?panel=south_asia filters correctly", () => {
    const a1 = sampleArticle({ id: "sa-1", panel: "south_asia" });
    const a2 = sampleArticle({ id: "dipl-1", panel: "diplomatic" });
    upsertWorldArticles([a1, a2]);
    const filtered = getWorldArticles("south_asia", 20);
    expect(filtered.every((a) => a.panel === "south_asia")).toBe(true);
    expect(filtered.some((a) => a.id === "sa-1")).toBe(true);
    expect(filtered.some((a) => a.id === "dipl-1")).toBe(false);
  });

  test("POST /world/articles upserts without duplicates", () => {
    const id = "upsert-test-id";
    const a1 = sampleArticle({ id, title: "First" });
    const a2 = sampleArticle({ id, title: "Second" });
    upsertWorldArticles([a1]);
    upsertWorldArticles([a2]);
    const list = getWorldArticles(undefined, 100);
    const found = list.filter((a) => a.id === id);
    expect(found.length).toBe(1);
    expect(found[0]!.title).toBe("Second");
  });
});
