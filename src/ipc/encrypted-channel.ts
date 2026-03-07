import crypto from "node:crypto";

export interface EncryptedMessage {
  iv: string;
  authTag: string;
  ciphertext: string;
  timestamp: number;
}

export interface EncryptedChannelConfig {
  /**
   * How long (ms) a message is considered valid before replay detection rejects it.
   * Default: 15 minutes.
   */
  messageTtlMs?: number;
  /**
   * How many seen nonces to keep in memory. Oldest entries are pruned first.
   * Default: 10 000.
   */
  maxNonces?: number;
}

/**
 * AES-256-GCM encrypted channel for IronCliw IPC.
 *
 * Improvements over original:
 *  - Accepts any-length secret string (HKDF derives a proper 32-byte key).
 *  - Tracks seen IVs as nonces to block replay attacks within the TTL window.
 *  - Periodic nonce-set pruning avoids unbounded memory growth.
 */
export class EncryptedChannel {
  private readonly algorithm = "aes-256-gcm";
  private readonly derivedKey: Buffer;
  private readonly messageTtlMs: number;
  private readonly maxNonces: number;
  private readonly seenNonces: Map<string, number> = new Map();

  constructor(secretKey: string, config: EncryptedChannelConfig = {}) {
    if (!secretKey) {
      throw new Error("EncryptedChannel requires a non-empty secret key.");
    }
    this.messageTtlMs = config.messageTtlMs ?? 15 * 60 * 1000;
    this.maxNonces = config.maxNonces ?? 10_000;

    this.derivedKey = crypto.hkdfSync(
      "sha256",
      Buffer.from(secretKey, "utf-8"),
      Buffer.alloc(32),
      Buffer.from("IronCliw-AES256-GCM-v1"),
      32,
    );
  }

  public encrypt(payload: unknown): EncryptedMessage {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, this.derivedKey, iv);

    const jsonPayload = JSON.stringify(payload);
    let ciphertext = cipher.update(jsonPayload, "utf8", "hex");
    ciphertext += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString("hex"),
      authTag: authTag.toString("hex"),
      ciphertext,
      timestamp: Date.now(),
    };
  }

  public decrypt(message: EncryptedMessage): unknown {
    const now = Date.now();

    if (now - message.timestamp > this.messageTtlMs) {
      throw new Error("Message rejected: Timestamp expired (possible replay attack).");
    }

    const nonce = message.iv;
    if (this.seenNonces.has(nonce)) {
      throw new Error("Message rejected: Duplicate nonce (replay attack detected).");
    }

    this._registerNonce(nonce, message.timestamp);

    const iv = Buffer.from(message.iv, "hex");
    const authTag = Buffer.from(message.authTag, "hex");

    const decipher = crypto.createDecipheriv(this.algorithm, this.derivedKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(message.ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return JSON.parse(decrypted);
  }

  private _registerNonce(nonce: string, timestamp: number): void {
    this.seenNonces.set(nonce, timestamp);

    if (this.seenNonces.size > this.maxNonces) {
      this._pruneNonces();
    }
  }

  /**
   * Remove expired nonces from the seen-nonce set.
   * Called automatically when the nonce set exceeds maxNonces.
   */
  private _pruneNonces(): void {
    const cutoff = Date.now() - this.messageTtlMs;
    for (const [nonce, ts] of this.seenNonces) {
      if (ts < cutoff) {
        this.seenNonces.delete(nonce);
      }
    }

    if (this.seenNonces.size > this.maxNonces) {
      const oldest = [...this.seenNonces.entries()]
        .toSorted((a, b) => a[1] - b[1])
        .slice(0, Math.floor(this.maxNonces / 2));
      for (const [nonce] of oldest) {
        this.seenNonces.delete(nonce);
      }
    }
  }

  /** Number of nonces currently tracked. */
  get trackedNonces(): number {
    return this.seenNonces.size;
  }
}
