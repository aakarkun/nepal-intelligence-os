import { describe, expect, it } from "bun:test";
import { computeGoldNprPerTola, computePercentChange } from "./sidebar-market";

describe("computePercentChange", () => {
  it("returns positive percent change", () => {
    expect(computePercentChange(135, 130)).toBeCloseTo(3.846153846, 6);
  });

  it("returns negative percent change", () => {
    expect(computePercentChange(128, 130)).toBeCloseTo(-1.538461538, 6);
  });

  it("returns null when previous value is missing", () => {
    expect(computePercentChange(130, null)).toBeNull();
  });

  it("returns null when previous value is zero", () => {
    expect(computePercentChange(130, 0)).toBeNull();
  });
});

describe("computeGoldNprPerTola", () => {
  it("converts xau/usd ounce price to npr per tola", () => {
    expect(computeGoldNprPerTola(3000, 133)).toBeCloseTo(149625, 3);
  });
});
