import fs from "node:fs/promises";
import path from "node:path";
import type { ProFinding, Severity } from "./scanner.js";

interface ReportOptions {
  programName?: string;
  programUrl?: string;
  researcher?: string;
  platform?: "bugcrowd" | "hackerone" | "intigriti" | "generic";
  outputPath?: string;
}

interface BugReport {
  title: string;
  severity: Severity;
  cvss: number;
  summary: string;
  impact: string;
  stepsToReproduce: string[];
  poc: string;
  remediation: string;
  references: string[];
  cwe?: string;
}

const SEVERITY_MAP: Record<Severity, { label: string; priority: string; bugcrowdP: string }> = {
  critical: { label: "Critical", priority: "P1", bugcrowdP: "P1" },
  high: { label: "High", priority: "P2", bugcrowdP: "P2" },
  medium: { label: "Medium", priority: "P3", bugcrowdP: "P3" },
  low: { label: "Low", priority: "P4", bugcrowdP: "P4" },
  info: { label: "Informational", priority: "P5", bugcrowdP: "P5" },
};

const CATEGORY_TEMPLATES: Record<string, Partial<BugReport>> = {
  XSS: {
    summary:
      "A Cross-Site Scripting (XSS) vulnerability was identified. An attacker can inject malicious scripts that execute in the context of a victim's browser, enabling session hijacking, credential theft, and arbitrary DOM manipulation.",
    impact:
      "An attacker can steal session cookies, perform actions on behalf of victims, redirect users to phishing pages, or install keyloggers — compromising all authenticated users who view the vulnerable page.",
    remediation:
      "Implement proper output encoding/escaping for all user-supplied data before rendering in HTML. Use a strict Content-Security-Policy (CSP) header. Consider adopting a framework with built-in auto-escaping (React, Angular, Vue).",
    references: [
      "https://owasp.org/www-community/attacks/xss/",
      "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html",
    ],
    cwe: "CWE-79",
  },
  SQLi: {
    summary:
      "An SQL Injection vulnerability was discovered. Malicious SQL is injected into query parameters, allowing an attacker to read, modify, or delete database records — potentially exfiltrating all user data.",
    impact:
      "Complete database compromise: full read/write access, authentication bypass, extraction of credentials, PII, financial records. On some databases, OS-level command execution is possible.",
    remediation:
      "Use parameterized queries or prepared statements exclusively. Never concatenate user input into SQL strings. Apply ORM-level validation. Restrict database account privileges to least-privilege.",
    references: [
      "https://owasp.org/www-community/attacks/SQL_Injection",
      "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html",
    ],
    cwe: "CWE-89",
  },
  SSTI: {
    summary:
      "A Server-Side Template Injection (SSTI) vulnerability allows an attacker to inject template expressions that are evaluated server-side, often leading to Remote Code Execution (RCE).",
    impact: "Remote Code Execution (RCE) on the web server — complete server takeover, data exfiltration, pivot to internal network.",
    remediation:
      "Never pass user-controlled data directly into template engines. Use sandboxed template evaluation. Whitelist allowed template operations. Validate and sanitize all inputs before templating.",
    references: [
      "https://portswigger.net/web-security/server-side-template-injection",
    ],
    cwe: "CWE-1336",
  },
  IDOR: {
    summary:
      "An Insecure Direct Object Reference (IDOR) was identified. Object identifiers (IDs) in URL paths or parameters can be manipulated to access other users' data without proper authorization checks.",
    impact:
      "Unauthorized access to sensitive data of other users: personal information, private records, financial transactions, or administrative functionality — violating confidentiality and integrity.",
    remediation:
      "Implement server-side authorization checks for every object access. Use unpredictable identifiers (UUIDs) instead of sequential integers. Enforce ownership verification: confirm the requesting user owns the requested object.",
    references: [
      "https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html",
    ],
    cwe: "CWE-639",
  },
  "Information Disclosure": {
    summary:
      "Sensitive data was exposed in server responses. This includes API keys, credentials, internal infrastructure details, stack traces, or personally identifiable information (PII).",
    impact:
      "Leaked secrets can be used to escalate attacks: compromised API keys enable unauthorized API access, internal IPs enable network pivoting, stack traces reveal technology stack for targeted exploitation.",
    remediation:
      "Remove all sensitive data from error messages and API responses. Rotate any exposed secrets immediately. Implement proper error handling that shows generic messages to users. Review all API endpoints for excessive data exposure.",
    references: ["https://owasp.org/www-project-top-ten/2017/A3_2017-Sensitive_Data_Exposure"],
    cwe: "CWE-200",
  },
  "Auth Bypass": {
    summary:
      "An authentication bypass vulnerability was discovered. Certain HTTP headers or request modifications allow unauthenticated access to protected endpoints.",
    impact:
      "Unauthorized access to protected functionality and data. An attacker can impersonate authenticated users or access administrative features without valid credentials.",
    remediation:
      "Remove trust in forwarded headers (X-Forwarded-For, X-Real-IP) for authorization decisions. Implement proper server-side authentication checks that cannot be bypassed by request manipulation.",
    references: ["https://owasp.org/www-project-top-ten/2017/A2_2017-Broken_Authentication"],
    cwe: "CWE-287",
  },
  CSRF: {
    summary:
      "A Cross-Site Request Forgery (CSRF) vulnerability allows an attacker to trick authenticated users into performing unintended actions on the target application.",
    impact:
      "Attackers can perform state-changing actions on behalf of authenticated users: account modifications, fund transfers, password changes, or data deletion.",
    remediation:
      "Implement CSRF tokens for all state-changing requests. Use the SameSite cookie attribute. Validate the Origin/Referer header for sensitive operations.",
    references: [
      "https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html",
    ],
    cwe: "CWE-352",
  },
  "Security Misconfiguration": {
    summary:
      "Security headers are missing from HTTP responses, leaving the application vulnerable to common browser-based attacks.",
    impact:
      "Missing headers increase attack surface: absent CSP enables XSS, absent X-Frame-Options enables clickjacking, absent HSTS enables SSL stripping attacks.",
    remediation:
      "Add all recommended security headers: Content-Security-Policy, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Strict-Transport-Security, Referrer-Policy.",
    references: ["https://securityheaders.com/", "https://owasp.org/www-project-secure-headers/"],
    cwe: "CWE-16",
  },
};

