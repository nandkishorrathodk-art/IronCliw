import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * AES-256-GCM encrypted secret vault with file-based persistence.
 *
 * Improvements over original stub:
 *  - Accepts any-length master secret (HKDF derives a proper 32-byte key).
 *  - `persist()` and `readRaw()` write/read a real JSON vault file.
 *  - Vault file stores per-entry: iv, authTag, ciphertext (all hex-encoded).
 *  - In-memory cache for fast repeated reads without disk I/O.
 *  - `delete()` and `keys()` management helpers.
 */
export class SecretVault {
  private readonly algorithm = "aes-256-gcm";
  private readonly masterKey: Buffer;
  private readonly vaultPath: string;
  private readonly cache: Map<string, string> = new Map();

  constructor(masterSecret: string, vaultPath: string) {
    if (!masterSecret) {
      throw new Error("SecretVault requires a non-empty master secret.");
    }
    this.masterKey = crypto.hkdfSync(
      "sha256",
      Buffer.from(masterSecret, "utf-8"),
      Buffer.alloc(32),
      Buffer.from("IronCliw-SecretVault-v1"),
      32,
    );
    this.vaultPath = vaultPath;
  }

  public async store(key: string, secret: string): Promise<void> {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);

    let ciphertext = cipher.update(secret, "utf8", "hex");
    ciphertext += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    const entry = `${iv.toString("hex")}:${authTag}:${ciphertext}`;
    await this._persist(key, entry);
    this.cache.set(key, secret);
  }

  public async retrieve(key: string): Promise<string | null> {
    if (this.cache.has(key)) {return this.cache.get(key)!;}

    const raw = await this._readRaw(key);
    if (!raw) {return null;}

    const parts = raw.split(":");
    if (parts.length < 3) {return null;}
    const [ivHex, authTagHex, ...rest] = parts;
    const ciphertext = rest.join(":");

    try {
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.masterKey,
        Buffer.from(ivHex, "hex"),
      );
      decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

      let decrypted = decipher.update(ciphertext, "hex", "utf8");
      decrypted += decipher.final("utf8");
      this.cache.set(key, decrypted);
      return decrypted;
    } catch {
      return null;
    }
  }

  /**
   * Delete a secret from the vault and cache.
   * Returns true if it existed.
   */
  public async delete(key: string): Promise<boolean> {
    this.cache.delete(key);
    const vault = await this._loadVaultFile();
    if (!(key in vault)) {return false;}
    delete vault[key];
    await this._saveVaultFile(vault);
    return true;
  }

  /**
   * List all stored secret keys (not their values).
   */
  public async keys(): Promise<string[]> {
    const vault = await this._loadVaultFile();
    return Object.keys(vault);
  }

  private async _persist(key: string, entry: string): Promise<void> {
    const vault = await this._loadVaultFile();
    vault[key] = entry;
    await this._saveVaultFile(vault);
  }

  private async _readRaw(key: string): Promise<string | null> {
    const vault = await this._loadVaultFile();
    return vault[key] ?? null;
  }

  private async _loadVaultFile(): Promise<Record<string, string>> {
    try {
      const raw = await fs.readFile(this.vaultPath, "utf-8");
      return JSON.parse(raw) as Record<string, string>;
    } catch {
      return {};
    }
  }

  private async _saveVaultFile(vault: Record<string, string>): Promise<void> {
    await fs.mkdir(path.dirname(this.vaultPath), { recursive: true });
    await fs.writeFile(this.vaultPath, JSON.stringify(vault, null, 2), "utf-8");
  }
}
