import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("burp/response-analyzer");

export type VulnConfirmation = {
  confirmed: boolean;
  vulnType: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  evidence: string;
  cvss: number;
  remediation: string;
};

/**
 * ResponseAnalyzer — Confirms vulnerabilities from HTTP response data.
 * Works standalone (no Burp needed), analyzes any request/response pair.
 */
export class ResponseAnalyzer {
  /**
   * Analyze a response against a known payload to confirm a vulnerability.
   */
  confirmVulnerability(params: {
    payload: string;
    vulnType: string;
    responseBody: string;
    statusCode: number;
    responseHeaders: Record<string, string>;
    responseTimeMs: number;
    baselineResponseTimeMs?: number;
    baselineResponseLength?: number;
  }): VulnConfirmation {
    const { payload, vulnType, responseBody, statusCode, responseHeaders, responseTimeMs } = params;
    const body = responseBody;
    const bodyLower = body.toLowerCase();

    switch (vulnType.toLowerCase()) {
      case "xss": return this.confirmXSS(payload, body, responseHeaders);
      case "sqli": return this.confirmSQLi(payload, bodyLower, responseTimeMs, params.baselineResponseTimeMs);
      case "ssti": return this.confirmSSTI(payload, body, bodyLower);
      case "path_traversal": return this.confirmPathTraversal(body);
      case "open_redirect": return this.confirmOpenRedirect(statusCode, responseHeaders);
      case "idor": return this.confirmIDOR(body, params.baselineResponseLength);
      case "xxe": return this.confirmXXE(body);
      case "rce": return this.confirmRCE(payload, body);
      case "auth_bypass": return this.confirmAuthBypass(statusCode, body, params.baselineResponseLength);
      default: return this.genericCheck(body, statusCode);
    }
  }

  /**
   * Auto-detect all possible vulnerabilities from a response without knowing the payload.
   */
  autoDetect(params: {
    responseBody: string;
    statusCode: number;
    responseHeaders: Record<string, string>;
    responseTimeMs: number;
    requestUrl: string;
    requestPayload?: string;
  }): VulnConfirmation[] {
    const found: VulnConfirmation[] = [];
    const body = params.responseBody;
    const bodyLower = body.toLowerCase();

    const sqlCheck = this.confirmSQLi(params.requestPayload ?? "'", bodyLower, params.responseTimeMs, undefined);
    if (sqlCheck.confirmed) { found.push(sqlCheck); }

    if (params.requestPayload && body.includes(params.requestPayload)) {
      found.push(this.confirmXSS(params.requestPayload, body, params.responseHeaders));
    }

    const ptCheck = this.confirmPathTraversal(body);
    if (ptCheck.confirmed) { found.push(ptCheck); }

    const sstiCheck = this.confirmSSTI("{{7*7}}", body, bodyLower);
    if (sstiCheck.confirmed) { found.push(sstiCheck); }

    const xxeCheck = this.confirmXXE(body);
    if (xxeCheck.confirmed) { found.push(xxeCheck); }

    if (params.statusCode >= 500) {
      found.push({
        confirmed: true,
        vulnType: "Server Error",
        severity: "medium",
        evidence: `HTTP ${params.statusCode} — server error may indicate injection point`,
        cvss: 5.3,
        remediation: "Investigate error handling and input validation.",
      });
    }

    const infoLeakCheck = this.checkInfoLeakage(body, params.responseHeaders);
    if (infoLeakCheck) { found.push(infoLeakCheck); }

    return found;
  }