function getCVSS(severity: Severity, cvss?: number): number {
  if (cvss) {
    return cvss;
  }
  const defaults: Record<Severity, number> = {
    critical: 9.5,
    high: 7.5,
    medium: 5.5,
    low: 3.5,
    info: 1.0,
  };
  return defaults[severity];
}

function getTemplate(finding: ProFinding): Partial<BugReport> {
  for (const [key, tpl] of Object.entries(CATEGORY_TEMPLATES)) {
    if (finding.category.toLowerCase().includes(key.toLowerCase())) {
      return tpl;
    }
  }
  return {
    summary: `A ${finding.category} vulnerability was identified at the target application.`,
    impact: "This vulnerability may allow unauthorized access or data exposure.",
    remediation: "Review and remediate the identified vulnerability following security best practices.",
    references: ["https://owasp.org/www-project-top-ten/"],
  };
}

function buildStepsToReproduce(finding: ProFinding): string[] {
  const steps = [`Navigate to: ${finding.url}`];

  if (finding.payload) {
    if (finding.parameter) {
      steps.push(`Locate the '${finding.parameter}' parameter`);
      steps.push(`Insert the following payload: ${finding.payload}`);
    } else {
      steps.push(`Inject the following payload into the input field: ${finding.payload}`);
    }
    steps.push("Submit the request");
    steps.push(`Observe the response — evidence: ${finding.evidence}`);
  } else {
    steps.push(`Send a request to the endpoint`);
    steps.push(`Observe: ${finding.evidence}`);
  }

  return steps;
}

function buildPoc(finding: ProFinding): string {
  if (finding.payload) {
    return [
      `curl -sk '${finding.url}' \\`,
      finding.parameter
        ? `  --data-urlencode '${finding.parameter}=${finding.payload}'`
        : `  -d '${finding.payload}'`,
      "",
      `# Or via browser:`,
      `# ${finding.url}${finding.parameter ? `?${finding.parameter}=${encodeURIComponent(finding.payload)}` : ""}`,
    ].join("\n");
  }

  return `curl -sk '${finding.url}' -I\n# Observe the response headers/body`;
}

function buildSingleReport(finding: ProFinding): BugReport {
  const tpl = getTemplate(finding);
  const cvss = getCVSS(finding.severity, finding.cvss);

  return {
    title: finding.title,
    severity: finding.severity,
    cvss,
    summary: tpl.summary ?? finding.evidence,
    impact: tpl.impact ?? "Impact assessment required.",
    stepsToReproduce: buildStepsToReproduce(finding),
    poc: buildPoc(finding),
    remediation: tpl.remediation ?? "Apply security best practices.",
    references: tpl.references ?? [],
    cwe: tpl.cwe,
  };
}

