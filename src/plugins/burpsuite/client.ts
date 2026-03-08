import type { BurpApiConfig, BurpProxyItem, BurpScanIssue, BurpScanTask, BurpFireRequestResult } from "./types.js";

/**
 * BurpClient handles communication with the Burp Suite REST API.
 * Supports: proxy history, scan control, fire-request (Repeater), site map.
 */
export class BurpClient {
  private config: BurpApiConfig;

  constructor(config: BurpApiConfig) {
    this.config = config;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = new URL(path, this.config.baseUrl).toString();
    const response = await fetch(url, {
      ...options,
      headers: Object.assign({}, options.headers as Record<string, string>, {
        "Authorization": this.config.apiKey,
        "Accept": "application/json",
        "Content-Type": "application/json",
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Burp API error: ${response.status} ${response.statusText} — ${body.slice(0, 200)}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) as T : {} as T;
  }

  async getProxyHistory(): Promise<BurpProxyItem[]> {
    return await this.request<BurpProxyItem[]>("/proxy/v1/history");
  }

  async getScanIssues(): Promise<BurpScanIssue[]> {
    return await this.request<BurpScanIssue[]>("/knowledge_base/v1/scan_issues");
  }

  /**
   * Start an automated scan — equivalent to Burp's Active Scanner.
   */
  async startScan(targetUrl: string, config?: {
    scope?: string[];
    scanConfigurationIds?: string[];
    username?: string;
    password?: string;
  }): Promise<{ taskId: string }> {
    const body: Record<string, unknown> = {
      urls: [targetUrl],
    };
    if (config?.scope) {
      body.scope = {
        include: config.scope.map(url => ({ rule: url, type: "SimpleScopeRule" })),
      };
    }
    if (config?.scanConfigurationIds) {
      body.scan_configurations = config.scanConfigurationIds.map(id => ({ id }));
    }
    if (config?.username && config?.password) {
      body.application_logins = [{ username: config.username, password: config.password }];
    }
    const result = await this.request<{ task_id: string }>("/scan/v0.1", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { taskId: result.task_id };
  }

  /**
   * Get current status of a running scan task.
   */
  async getScanStatus(taskId: string): Promise<BurpScanTask> {
    return await this.request<BurpScanTask>(`/scan/v0.1/${taskId}`);
  }

  /**
   * Poll until scan finishes or timeout (ms).
   */
  async waitForScan(taskId: string, timeoutMs = 5 * 60 * 1000): Promise<BurpScanTask> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const status = await this.getScanStatus(taskId);
      if (status.status === "succeeded" || status.status === "failed") {
        return status;
      }
      await new Promise(r => setTimeout(r, 5000));
    }
    throw new Error(`Scan ${taskId} timed out after ${timeoutMs / 1000}s`);
  }

  /**
   * Fire a raw HTTP request through Burp (Repeater equivalent).
   * Returns the HTTP response from the server.
   */
  async fireRequest(params: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: string;
    followRedirects?: boolean;
  }): Promise<BurpFireRequestResult> {
    const requestHeaders = params.headers ?? {};
    const rawLines: string[] = [];
    const urlObj = new URL(params.url);
    const path = urlObj.pathname + urlObj.search;

    rawLines.push(`${params.method} ${path} HTTP/1.1`);
    rawLines.push(`Host: ${urlObj.hostname}${urlObj.port ? `:${urlObj.port}` : ""}`);
    for (const [k, v] of Object.entries(requestHeaders)) {
      rawLines.push(`${k}: ${v}`);
    }
    rawLines.push("");
    if (params.body) {
      rawLines.push(params.body);
    }
    const rawRequest = rawLines.join("\r\n");

    return await this.request<BurpFireRequestResult>("/http-request-fire/v0/fire-request", {
      method: "POST",
      body: JSON.stringify({
        request: Buffer.from(rawRequest).toString("base64"),
        url: params.url,
        follow_redirects: params.followRedirects ?? false,
      }),
    });
  }

  /**
   * Get target site map from Burp.
   */
  async getSiteMap(urlPrefix?: string): Promise<{ url: string; statusCode: number }[]> {
    const path = urlPrefix
      ? `/target/site-map?urlPrefix=${encodeURIComponent(urlPrefix)}`
      : "/target/site-map";
    return await this.request<{ url: string; statusCode: number }[]>(path);
  }

  /**
   * Get currently intercepted proxy messages waiting in the queue.
   */
  async getInterceptedMessages(): Promise<{ messageId: string; url: string; method: string; request: string }[]> {
    return await this.request<{ messageId: string; url: string; method: string; request: string }[]>(
      "/proxy/v0/intercept-messages"
    );
  }

  /**
   * Forward an intercepted message (optionally with a modified request).
   */
  async forwardInterceptedMessage(messageId: string, modifiedRequest?: string): Promise<void> {
    const body: Record<string, string> = {};
    if (modifiedRequest) {
      body.request = Buffer.from(modifiedRequest).toString("base64");
    }
    await this.request<void>(`/proxy/v0/intercept-messages/${messageId}/forward`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Drop (block) an intercepted message.
   */
  async dropInterceptedMessage(messageId: string): Promise<void> {
    await this.request<void>(`/proxy/v0/intercept-messages/${messageId}/drop`, {
      method: "POST",
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.getScanIssues();
      return true;
    } catch {
      return false;
    }
  }
}
