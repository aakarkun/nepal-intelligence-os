import { describe, expect, test } from "bun:test";
import { extractHallmarkGoldPerTolaNpr } from "../sources/economy";

describe("extractHallmarkGoldPerTolaNpr", () => {
  test("extracts hallmark fine gold per tola from fenegosida text", () => {
    const sample = "FINE GOLD (9999)per 1 tolaरु 273900";
    expect(extractHallmarkGoldPerTolaNpr(sample)).toBe(273900);
  });

  test("extracts comma formatted number", () => {
    const sample = "FINE GOLD (9999) per 1 tola Nrs 3,14,800";
    expect(extractHallmarkGoldPerTolaNpr(sample)).toBe(314800);
  });

  test("returns null for missing pattern", () => {
    expect(extractHallmarkGoldPerTolaNpr("no gold price here")).toBeNull();
  });
});
