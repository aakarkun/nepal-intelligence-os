import { describe, expect, test } from "bun:test";
import { getFingerprint } from "../fingerprint";

describe("getFingerprint", () => {
  test("returns a non-empty string", () => {
    const fp = getFingerprint();
    expect(typeof fp).toBe("string");
    expect(fp.length).toBeGreaterThan(0);
  });

  test("returns the same value on second call", () => {
    const a = getFingerprint();
    const b = getFingerprint();
    expect(a).toBe(b);
  });

  test("two different inputs produce different djb2 hashes", () => {
    const djb2 = (str: string): string => {
      let hash = 5381;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) + hash + str.charCodeAt(i);
        hash = hash & 0x7fffffff;
      }
      return Math.abs(hash).toString(36);
    };
    const combined1 = ["Agent1", "en", "1920x1080", "UTC", "0"].join("|");
    const combined2 = ["Agent2", "en", "1920x1080", "UTC", "0"].join("|");
    expect(djb2(combined1)).not.toBe(djb2(combined2));
  });
});