  private confirmXSS(payload: string, body: string, headers: Record<string, string>): VulnConfirmation {
    const csp = headers["content-security-policy"] ?? headers["Content-Security-Policy"] ?? "";
    const reflected = body.includes(payload);
    const partialReflect = payload.length > 5 && body.includes(payload.slice(0, Math.floor(payload.length / 2)));

    if (reflected) {
      log.info(`[ResponseAnalyzer] XSS confirmed — payload reflected`);
      return {
        confirmed: true,
        vulnType: "Cross-Site Scripting (XSS)",
        severity: csp ? "medium" : "high",
        evidence: `Payload reflected verbatim in response body: "${payload.slice(0, 60)}"${csp ? " (CSP present — reduced impact)" : ""}`,
        cvss: csp ? 5.4 : 6.1,
        remediation: "Encode user input on output. Implement strict CSP. Use frameworks that auto-escape.",
      };
    }

    if (partialReflect) {
      return {
        confirmed: false,
        vulnType: "XSS (partial reflection)",
        severity: "low",
        evidence: "Partial payload reflected — encoding may be present. Manual verification needed.",
        cvss: 3.1,
        remediation: "Verify if encoding can be bypassed.",
      };
    }

    return { confirmed: false, vulnType: "XSS", severity: "info", evidence: "Not confirmed", cvss: 0, remediation: "" };
  }

  private confirmSQLi(
    payload: string,
    bodyLower: string,
    responseTimeMs: number,
    baselineMs?: number,
  ): VulnConfirmation {
    const errorSignatures = [
      "sql syntax", "mysql_fetch", "ora-", "pg_query", "sqlite", "sqliteexception",
      "microsoft sql", "odbc sql", "warning: mysql_", "unclosed quotation", "syntax error",
      "division by zero", "invalid column", "unknown column",
    ];

    for (const sig of errorSignatures) {
      if (bodyLower.includes(sig)) {
        log.info(`[ResponseAnalyzer] SQLi confirmed via error: "${sig}"`);
        return {
          confirmed: true,
          vulnType: "SQL Injection (Error-based)",
          severity: "critical",
          evidence: `Database error signature found: "${sig}"`,
          cvss: 9.8,
          remediation: "Use parameterized queries / prepared statements. Never concatenate user input into SQL.",
        };
      }
    }

    if (payload.toLowerCase().includes("sleep") && baselineMs !== undefined && responseTimeMs > baselineMs + 2500) {
      return {
        confirmed: true,
        vulnType: "SQL Injection (Time-based Blind)",
        severity: "critical",
        evidence: `Response took ${responseTimeMs}ms vs baseline ${baselineMs}ms — time-based delay confirmed`,
        cvss: 9.8,
        remediation: "Use parameterized queries. Implement query timeouts.",
      };
    }

    return { confirmed: false, vulnType: "SQLi", severity: "info", evidence: "Not confirmed", cvss: 0, remediation: "" };
  }

  private confirmSSTI(payload: string, body: string, bodyLower: string): VulnConfirmation {
    if (payload.includes("7*7") && body.includes("49")) {
      log.info(`[ResponseAnalyzer] SSTI confirmed — expression evaluated`);
      return {
        confirmed: true,
        vulnType: "Server-Side Template Injection (SSTI)",
        severity: "critical",
        evidence: "Template expression {{7*7}} evaluated to 49 in response",
        cvss: 9.8,
        remediation: "Never render user input as template code. Sandbox template engines.",
      };
    }

    const engineErrors = ["jinja2", "twig", "freemarker", "velocity", "mako", "pebble", "smarty"];
    for (const eng of engineErrors) {
      if (bodyLower.includes(eng)) {
        return {
          confirmed: true,
          vulnType: "SSTI (Template Engine Exposed)",
          severity: "high",
          evidence: `Template engine name "${eng}" exposed in error response`,
          cvss: 8.1,
          remediation: "Disable verbose error messages. Sandbox template engines.",
        };
      }
    }

    return { confirmed: false, vulnType: "SSTI", severity: "info", evidence: "Not confirmed", cvss: 0, remediation: "" };
  }

