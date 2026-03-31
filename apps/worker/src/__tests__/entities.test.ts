import { describe, expect, test } from "bun:test";
import { extractEntities } from "../normalizers/entities";

describe("extractEntities", () => {
  test("returns empty when no match", () => {
    const r = extractEntities("Random update with no parties or districts.");
    expect(r.people).toEqual([]);
    expect(r.parties).toEqual([]);
    expect(r.districts).toEqual([]);
  });

  test("extracts parties", () => {
    const r = extractEntities("NC and UML agreed in Kathmandu.");
    expect(r.parties).toContain("NC");
    expect(r.parties).toContain("UML");
    expect(r.districts).toContain("Kathmandu");
  });

  test("extracts districts", () => {
    const r = extractEntities("Flood alert in Sunsari and Morang.");
    expect(r.districts).toContain("Sunsari");
    expect(r.districts).toContain("Morang");
  });

  test("returns empty for empty or non-string", () => {
    expect(extractEntities("")).toEqual({
      people: [],
      parties: [],
      districts: [],
    });
    expect(extractEntities(null as unknown as string)).toEqual({
      people: [],
      parties: [],
      districts: [],
    });
  });
});
