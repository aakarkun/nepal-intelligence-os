import { describe, expect, test } from "bun:test";
import { GeopoliticsArticleSchema } from "@repo/shared";
import { getWorldFixtureArticles } from "../world-fixture";

describe("getWorldFixtureArticles", () => {
  test("returns one row per panel that matches schema", () => {
    for (const panel of ["south_asia", "diplomatic", "remittance", "un"] as const) {
      const rows = getWorldFixtureArticles(panel);
      expect(rows.length).toBe(1);
      expect(GeopoliticsArticleSchema.parse(rows[0])).toEqual(rows[0]);
      expect(rows[0].panel).toBe(panel);
    }
  });
});
