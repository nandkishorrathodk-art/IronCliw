import fs from "node:fs/promises";
import path from "node:path";
import { CONFIG_DIR } from "../utils.js";

/**
 * ScopeManager ensures that IronCliw only performs active testing on
 * explicitly authorized domains, applications, and paths.
 */
export class ScopeManager {
  private authorizedScopes: string[] = [];
  private authorizedApps: string[] = [];
  private authorizedPaths: string[] = [];
  private scopeFilePath: string;
  private loaded = false;
  private loadPromise: Promise<void> | null = null;

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
      if (typeof data === "object" && data !== null) {
        if (Array.isArray(data.domains)) {
          this.authorizedScopes = data.domains.map((s: string) => s.toLowerCase().trim());
        }
        if (Array.isArray(data.apps)) {
          this.authorizedApps = data.apps.map((a: string) => a.toLowerCase().trim());
        }
        if (Array.isArray(data.paths)) {
          this.authorizedPaths = data.paths.map((p: string) => path.resolve(p.trim()));
        }
      } else if (Array.isArray(data)) {
        // Legacy format compatibility
        this.authorizedScopes = data.map((s) => s.toLowerCase().trim());
      }
    } catch {
      this.authorizedScopes = [];
      this.authorizedApps = ["burp suite", "chrome", "firefox", "msedge"]; // Default safe-ish apps
      this.authorizedPaths = [path.join(CONFIG_DIR, "workspace")]; // Default sandbox path
    } finally {
      this.loaded = true;
    }
  }

  /**
   * Ensures scopes are loaded exactly once. Safe to call concurrently.
   */
  private async ensureLoaded(): Promise<void> {
    if (this.loaded) {return;}
    if (!this.loadPromise) {
      this.loadPromise = this.load();
    }
    await this.loadPromise;
  }

  /**
   * Checks if a given URL or domain is within the authorized scope.
   */
  async isAuthorized(target: string): Promise<boolean> {
    await this.ensureLoaded();
    if (!target) {return false;}
    
    let hostname: string;
    try {
      const url = new URL(target.startsWith("http") ? target : `https://${target}`);
      hostname = url.hostname.toLowerCase();
    } catch {
      hostname = target.toLowerCase().trim();
    }

    return this.authorizedScopes.some((scope) => {
      if (scope === hostname) {return true;}
      if (scope.startsWith("*.")) {
        const domain = scope.slice(2);
        return hostname === domain || hostname.endsWith(`.${domain}`);
      }
      return false;
    });
  }

  /**
   * Checks if a desktop application (by name or title) is authorized.
   */
  async isAppAuthorized(appName: string): Promise<boolean> {
    await this.ensureLoaded();
    if (!appName) {return false;}
    const normalized = appName.toLowerCase().trim();
    return this.authorizedApps.some(app => normalized.includes(app));
  }

  /**
   * Checks if a file system path is authorized.
   */
  async isPathAuthorized(targetPath: string): Promise<boolean> {
    await this.ensureLoaded();
    if (!targetPath) {return false;}
    const resolvedTarget = path.resolve(targetPath);
    return this.authorizedPaths.some(authorized => {
      return resolvedTarget === authorized || resolvedTarget.startsWith(authorized + path.sep);
    });
  }

  /**
   * Returns the current scope configuration.
   */
  async getScopeConfig() {
    await this.ensureLoaded();
    return {
      domains: this.authorizedScopes,
      apps: this.authorizedApps,
      paths: this.authorizedPaths,
    };
  }

  /**
   * Returns the list of authorized domains (legacy compatibility).
   */
  async getScopes(): Promise<string[]> {
    await this.ensureLoaded();
    return [...this.authorizedScopes];
  }

  /**
   * Add a new domain scope.
   */
  async addScope(domain: string): Promise<boolean> {
    await this.ensureLoaded();
    const normalized = domain.toLowerCase().trim();
    if (!normalized || this.authorizedScopes.includes(normalized)) {return false;}
    this.authorizedScopes.push(normalized);
    return true;
  }

  /**
   * Remove a domain scope.
   */
  async removeScope(domain: string): Promise<boolean> {
    await this.ensureLoaded();
    const normalized = domain.toLowerCase().trim();
    const index = this.authorizedScopes.indexOf(normalized);
    if (index === -1) {return false;}
    this.authorizedScopes.splice(index, 1);
    return true;
  }

  /**
   * Add a new app scope.
   */
  async addAppScope(appName: string): Promise<boolean> {
    await this.ensureLoaded();
    const normalized = appName.toLowerCase().trim();
    if (!normalized || this.authorizedApps.includes(normalized)) {return false;}
    this.authorizedApps.push(normalized);
    return true;
  }

  /**
   * Write the current in-memory scope list back to the config file.
   */
  async saveScopes(): Promise<void> {
    await this.ensureLoaded();
    await fs.mkdir(path.dirname(this.scopeFilePath), { recursive: true });
    await fs.writeFile(
      this.scopeFilePath,
      JSON.stringify({
        domains: this.authorizedScopes,
        apps: this.authorizedApps,
        paths: this.authorizedPaths,
      }, null, 2),
      "utf-8",
    );
  }
}

export const scopeManager = new ScopeManager();
