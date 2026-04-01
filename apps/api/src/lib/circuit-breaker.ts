/**
 * Circuit breaker for external services (e.g. Anthropic).
 * After `threshold` consecutive failures, the source is suspended. Auto-reset after 1 hour.
 */

const AUTO_RESET_MS = 60 * 60 * 1000;

export type CircuitBreakerState = {
  sourceId: string;
  failures: number;
  suspended: boolean;
  suspendedAt: Date | null;
};

export class CircuitBreaker {
  private failures = 0;
  private suspendedAt: Date | null = null;

  constructor(
    public readonly sourceId: string,
    private readonly threshold: number = 3
  ) {}

  recordSuccess(): void {
    this.failures = 0;
    this.suspendedAt = null;
  }

  recordFailure(): void {
    this.failures += 1;
    if (this.failures >= this.threshold && !this.suspendedAt) {
      this.suspendedAt = new Date();
    }
  }

  isOpen(): boolean {
    if (this.suspendedAt) {
      const elapsed = Date.now() - this.suspendedAt.getTime();
      if (elapsed >= AUTO_RESET_MS) {
        this.suspendedAt = null;
        this.failures = 0;
        return false;
      }
    }
    return this.failures >= this.threshold;
  }

  getState(): CircuitBreakerState {
    return {
      sourceId: this.sourceId,
      failures: this.failures,
      suspended: this.isOpen(),
      suspendedAt: this.suspendedAt,
    };
  }

  reset(): void {
    this.failures = 0;
    this.suspendedAt = null;
  }
}

const breakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(sourceId: string, threshold = 3): CircuitBreaker {
  let cb = breakers.get(sourceId);
  if (!cb) {
    cb = new CircuitBreaker(sourceId, threshold);
    breakers.set(sourceId, cb);
  }
  return cb;
}
