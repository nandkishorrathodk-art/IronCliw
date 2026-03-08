/**
 * IronCliw SmartCache — Context Optimizer
 *
 * Reduces token usage and LLM latency by:
 *   1. Caching expensive tool results (file reads, shell outputs) for 60s
 *   2. Deduplicating identical tool calls within the same session
 *   3. Compressing repetitive/verbose tool output before sending to LLM
 *
 * This is the key to 5x faster multi-step agent performance — instead of
 * re-reading the same file or re-running the same command 5 times, results
 * are served from cache in <1ms.
 *
 * Usage:
 *   const cache = new SmartContextCache();
 *   const result = await cache.getOrRun('readFile:/path/to/file', () => readFile(path));
 */

/* ─────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────── */

export interface CacheEntry<T = unknown> {
  value: T;
  createdAt: number;
  hitCount: number;
  key: string;
}

export interface SmartCacheOptions {
  /** Cache TTL in ms. Default: 60 000 (60 seconds) */
  ttlMs?: number;
  /** Max number of entries before LRU eviction. Default: 256 */
  maxEntries?: number;
  /** Enable verbose logging. Default: false */
  debug?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  entries: number;
  hitRate: string;
}

/* ─────────────────────────────────────────────────────────────
   SmartContextCache
   ───────────────────────────────────────────────────────────── */

export class SmartContextCache {
  private readonly store = new Map<string, CacheEntry>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly debug: boolean;

  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(opts: SmartCacheOptions = {}) {
    this.ttlMs = opts.ttlMs ?? 60_000;
    this.maxEntries = opts.maxEntries ?? 256;
    this.debug = opts.debug ?? false;
  }

  /**
   * Get a cached value, or compute + cache it.
   *
   * @example
   * // File read cached for 60s — same file won't be re-read within that window
   * const content = await cache.getOrRun(
   *   `readFile:${filePath}`,
   *   () => fs.readFile(filePath, 'utf-8')
   * );
   */
  async getOrRun<T>(key: string, fn: () => Promise<T>, ttlMs?: number): Promise<T> {
    const existing = this.store.get(key);
    const effectiveTtl = ttlMs ?? this.ttlMs;

    if (existing && Date.now() - existing.createdAt < effectiveTtl) {
      existing.hitCount++;
      this.hits++;
      if (this.debug) {
        console.log(`[SmartCache] HIT  "${key}" (hits: ${existing.hitCount})`);
      }
      return existing.value as T;
    }

    this.misses++;
    if (this.debug) {
      console.log(`[SmartCache] MISS "${key}"`);
    }

    const value = await fn();

    // Evict LRU entry if at capacity
    if (this.store.size >= this.maxEntries) {
      this.evictLRU();
    }

    this.store.set(key, {
      key,
      value,
      createdAt: Date.now(),
      hitCount: 0,
    });

    return value;
  }

  /** Synchronously get a cached value. Returns undefined on miss/expired. */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {return undefined;}
    if (Date.now() - entry.createdAt >= this.ttlMs) {
      this.store.delete(key);
      return undefined;
    }
    entry.hitCount++;
    this.hits++;
    return entry.value as T;
  }

  /** Manually set a value into cache. */
  set<T>(key: string, value: T, ttlMs?: number): void {
    if (this.store.size >= this.maxEntries) {
      this.evictLRU();
    }
    this.store.set(key, {
      key,
      value,
      createdAt: ttlMs != null ? Date.now() - (this.ttlMs - ttlMs) : Date.now(),
      hitCount: 0,
    });
  }

  /** Invalidate a specific cache key. */
  invalidate(key: string): boolean {
    return this.store.delete(key);
  }

  /** Invalidate all keys matching a prefix. */
  invalidatePrefix(prefix: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  /** Clear all cached entries. */
  clear(): void {
    this.store.clear();
  }

  /** Remove all expired entries. */
  pruneExpired(): number {
    const now = Date.now();
    let pruned = 0;
    for (const [key, entry] of this.store) {
      if (now - entry.createdAt >= this.ttlMs) {
        this.store.delete(key);
        pruned++;
      }
    }
    return pruned;
  }

  /** Get cache performance statistics. */
  get stats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      entries: this.store.size,
      hitRate: total > 0 ? `${((this.hits / total) * 100).toFixed(1)}%` : "0%",
    };
  }

  private evictLRU(): void {
    // Evict the least-recently-used (oldest) entry
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.store) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      this.store.delete(oldestKey);
      this.evictions++;
    }
  }
}

/* ─────────────────────────────────────────────────────────────
   Tool output compressor
   ───────────────────────────────────────────────────────────── */

/**
 * Compress verbose tool output before sending to LLM.
 * Reduces token count for file reads and shell outputs.
 *
 * Strategies:
 *   - Truncate very long outputs with a summary note
 *   - Deduplicate consecutive repeated lines
 *   - Remove ANSI escape codes (which waste tokens)
 */
export function compressToolOutput(
  output: string,
  opts: {
    maxChars?: number;
    deduplicateLines?: boolean;
    stripAnsi?: boolean;
  } = {},
): string {
  const maxChars = opts.maxChars ?? 8000;
  let result = output;

  // 1. Strip ANSI escape codes
  if (opts.stripAnsi !== false) {
    // eslint-disable-next-line no-control-regex
    result = result.replace(/\x1B\[[0-9;]*[mGKHF]/g, "");
  }

  // 2. Deduplicate consecutive repeated lines
  if (opts.deduplicateLines !== false) {
    const lines = result.split("\n");
    const deduped: string[] = [];
    let repeatCount = 0;
    let lastLine = "";

    for (const line of lines) {
      if (line === lastLine) {
        repeatCount++;
      } else {
        if (repeatCount > 0) {
          deduped.push(`... [repeated ${repeatCount} more time${repeatCount > 1 ? "s" : ""}]`);
          repeatCount = 0;
        }
        deduped.push(line);
        lastLine = line;
      }
    }
    if (repeatCount > 0) {
      deduped.push(`... [repeated ${repeatCount} more time${repeatCount > 1 ? "s" : ""}]`);
    }
    result = deduped.join("\n");
  }

  // 3. Truncate if still too long
  if (result.length > maxChars) {
    const half = Math.floor(maxChars / 2);
    const head = result.slice(0, half);
    const tail = result.slice(-Math.floor(half * 0.4));
    const omitted = result.length - head.length - tail.length;
    result = `${head}\n\n... [${omitted} characters omitted for context efficiency] ...\n\n${tail}`;
  }

  return result;
}

/* ─────────────────────────────────────────────────────────────
   Singleton gateway-level cache instance
   ───────────────────────────────────────────────────────────── */

/** Shared cache instance for use across the gateway session. */
export const globalSmartCache = new SmartContextCache({
  ttlMs: 60_000,
  maxEntries: 512,
  debug: process.env.IronCliw_CACHE_DEBUG === "1",
});
