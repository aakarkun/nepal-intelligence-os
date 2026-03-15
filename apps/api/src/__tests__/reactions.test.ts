import { describe, expect, test } from "bun:test";
import {
  addReaction,
  removeReaction,
  getReactionStatus,
  getReactionsBatch,
  associateEmailWithFingerprint,
} from "../store";

const fp1 = "fp-test-1";
const fp2 = "fp-test-2";
const itemId1 = "item-1";
const itemId2 = "item-2";
const title = "Test title";

describe("Reactions API", () => {
  test("POST creates reaction and returns count: 1", () => {
    const result = addReaction({
      itemId: itemId1,
      itemTitle: title,
      reaction: "like",
      email: null,
      fingerprint: fp1,
    });
    expect(result.liked).toBe(true);
    expect(result.count).toBe(1);
  });

  test("POST with same fingerprint + itemId does not duplicate, returns count: 1", () => {
    const result = addReaction({
      itemId: itemId1,
      itemTitle: title,
      reaction: "like",
      email: null,
      fingerprint: fp1,
    });
    expect(result.liked).toBe(true);
    expect(result.count).toBe(1);
  });

  test("DELETE removes reaction, returns count: 0", () => {
    const result = removeReaction(itemId1, fp1);
    expect(result.liked).toBe(false);
    expect(result.count).toBe(0);
  });

  test("GET batch returns correct counts for multiple items", () => {
    addReaction({ itemId: "batch-a", itemTitle: "A", reaction: "like", email: null, fingerprint: fp1 });
    addReaction({ itemId: "batch-a", itemTitle: "A", reaction: "like", email: null, fingerprint: fp2 });
    addReaction({ itemId: "batch-b", itemTitle: "B", reaction: "like", email: null, fingerprint: fp1 });
    const batch = getReactionsBatch(["batch-a", "batch-b", "batch-c"], fp1);
    expect(batch["batch-a"]?.count).toBe(2);
    expect(batch["batch-b"]?.count).toBe(1);
    expect(batch["batch-c"]?.count).toBe(0);
  });

  test("GET batch returns liked: true for matching fingerprint", () => {
    const batch = getReactionsBatch(["batch-a", "batch-b"], fp1);
    expect(batch["batch-a"]?.liked).toBe(true);
    expect(batch["batch-b"]?.liked).toBe(true);
    const batchFp2 = getReactionsBatch(["batch-a", "batch-b"], fp2);
    expect(batchFp2["batch-a"]?.liked).toBe(true);
    expect(batchFp2["batch-b"]?.liked).toBe(false);
  });

  test("PATCH associate-email updates null emails only", () => {
    addReaction({
      itemId: "email-item",
      itemTitle: "Email",
      reaction: "like",
      email: null,
      fingerprint: "fp-email",
    });
    const n = associateEmailWithFingerprint("fp-email", "user@example.com");
    expect(n).toBeGreaterThanOrEqual(1);
    const again = associateEmailWithFingerprint("fp-email", "other@example.com");
    expect(again).toBe(0);
  });

  test("GET status returns count and liked", () => {
    const status = getReactionStatus("batch-a", undefined);
    expect(status.count).toBeGreaterThanOrEqual(0);
    expect(typeof status.liked).toBe("boolean");
    const withFp = getReactionStatus("batch-a", fp1);
    expect(withFp.liked).toBe(true);
  });
});