  private confirmPathTraversal(body: string): VulnConfirmation {
    const unixSig = "root:x:";
    const winSig = "[boot loader]";
    const winSig2 = "for 16-bit app support";

    if (body.includes(unixSig)) {
      return {
        confirmed: true,
        vulnType: "Path Traversal (Unix)",
        severity: "critical",
        evidence: `/etc/passwd content found in response — root:x: detected`,
        cvss: 9.1,
        remediation: "Validate and canonicalize all file paths. Use allow-lists for accessible paths.",
      };
    }

    if (body.includes(winSig) || body.includes(winSig2)) {
      return {
        confirmed: true,
        vulnType: "Path Traversal (Windows)",
        severity: "critical",
        evidence: `win.ini content found in response`,
        cvss: 9.1,
        remediation: "Validate and canonicalize all file paths. Use allow-lists for accessible paths.",
      };
    }

    return { confirmed: false, vulnType: "Path Traversal", severity: "info", evidence: "Not confirmed", cvss: 0, remediation: "" };
  }

  private confirmOpenRedirect(statusCode: number, headers: Record<string, string>): VulnConfirmation {
    const location = headers["location"] ?? headers["Location"] ?? "";

    if ((statusCode >= 300 && statusCode < 400) && location.includes("ironcliw-test")) {
      return {
        confirmed: true,
        vulnType: "Open Redirect",
        severity: "medium",
        evidence: `Server redirected to attacker-controlled URL: ${location}`,
        cvss: 6.1,
        remediation: "Validate redirect destinations against an allowlist. Never redirect to user-controlled URLs.",
      };
    }

    return { confirmed: false, vulnType: "Open Redirect", severity: "info", evidence: "Not confirmed", cvss: 0, remediation: "" };
  }

  private confirmIDOR(body: string, baselineLength?: number): VulnConfirmation {
    if (baselineLength === undefined) {
      return { confirmed: false, vulnType: "IDOR", severity: "info", evidence: "Need baseline to compare", cvss: 0, remediation: "" };
    }

    const lenDiff = Math.abs(body.length - baselineLength);
    if (lenDiff < 100 && body.length > 200) {
      return {
        confirmed: true,
        vulnType: "Insecure Direct Object Reference (IDOR)",
        severity: "high",
        evidence: `Different object ID returned same response length (${body.length}B vs baseline ${baselineLength}B) — possible IDOR`,
        cvss: 8.1,
        remediation: "Implement proper authorization checks. Verify object ownership on every request.",
      };
    }

    return { confirmed: false, vulnType: "IDOR", severity: "info", evidence: "Not confirmed", cvss: 0, remediation: "" };
  }

  private confirmXXE(body: string): VulnConfirmation {
    if (body.includes("root:x:") || body.includes("[boot loader]")) {
      return {
        confirmed: true,
        vulnType: "XML External Entity Injection (XXE)",
        severity: "critical",
        evidence: "File contents from XXE payload found in response",
        cvss: 9.1,
        remediation: "Disable DTD processing. Use safe XML parsers with external entity resolution disabled.",
      };
    }

    if (body.toLowerCase().includes("xml") && body.includes("<?")) {
      return {
        confirmed: false,
        vulnType: "XXE (potential)",
        severity: "low",
        evidence: "XML content detected — test with XXE payloads manually",
        cvss: 0,
        remediation: "",
      };
    }

    return { confirmed: false, vulnType: "XXE", severity: "info", evidence: "Not confirmed", cvss: 0, remediation: "" };
  }

