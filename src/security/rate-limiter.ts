export interface RateLimitConfig {
  maxTokens: number;
  refillRateMs: number;
  refillAmount: number;
  bucketTtlMs: number;
}

export class RateLimiter {
  private buckets: Map<string, { tokens: number; lastRefill: number }> = new Map();
  private config: RateLimitConfig;
  private pruneCounter = 0;
  private static readonly PRUNE_EVERY = 100;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      maxTokens: 100,
      refillRateMs: 60000,
      refillAmount: 100,
      bucketTtlMs: 600000,
      ...config,
    };
  }

  public consume(clientId: string = "default", cost = 1): boolean {
    this.refill(clientId);

    const bucket = this.buckets.get(clientId)!;
    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      return true;
    }
    return false;
  }

  public checkLimit(clientId: string = "default"): number {
    this.refill(clientId);
    return this.buckets.get(clientId)!.tokens;
  }

  public pruneStaleBuckets(): void {
    const cutoff = Date.now() - this.config.bucketTtlMs;
    for (const [id, bucket] of this.buckets) {
      if (bucket.lastRefill < cutoff) {
        this.buckets.delete(id);
      }
    }
  }

  /**
   * Reset a specific client's token bucket to full capacity.
   * Useful for admin overrides or after authentication.
   */
  public resetClient(clientId: string = "default"): void {
    this.buckets.set(clientId, { tokens: this.config.maxTokens, lastRefill: Date.now() });
  }

  /**
   * Returns live stats: active bucket count, config, and current token levels.
   */
  public getStats(): {
    activeBuckets: number;
    config: RateLimitConfig;
    buckets: Array<{ clientId: string; tokens: number; lastRefillAgo: number }>;
  } {
    const now = Date.now();
    return {
      activeBuckets: this.buckets.size,
      config: { ...this.config },
      buckets: Array.from(this.buckets.entries()).map(([clientId, b]) => ({
        clientId,
        tokens: b.tokens,
        lastRefillAgo: now - b.lastRefill,
      })),
    };
  }

  private refill(clientId: string) {
    const now = Date.now();
    let bucket = this.buckets.get(clientId);

    if (!bucket) {
      bucket = { tokens: this.config.maxTokens, lastRefill: now };
      this.buckets.set(clientId, bucket);
    } else {
      const timePassed = now - bucket.lastRefill;
      if (timePassed > this.config.refillRateMs) {
        const refillPeriods = Math.floor(timePassed / this.config.refillRateMs);
        const newTokens = bucket.tokens + refillPeriods * this.config.refillAmount;
        bucket.tokens = Math.min(newTokens, this.config.maxTokens);
        bucket.lastRefill += refillPeriods * this.config.refillRateMs;
      }
    }

    this.pruneCounter++;
    if (this.pruneCounter >= RateLimiter.PRUNE_EVERY) {
      this.pruneCounter = 0;
      this.pruneStaleBuckets();
    }
  }
}
