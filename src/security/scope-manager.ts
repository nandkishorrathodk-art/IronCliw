import path from "node:path";
import fs from "node:fs/promises";
import { CONFIG_DIR } from "../utils.js";

/**
 * ScopeManager ensures that IronCliw only performs active testing on
 * explicitly authorized domains.
 */
export class ScopeManager {
  private authorizedScopes: string[] = [];
  private scopeFilePath: string;

  constructor() {
    this.scopeFilePath = path.join(CONFIG_DIR, "authorized_scopes.json");
  }

  /**
   * Load authorized scopes from the configuration file.
   */
  async load(): Promise<void> {
    try {
      const raw = await fs.readFile(this.scopeFilePath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        this.authorizedScopes = data.map((s) => s.toLowerCase().trim());
      }
    } catch (err) {
      // If file doesn't exist, we start with an empty scope (most secure)
      this.authorizedScopes = [];
    }
  }

  /**
   * Checks if a given URL or domain is within the authorized scope.
   * Supports basic wildcard like *.example.com
   */
  isAuthorized(target: string): boolean {
    if (!target) return false;
    
    let hostname: string;
    try {
      const url = new URL(target.startsWith("http") ? target : `https://${target}`);
      hostname = url.hostname.toLowerCase();
    } catch {
      hostname = target.toLowerCase().trim();
    }

    return this.authorizedScopes.some((scope) => {
      if (scope === hostname) return true;
      if (scope.startsWith("*.")) {
        const domain = scope.slice(2);
        return hostname === domain || hostname.endsWith(`.${domain}`);
      }
      return false;
    });
  }

  /**
   * Returns the list of authorized scopes.
   */
  getScopes(): string[] {
    return [...this.authorizedScopes];
  }
}

export const scopeManager = new ScopeManager();
