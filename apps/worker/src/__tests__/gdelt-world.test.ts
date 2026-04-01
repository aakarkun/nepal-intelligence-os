import { describe, expect, test } from "bun:test";
import { inferPanelFromText } from "../sources/gdelt-world";

describe("inferPanelFromText", () => {
  test("routes UN keywords to un panel", () => {
    expect(inferPanelFromText("United Nations mission extends mandate", "")).toBe("un");
  });
  test("routes remittance keywords", () => {
    expect(inferPanelFromText("Gulf remittance flows rise", "")).toBe("remittance");
  });
  test("routes diplomatic keywords", () => {
    expect(inferPanelFromText("Embassy hosts bilateral talks", "")).toBe("diplomatic");
  });
  test("defaults to south_asia", () => {
    expect(inferPanelFromText("Local weather in Pokhara", "")).toBe("south_asia");
  });
});
