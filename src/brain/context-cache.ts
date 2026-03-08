import zlib from "node:zlib";
import { promisify } from "node:util";

const deflate = promisify(zlib.deflate);
const inflate = promisify(zlib.inflate);

export interface CacheEntry {
  tokens: number;
  data: unknown;
  lastAccessed: number;
  compressed: boolean;
}

export interface ContextCacheStats {
  sessions: number;
  usedTokens: number;
  maxTokens: number;
  utilizationPct: number;
  compressedSessions: number;
}

export class ContextCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxTokens: number;
  private currentTokens = 0;
  private readonly compressionThresholdMs = 15 * 60 * 1000;
  private cleanupTimer: NodeJS.Timeout;

  constructor(maxTokens = 256000) {
    this.maxTokens = maxTokens;
    this.cleanupTimer = setInterval(() => this.compressInactive(), 60000);
  }

  public async set(sessionId: string, data: unknown, tokenCount: number): Promise<void> {
    const existing = this.cache.get(sessionId);
    if (existing) {
      this.currentTokens -= existing.tokens;
      this.cache.delete(sessionId);
    }

    this.evictToFit(tokenCount);

    this.cache.set(sessionId, {
      tokens: tokenCount,
      data,
      lastAccessed: Date.now(),
      compressed: false,
    });
    this.currentTokens += tokenCount;
  }

  public async get(sessionId: string): Promise<unknown> {
    const entry = this.cache.get(sessionId);
    if (!entry) {return null;}

    entry.lastAccessed = Date.now();

    if (entry.compressed) {
      const buffer = Buffer.from(entry.data as string, "base64");
      const decompressed = await inflate(buffer);
      entry.data = JSON.parse(decompressed.toString());
      entry.compressed = false;
    }

    return entry.data;
  }

  /** Check if a session exists in the cache without updating lastAccessed. */
  public has(sessionId: string): boolean {
    return this.cache.has(sessionId);
  }

  /** Explicitly remove a session from the cache. Returns true if it existed. */
  public delete(sessionId: string): boolean {
    const entry = this.cache.get(sessionId);
    if (!entry) {return false;}
    this.currentTokens -= entry.tokens;
    this.cache.delete(sessionId);
    return true;
  }

  /** Number of sessions currently in cache. */
  get size(): number {
    return this.cache.size;
  }

  /** Live cache statistics. */
  public getStats(): ContextCacheStats {
    let compressedSessions = 0;
    for (const entry of this.cache.values()) {
      if (entry.compressed) {compressedSessions++;}
    }
    return {
      sessions: this.cache.size,
      usedTokens: this.currentTokens,
      maxTokens: this.maxTokens,
      utilizationPct: Math.round((this.currentTokens / this.maxTokens) * 100),
      compressedSessions,
    };
  }

  private evictToFit(neededTokens: number) {
    if (neededTokens > this.maxTokens) {
      throw new Error(`Item size (${neededTokens}) exceeds maximum cache size (${this.maxTokens})`);
    }

    while (this.currentTokens + neededTokens > this.maxTokens && this.cache.size > 0) {
      let oldestKey = "";
      let oldestTime = Infinity;

      for (const [key, entry] of this.cache.entries()) {
        if (entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        const removed = this.cache.get(oldestKey)!;
        this.currentTokens -= removed.tokens;
        this.cache.delete(oldestKey);
      }
    }
  }

  private async compressInactive() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (!entry.compressed && now - entry.lastAccessed > this.compressionThresholdMs) {
        try {
          const stringified = JSON.stringify(entry.data);
          const compressed = await deflate(stringified);
          entry.data = compressed.toString("base64");
          entry.compressed = true;
        } catch (err) {
          console.error(`[ContextCache] Failed to compress session ${key}:`, err);
        }
      }
    }
  }

  public shutdown() {
    clearInterval(this.cleanupTimer);
    this.cache.clear();
    this.currentTokens = 0;
  }
}