  private confirmRCE(payload: string, body: string): VulnConfirmation {
    const rceMarkers = ["ironcliw-rce-probe", "uid=", "IRONCLIW_RCE"];
    for (const marker of rceMarkers) {
      if (body.includes(marker)) {
        return {
          confirmed: true,
          vulnType: "Remote Code Execution (RCE)",
          severity: "critical",
          evidence: `RCE probe output found in response: "${marker}"`,
          cvss: 10.0,
          remediation: "CRITICAL: Patch immediately. Disable dangerous functions. Implement strict input validation.",
        };
      }
    }

    if (payload.includes("ironcliw-rce-probe") && body.includes("ironcliw-rce-probe")) {
      return {
        confirmed: true,
        vulnType: "RCE",
        severity: "critical",
        evidence: "Command output reflected in response",
        cvss: 10.0,
        remediation: "CRITICAL: Patch immediately.",
      };
    }

    return { confirmed: false, vulnType: "RCE", severity: "info", evidence: "Not confirmed", cvss: 0, remediation: "" };
  }

  private confirmAuthBypass(statusCode: number, body: string, baselineLength?: number): VulnConfirmation {
    if (statusCode === 200 && body.toLowerCase().includes("admin")) {
      return {
        confirmed: true,
        vulnType: "Authentication Bypass",
        severity: "critical",
        evidence: `Unauthenticated request returned HTTP 200 with admin content`,
        cvss: 9.8,
        remediation: "Enforce authentication on all protected endpoints. Use session validation middleware.",
      };
    }

    if (baselineLength !== undefined && Math.abs(body.length - baselineLength) < 50 && statusCode === 200) {
      return {
        confirmed: true,
        vulnType: "Potential Auth Bypass / IDOR",
        severity: "high",
        evidence: "Response matches authenticated baseline without valid credentials",
        cvss: 8.1,
        remediation: "Verify authorization on every request.",
      };
    }

    return { confirmed: false, vulnType: "Auth Bypass", severity: "info", evidence: "Not confirmed", cvss: 0, remediation: "" };
  }

  private checkInfoLeakage(body: string, headers: Record<string, string>): VulnConfirmation | null {
    const serverHeader = headers["server"] ?? headers["Server"] ?? "";
    const xPowered = headers["x-powered-by"] ?? headers["X-Powered-By"] ?? "";

    const leakPatterns = [
      { sig: "stack trace", label: "Stack trace in response" },
      { sig: "traceback", label: "Python traceback in response" },
      { sig: "exception in thread", label: "Java exception in response" },
      { sig: "at com.", label: "Java stack trace in response" },
      { sig: "error on line", label: "PHP error in response" },
    ];

    for (const { sig, label } of leakPatterns) {
      if (body.toLowerCase().includes(sig)) {
        return {
          confirmed: true,
          vulnType: "Information Disclosure",
          severity: "low",
          evidence: `${label} — may reveal internal architecture`,
          cvss: 3.7,
          remediation: "Disable verbose error messages in production. Use generic error pages.",
        };
      }
    }

    if (serverHeader && /apache\/[12]\.|nginx\/1\.[01][0-9]\.|iis\/[678]\./i.test(serverHeader)) {
      return {
        confirmed: true,
        vulnType: "Information Disclosure (Outdated Server Version)",
        severity: "low",
        evidence: `Server header reveals outdated version: "${serverHeader}"`,
        cvss: 3.1,
        remediation: "Remove or genericize the Server header. Update server software.",
      };
    }

    if (xPowered) {
      return {
        confirmed: true,
        vulnType: "Information Disclosure (X-Powered-By)",
        severity: "info",
        evidence: `X-Powered-By header reveals technology: "${xPowered}"`,
        cvss: 2.1,
        remediation: "Remove X-Powered-By header.",
      };
    }

    return null;
  }

  private genericCheck(body: string, statusCode: number): VulnConfirmation {
    if (statusCode >= 500) {
      return {
        confirmed: true,
        vulnType: "Server Error",
        severity: "medium",
        evidence: `HTTP ${statusCode} triggered`,
        cvss: 5.3,
        remediation: "Investigate error handling.",
      };
    }
    return { confirmed: false, vulnType: "Unknown", severity: "info", evidence: "No anomaly detected", cvss: 0, remediation: "" };
  }
}

export const responseAnalyzer = new ResponseAnalyzer();
