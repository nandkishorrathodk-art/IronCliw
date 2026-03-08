import type { BurpApiConfig, BurpProxyItem, BurpScanIssue } from "./types.js";

/**
 * BurpClient handles communication with the Burp Suite REST API.
 */
export class BurpClient {
  private config: BurpApiConfig;

  constructor(config: BurpApiConfig) {
    this.config = config;
  }

  /**
   * Helper to make authenticated requests to Burp API
   */
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = new URL(path, this.config.baseUrl).toString();
    const response = await fetch(url, {
      ...options,
      headers: Object.assign({}, options.headers as Record<string, string>, {
        "Authorization": this.config.apiKey,
        "Accept": "application/json",
      }),
    });

    if (!response.ok) {
      throw new Error(`Burp API error: ${response.status} ${response.statusText}`);
    }

    return await response.json() as T;
  }

  /**
   * Fetch the proxy history from Burp Suite.
   */
  async getProxyHistory(): Promise<BurpProxyItem[]> {
    // Note: Endpoint may vary depending on Burp version/extension
    // Standard Burp Pro API endpoint for history
    return await this.request<BurpProxyItem[]>("/proxy/v1/history");
  }

  /**
   * Fetch all scan issues identified by Burp.
   */
  async getScanIssues(): Promise<BurpScanIssue[]> {
    return await this.request<BurpScanIssue[]>("/knowledge_base/v1/scan_issues");
  }

  /**
   * Check if Burp API is reachable and authenticated.
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Trying a simple read endpoint to verify connectivity
      await this.getScanIssues();
      return true;
    } catch {
      return false;
    }
  }
}
