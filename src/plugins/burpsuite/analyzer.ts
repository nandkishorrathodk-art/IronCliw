import type { BurpHttpRequest, BurpProxyItem } from "./types.js";

/**
 * TrafficAnalyzer decodes and inspects HTTP traffic from Burp.
 */
export class TrafficAnalyzer {
  /**
   * Decodes a Base64 string to a UTF-8 string.
   */
  private decode(base64: string): string {
    return Buffer.from(base64, "base64").toString("utf-8");
  }

  /**
   * Parses a raw HTTP request string into a structured object.
   */
  parseRawRequest(raw: string, url: string): BurpHttpRequest {
    const lines = raw.split("\n");
    const [firstLine, ...headerLines] = lines;
    const [method] = (firstLine ?? "").split(" ");
    
    const headers: Record<string, string> = {};
    let bodyIndex = -1;

    for (let i = 0; i < headerLines.length; i++) {
      const line = headerLines[i]?.trim();
      if (!line) {
        bodyIndex = i + 1;
        break;
      }
      const [key, ...valueParts] = line.split(":");
      if (key && valueParts.length > 0) {
        headers[key.trim()] = valueParts.join(":").trim();
      }
    }

    const body = bodyIndex !== -1 ? headerLines.slice(bodyIndex).join("\n").trim() : undefined;

    return {
      method: method ?? "GET",
      url,
      headers,
      body,
    };
  }

  /**
   * Analyzes a Proxy Item for potential security interests.
   */
  analyze(item: BurpProxyItem) {
    const rawReq = this.decode(item.request);
    const request = this.parseRawRequest(rawReq, item.url);
    
    const findings: string[] = [];

    // Simple heuristic analysis (The "Eye")
    const sensitiveParams = new Set(["id", "uid", "user", "admin", "role", "key", "token", "password"]);
    
    // Check URL params
    const url = new URL(item.url);
    url.searchParams.forEach((_, key) => {
      if (sensitiveParams.has(key.toLowerCase())) {
        findings.push(`Sensitive URL parameter detected: ${key}`);
      }
    });

    // Check Headers
    if (request.headers["Authorization"] || request.headers["Cookie"]) {
      findings.push("Authentication/Session headers present.");
    }

    // Check for IDOR-like patterns
    if (item.url.match(/\/\d+($|\/|\?)/)) {
      findings.push("Numeric ID in path detected (potential IDOR target).");
    }

    return {
      request,
      findings,
      isInteresting: findings.length > 0
    };
  }
}

export const trafficAnalyzer = new TrafficAnalyzer();
