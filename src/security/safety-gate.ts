/**
 * SafetyGate manages rate limiting and error-based circuit breakers
 * for active testing.
 */
export class SafetyGate {
  private lastRequestTime: number = 0;
  private rpsLimit: number = 2; // Default 2 requests per second
  private consecutive5xxErrors: number = 0;
  private max5xxThreshold: number = 3;

  constructor(opts: { rps?: number; max5xx?: number } = {}) {
    if (opts.rps) this.rpsLimit = opts.rps;
    if (opts.max5xx) this.max5xxThreshold = opts.max5xx;
  }

  /**
   * Enforces rate limiting before a request is sent.
   */
  async wait(): Promise<void> {
    const now = Date.now();
    const minInterval = 1000 / this.rpsLimit;
    const elapsed = now - this.lastRequestTime;

    if (elapsed < minInterval) {
      await new Promise((resolve) => setTimeout(resolve, minInterval - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Record a response to monitor system health.
   */
  handleResponse(statusCode: number): { shouldAbort: boolean; reason?: string } {
    if (statusCode >= 500) {
      this.consecutive5xxErrors++;
      if (this.consecutive5xxErrors >= this.max5xxThreshold) {
        return { 
          shouldAbort: true, 
          reason: `Critical: Server returned ${this.max5xxThreshold} consecutive 5xx errors. Stopping scans to prevent DoS.` 
        };
      }
    } else {
      this.consecutive5xxErrors = 0;
    }
    return { shouldAbort: false };
  }

  /**
   * Reset the error counter.
   */
  reset(): void {
    this.consecutive5xxErrors = 0;
  }
}

export const safetyGate = new SafetyGate();
