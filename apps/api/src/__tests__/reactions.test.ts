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
  test("POST creates reaction and returns count: 1", async () => {
    const itemId = `${itemId1}-${Math.random().toString(16).slice(2)}`;
    const fp = `${fp1}-${Math.random().toString(16).slice(2)}`;
    const result = addReaction({
      itemId,
      itemTitle: title,
      reaction: "like",
      email: null,
      fingerprint: fp,
    });
    const resolved = result instanceof Promise ? await result : result;
    expect(resolved.liked).toBe(true);
    expect(resolved.count).toBe(1);
  });

  test("POST with same fingerprint + itemId does not duplicate, returns count: 1", async () => {
    const itemId = `${itemId1}-${Math.random().toString(16).slice(2)}`;
    const fp = `${fp1}-${Math.random().toString(16).slice(2)}`;
    const first = addReaction({
      itemId,
      itemTitle: title,
      reaction: "like",
      email: null,
      fingerprint: fp,
    });
    const firstResolved = first instanceof Promise ? await first : first;
    expect(firstResolved.liked).toBe(true);
    expect(firstResolved.count).toBe(1);

    const again = addReaction({
      itemId,
      itemTitle: title,
      reaction: "like",
      email: null,
      fingerprint: fp,
    });
    const againResolved = again instanceof Promise ? await again : again;
    expect(againResolved.liked).toBe(true);
    expect(againResolved.count).toBe(1);
  });

  test("DELETE removes reaction, returns count: 0", async () => {
    const itemId = `${itemId1}-${Math.random().toString(16).slice(2)}`;
    const fp = `${fp1}-${Math.random().toString(16).slice(2)}`;
    const created = addReaction({ itemId, itemTitle: title, reaction: "like", email: null, fingerprint: fp });
    if (created instanceof Promise) await created;
    const result = removeReaction(itemId, fp);
    const resolved = result instanceof Promise ? await result : result;
    expect(resolved.liked).toBe(false);
    expect(resolved.count).toBe(0);
  });

  test("GET batch returns correct counts for multiple items", async () => {
    const suffix = Math.random().toString(16).slice(2);
    const a = `batch-a-${suffix}`;
    const b = `batch-b-${suffix}`;
    const c = `batch-c-${suffix}`;
    const r1 = addReaction({ itemId: a, itemTitle: "A", reaction: "like", email: null, fingerprint: fp1 });
    const r2 = addReaction({ itemId: a, itemTitle: "A", reaction: "like", email: null, fingerprint: fp2 });
    const r3 = addReaction({ itemId: b, itemTitle: "B", reaction: "like", email: null, fingerprint: fp1 });
    if (r1 instanceof Promise) await r1;
    if (r2 instanceof Promise) await r2;
    if (r3 instanceof Promise) await r3;
    const batch = getReactionsBatch([a, b, c], fp1);
    const resolved = batch instanceof Promise ? await batch : batch;
    expect(resolved[a]?.count).toBe(2);
    expect(resolved[b]?.count).toBe(1);
    expect(resolved[c]?.count).toBe(0);
  });

  test("GET batch returns liked: true for matching fingerprint", async () => {
    const suffix = Math.random().toString(16).slice(2);
    const a = `batch-a-${suffix}`;
    const b = `batch-b-${suffix}`;
    const r1 = addReaction({ itemId: a, itemTitle: "A", reaction: "like", email: null, fingerprint: fp1 });
    const r2 = addReaction({ itemId: a, itemTitle: "A", reaction: "like", email: null, fingerprint: fp2 });
    const r3 = addReaction({ itemId: b, itemTitle: "B", reaction: "like", email: null, fingerprint: fp1 });
    if (r1 instanceof Promise) await r1;
    if (r2 instanceof Promise) await r2;
    if (r3 instanceof Promise) await r3;
    const batch = getReactionsBatch([a, b], fp1);
    const resolved = batch instanceof Promise ? await batch : batch;
    expect(resolved[a]?.liked).toBe(true);
    expect(resolved[b]?.liked).toBe(true);
    const batchFp2 = getReactionsBatch([a, b], fp2);
    const resolved2 = batchFp2 instanceof Promise ? await batchFp2 : batchFp2;
    expect(resolved2[a]?.liked).toBe(true);
    expect(resolved2[b]?.liked).toBe(false);
  });

  test("PATCH associate-email updates null emails only", async () => {
    const fp = `fp-email-${Math.random().toString(16).slice(2)}`;
    const created = addReaction({
      itemId: "email-item",
      itemTitle: "Email",
      reaction: "like",
      email: null,
      fingerprint: fp,
    });
    if (created instanceof Promise) await created;
    const n = associateEmailWithFingerprint(fp, "user@example.com");
    const nResolved = n instanceof Promise ? await n : n;
    expect(nResolved).toBeGreaterThanOrEqual(1);
    const again = associateEmailWithFingerprint(fp, "other@example.com");
    const againResolved = again instanceof Promise ? await again : again;
    expect(againResolved).toBe(0);
  });

  test("GET status returns count and liked", async () => {
    const suffix = Math.random().toString(16).slice(2);
    const id = `status-${suffix}`;
    const created = addReaction({ itemId: id, itemTitle: "Status", reaction: "like", email: null, fingerprint: fp1 });
    if (created instanceof Promise) await created;
    const status = getReactionStatus(id, undefined);
    const statusResolved = status instanceof Promise ? await status : status;
    expect(statusResolved.count).toBeGreaterThanOrEqual(0);
    expect(typeof statusResolved.liked).toBe("boolean");
    const withFp = getReactionStatus(id, fp1);
    const withFpResolved = withFp instanceof Promise ? await withFp : withFp;
    expect(withFpResolved.liked).toBe(true);
  });
});
