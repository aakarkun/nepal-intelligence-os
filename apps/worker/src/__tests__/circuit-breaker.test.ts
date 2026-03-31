import { describe, expect, test } from "bun:test";
import { CircuitBreaker } from "../lib/circuit-breaker";

describe("CircuitBreaker", () => {
  test("starts closed (isOpen = false)", () => {
    const cb = new CircuitBreaker("test", 3);
    expect(cb.isOpen()).toBe(false);
    expect(cb.getState().suspended).toBe(false);
  });

  test("opens after 3 consecutive failures", () => {
    const cb = new CircuitBreaker("test", 3);
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.isOpen()).toBe(false);
    cb.recordFailure();
    expect(cb.isOpen()).toBe(true);
    expect(cb.getState().suspended).toBe(true);
  });

  test("resets to closed after reset()", () => {
    const cb = new CircuitBreaker("test", 3);
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.isOpen()).toBe(true);
    cb.reset();
    expect(cb.isOpen()).toBe(false);
    expect(cb.getState().failures).toBe(0);
    expect(cb.getState().suspendedAt).toBeNull();
  });

  test("does not open on alternating success/failure", () => {
    const cb = new CircuitBreaker("test", 3);
    cb.recordFailure();
    cb.recordSuccess();
    cb.recordFailure();
    cb.recordSuccess();
    cb.recordFailure();
    expect(cb.isOpen()).toBe(false);
  });

  test("records suspendedAt timestamp when opened", () => {
    const cb = new CircuitBreaker("test", 3);
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    const state = cb.getState();
    expect(state.suspendedAt).toBeInstanceOf(Date);
    expect(state.suspended).toBe(true);
  });
});
