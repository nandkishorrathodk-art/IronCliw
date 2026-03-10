/**
 * SafetyGate manages rate limiting, input throttling, and error-based
 * circuit breakers for active testing and desktop automation.
 */
export class SafetyGate {
  private lastRequestTime: number = 0;
  private lastInputTime: number = 0;

  private rpsLimit: number = 2;
  private ipsLimit: number = 5;

  private consecutive5xxErrors: number = 0;
  private max5xxThreshold: number = 3;

  private requestQueue: Promise<void> = Promise.resolve();
  private inputQueue: Promise<void> = Promise.resolve();

  constructor(opts: { rps?: number; ips?: number; max5xx?: number } = {}) {
    if (opts.rps) {
      this.rpsLimit = opts.rps;
    }
    if (opts.ips) {
      this.ipsLimit = opts.ips;
    }
    if (opts.max5xx) {
      this.max5xxThreshold = opts.max5xx;
    }
  }

  /**
   * Enforces rate limiting before a network request is sent.
   * Serialized via a promise chain — safe for concurrent callers.
   */
  async wait(): Promise<void> {
    const next = this.requestQueue.then(async () => {
      const now = Date.now();
      const minInterval = 1000 / this.rpsLimit;
      const elapsed = now - this.lastRequestTime;
      if (elapsed < minInterval) {
        await new Promise<void>((resolve) => setTimeout(resolve, minInterval - elapsed));
      }
      this.lastRequestTime = Date.now();
    });
    this.requestQueue = next.catch(() => {});
    return next;
  }

  /**
   * Enforces rate limiting for desktop inputs (mouse/keyboard).
   * Serialized via a promise chain — safe for concurrent callers.
   */
  async waitInput(): Promise<void> {
    const next = this.inputQueue.then(async () => {
      const now = Date.now();
      const minInterval = 1000 / this.ipsLimit;
      const elapsed = now - this.lastInputTime;
      if (elapsed < minInterval) {
        await new Promise<void>((resolve) => setTimeout(resolve, minInterval - elapsed));
      }
      this.lastInputTime = Date.now();
    });
    this.inputQueue = next.catch(() => {});
    return next;
  }

  /**
   * Validates if a high-risk system action should be allowed or rejected.
   */
  public isSystemActionAllowed(action: string): { allowed: boolean; reason?: string } {
    const forbidden = ["format", "fdisk", "del /s /q c:\\windows", "rm -rf /"];
    const normalized = action.toLowerCase();

    if (forbidden.some((f) => normalized.includes(f))) {
      return { allowed: false, reason: "Forbidden: Critical system destruction command detected." };
    }

    return { allowed: true };
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
          reason: `Critical: Server returned ${this.max5xxThreshold} consecutive 5xx errors. Stopping scans to prevent DoS.`,
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