function renderBugcrowdFormat(report: BugReport, _opts: ReportOptions): string {
  const { priority } = SEVERITY_MAP[report.severity];
  const sep = "─".repeat(72);

  return [
    `## ${report.title}`,
    "",
    `**Priority:** ${priority} | **CVSS:** ${report.cvss} | **CWE:** ${report.cwe ?? "N/A"}`,
    "",
    "### Summary",
    report.summary,
    "",
    "### Impact",
    report.impact,
    "",
    "### Steps to Reproduce",
    report.stepsToReproduce.map((s, i) => `${i + 1}. ${s}`).join("\n"),
    "",
    "### Proof of Concept",
    "```bash",
    report.poc,
    "```",
    "",
    "### Remediation",
    report.remediation,
    "",
    "### References",
    report.references.map((r) => `- ${r}`).join("\n"),
    sep,
  ].join("\n");
}

function renderHackeroneFormat(report: BugReport, _opts: ReportOptions): string {
  return [
    `# ${report.title}`,
    "",
    `**Severity:** ${report.severity.charAt(0).toUpperCase() + report.severity.slice(1)} (CVSS ${report.cvss})`,
    report.cwe ? `**CWE:** ${report.cwe}` : "",
    "",
    "## Summary:",
    report.summary,
    "",
    "## Impact:",
    report.impact,
    "",
    "## Steps To Reproduce:",
    report.stepsToReproduce.map((s, i) => `${i + 1}. ${s}`).join("\n"),
    "",
    "## Supporting Material/References:",
    "```",
    report.poc,
    "```",
    "",
    "## Remediation:",
    report.remediation,
    "",
    report.references.length > 0 ? "## References:\n" + report.references.map((r) => `- ${r}`).join("\n") : "",
  ].filter(Boolean).join("\n");
}

export async function generateReport(
  findings: ProFinding[],
  opts: ReportOptions = {},
): Promise<string> {
  const platform = opts.platform ?? "bugcrowd";
  const researcher = opts.researcher ?? "IronCliw ProScan";
  const programName = opts.programName ?? "Target Program";
  const date = new Date().toISOString().split("T")[0];

  const grouped = new Map<Severity, ProFinding[]>();
  for (const f of findings) {
    const list = grouped.get(f.severity) ?? [];
    list.push(f);
    grouped.set(f.severity, list);
  }

  const header = [
    "# IronCliw ProScan — Security Assessment Report",
    "",
    `**Program:** ${programName}`,
    `**Date:** ${date}`,
    `**Researcher:** ${researcher}`,
    `**Platform:** ${platform.charAt(0).toUpperCase() + platform.slice(1)}`,
    `**Total Findings:** ${findings.length}`,
    "",
    "## Executive Summary",
    "",
    "| Severity | Count |",
    "|----------|-------|",
    ...(["critical", "high", "medium", "low", "info"] as Severity[]).map(
      (s) => `| ${SEVERITY_MAP[s].label} | ${grouped.get(s)?.length ?? 0} |`,
    ),
    "",
    "---",
    "",
  ].join("\n");

  const reportSections: string[] = [];

  for (const severity of ["critical", "high", "medium", "low", "info"] as Severity[]) {
    const severityFindings = grouped.get(severity) ?? [];
    for (const finding of severityFindings) {
      const report = buildSingleReport(finding);
      const rendered =
        platform === "hackerone"
          ? renderHackeroneFormat(report, opts)
          : renderBugcrowdFormat(report, opts);
      reportSections.push(rendered);
    }
  }

  const footer = [
    "",
    "---",
    "",
    "## Disclosure Notes",
    "",
    `This report was generated by **IronCliw ProScan** v2026.0.3.`,
    "All testing was performed within authorized scope on the specified targets.",
    "Please follow responsible disclosure guidelines.",
    "",
    `*Generated: ${new Date().toUTCString()}*`,
  ].join("\n");

  const fullReport = header + reportSections.join("\n\n") + footer;

  if (opts.outputPath) {
    await fs.mkdir(path.dirname(opts.outputPath), { recursive: true });
    await fs.writeFile(opts.outputPath, fullReport, "utf-8");
    console.log(`\n📄 Report saved to: ${opts.outputPath}`);
  }

  return fullReport;
}

export function printFindingSummary(findings: ProFinding[]): void {
  console.log("\n" + "═".repeat(72));
  console.log("  IRONCLIW PROSCAN — FINDINGS SUMMARY");
  console.log("═".repeat(72));

  const counts: Record<Severity, number> = {
    critical: 0, high: 0, medium: 0, low: 0, info: 0,
  };
  for (const f of findings) {
    counts[f.severity]++;
  }

  console.log(`\n  🔴 Critical : ${counts.critical}`);
  console.log(`  🟠 High     : ${counts.high}`);
  console.log(`  🟡 Medium   : ${counts.medium}`);
  console.log(`  🔵 Low      : ${counts.low}`);
  console.log(`  ⚪ Info     : ${counts.info}`);
  console.log(`\n  Total: ${findings.length} findings\n`);
  console.log("═".repeat(72) + "\n");
}
