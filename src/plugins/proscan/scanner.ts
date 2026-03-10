import { EventEmitter } from "node:events";
import type { Browser, BrowserContext, Page } from "playwright-core";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import { PAYLOADS, VULN_SIGNATURES, SENSITIVE_DATA_PATTERNS } from "./payloads.js";

const log = createSubsystemLogger("proscan/scanner");

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export interface ProFinding {
  id: string;
  timestamp: Date;
  title: string;
  severity: Severity;
  category: string;
  url: string;
  parameter?: string;
  payload?: string;
  evidence: string;
  request?: string;
  response?: string;
  phase: "crawl" | "passive" | "active" | "api";
  cvss?: number;
}

export interface ScanTarget {
  url: string;
  credentials?: { username: string; password: string; loginUrl?: string };
  depth?: number;
  maxPages?: number;
  headed?: boolean;
  timeoutMs?: number;
  includeAPIs?: boolean;
}

export interface ScanOptions {
  concurrency?: number;
  onFinding?: (finding: ProFinding) => void;
}

interface CapturedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  response?: {
    status: number;
    headers: Record<string, string>;
    body: string;
  };
}

const SEVERITY_ICONS: Record<Severity, string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🔵",
  info: "⚪",
};

const PHASE_ICONS: Record<ProFinding["phase"], string> = {
  crawl: "🕷️",
  passive: "👁️",
  active: "⚡",
  api: "🔌",
};

function makeFindingId(): string {
  return `PSF-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export class ProScanner extends EventEmitter {
  private findings: ProFinding[] = [];
  private capturedRequests: CapturedRequest[] = [];
  private discoveredUrls: Set<string> = new Set();
  private discoveredEndpoints: Set<string> = new Set();
  private browser: Browser | null = null;
  private seenFindingKeys: Set<string> = new Set();
  private scanStartTime = 0;
  private totalPhases = 4;
  private currentPhase = 0;

  private makeDedupeKey(f: {
    category: string;
    url: string;
    parameter?: string;
    payload?: string;
  }): string {
    return `${f.category}:${f.url}:${f.parameter ?? ""}:${f.payload?.slice(0, 30) ?? ""}`;
  }

  async scan(target: ScanTarget, opts: ScanOptions = {}): Promise<ProFinding[]> {
    this.findings = [];
    this.capturedRequests = [];
    this.discoveredUrls = new Set();
    this.discoveredEndpoints = new Set();
    this.seenFindingKeys = new Set();
    this.scanStartTime = Date.now();
    this.currentPhase = 0;

    const onFinding = opts.onFinding ?? (() => {});
    const timeoutMs = target.timeoutMs ?? 10 * 60 * 1000;

    log.info(`[ProScan] Starting full scan: ${target.url}`);

    const { chromium } = await import("playwright-core");

    this.browser = await chromium.launch({
      headless: !target.headed,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
      ],
    });

    const scanAbort = new AbortController();
    const timeoutHandle = setTimeout(() => {
      log.warn(`[ProScan] Scan timeout reached (${timeoutMs / 1000}s). Aborting.`);
      scanAbort.abort();
    }, timeoutMs);

    try {
      const ctx = await this.browser.newContext({
        ignoreHTTPSErrors: true,
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        viewport: { width: 1920, height: 1080 },
      });

      await ctx.route("**/*", async (route) => {
        if (scanAbort.signal.aborted) {
          await route.abort();
          return;
        }
        const req = route.request();
        const captured: CapturedRequest = {
          url: req.url(),
          method: req.method(),
          headers: req.headers(),
          body: req.postData() ?? undefined,
        };

        try {
          const resp = await route.fetch();
          const body = await resp.text().catch(() => "");
          captured.response = {
            status: resp.status(),
            headers: resp.headers(),
            body: body.slice(0, 50000),
          };
          this.capturedRequests.push(captured);
          await route.fulfill({ response: resp });
        } catch {
          this.capturedRequests.push(captured);
          await route.continue();
        }
      });

      const page = await ctx.newPage();

      if (target.credentials) {
        await this.loginToApp(page, target.credentials);
      }

      this.emitProgress(1, "Crawling");
      if (!scanAbort.signal.aborted) {
        log.info("[Phase 1] 🕷️  Crawling...");
        await this.crawlPhase(page, target, onFinding);
      }

      this.emitProgress(2, "Passive analysis");
      if (!scanAbort.signal.aborted) {
        log.info("[Phase 2] 👁️  Passive analysis...");
        await this.passivePhase(onFinding);
      }

      this.emitProgress(3, "Active injection");
      if (!scanAbort.signal.aborted) {
        log.info("[Phase 3] ⚡ Active injection...");
        await this.activePhase(ctx, target, onFinding, opts.concurrency ?? 3);
      }

      if (target.includeAPIs !== false && !scanAbort.signal.aborted) {
        this.emitProgress(4, "API testing");
        log.info("[Phase 4] 🔌 API testing...");
        await this.apiPhase(onFinding);
      }

      await ctx.close();
    } finally {
      clearTimeout(timeoutHandle);
      await this.browser.close();
      this.browser = null;
    }

    const elapsed = ((Date.now() - this.scanStartTime) / 1000).toFixed(1);
    log.info(`[ProScan] Scan complete in ${elapsed}s. Found ${this.findings.length} issues.`);
    return this.findings;
  }

  private emitProgress(phase: number, name: string) {
    this.currentPhase = phase;
    const pct = Math.round((phase / this.totalPhases) * 100);
    this.emit("progress", { phase, name, percent: pct });
    console.log(
      `\n  [${"█".repeat(Math.round(pct / 5))}${"░".repeat(20 - Math.round(pct / 5))}] ${pct}% — Phase ${phase}/${this.totalPhases}: ${name}`,
    );
  }

  private async loginToApp(page: Page, creds: NonNullable<ScanTarget["credentials"]>) {
    const loginUrl = creds.loginUrl || "";
    if (loginUrl) {
      await page.goto(loginUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    }

    await page.waitForTimeout(2000);

    const usernameSelectors = [
      'input[type="email"]',
      'input[name*="user"]',
      'input[name*="email"]',
      'input[id*="user"]',
      'input[id*="email"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="username" i]',
    ];
    const passwordSelectors = [
      'input[type="password"]',
      'input[name*="pass"]',
      'input[id*="pass"]',
    ];

    for (const sel of usernameSelectors) {
      const el = page.locator(sel).first();
      if ((await el.count()) > 0) {
        await el.fill(creds.username);
        break;
      }
    }

    for (const sel of passwordSelectors) {
      const el = page.locator(sel).first();
      if ((await el.count()) > 0) {
        await el.fill(creds.password);
        break;
      }
    }

    const submitBtn = page
      .locator(
        'button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign in")',
      )
      .first();
    if ((await submitBtn.count()) > 0) {
      await submitBtn.click();
      await page.waitForTimeout(3000);
    }

    log.info(`[Auth] Logged in as ${creds.username}`);
  }

  private async crawlPhase(page: Page, target: ScanTarget, onFinding: (f: ProFinding) => void) {
    const maxPages = target.maxPages ?? 30;
    const depth = target.depth ?? 3;
    const baseHost = new URL(target.url).hostname;

    const toVisit: Array<{ url: string; depth: number }> = [{ url: target.url, depth: 0 }];

    while (toVisit.length > 0 && this.discoveredUrls.size < maxPages) {
      const { url, depth: d } = toVisit.shift()!;
      if (this.discoveredUrls.has(url) || d > depth) {
        continue;
      }
      this.discoveredUrls.add(url);

      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
        await page.waitForTimeout(1500);

        const links = await page.evaluate(() =>
          Array.from(document.querySelectorAll("a[href]"))
            .map((a) => (a as HTMLAnchorElement).href)
            .filter((h) => h.startsWith("http")),
        );

        for (const link of links) {
          try {
            const linkHost = new URL(link).hostname;
            if (
              linkHost === baseHost &&
              !this.discoveredUrls.has(link) &&
              !link.includes("logout") &&
              !link.includes("signout")
            ) {
              toVisit.push({ url: link, depth: d + 1 });
            }
          } catch {}
        }

        const jsEndpoints = await this.extractJsEndpoints(page, baseHost);
        jsEndpoints.forEach((ep) => this.discoveredEndpoints.add(ep));

        const forms = await this.discoverForms(page, url);
        for (const form of forms) {
          this.discoveredEndpoints.add(form.action || url);
        }

        const secHeaderFinding = this.checkSecurityHeaders(url, this.capturedRequests);
        if (secHeaderFinding) {
          this.emitFinding(secHeaderFinding, onFinding);
        }

        log.info(`  ✓ Crawled: ${url} (${links.length} links found)`);
      } catch (err) {
        log.warn(`  ✗ Failed to crawl ${url}: ${(err as Error).message}`);
      }
    }

    log.info(
      `[Phase 1] Crawled ${this.discoveredUrls.size} pages, found ${this.discoveredEndpoints.size} endpoints`,
    );
  }

  private async extractJsEndpoints(page: Page, baseHost: string): Promise<string[]> {
    const endpoints: string[] = [];

    try {
      const scripts = await page.evaluate(() =>
        Array.from(document.querySelectorAll("script"))
          .map((s) => s.textContent || "")
          .join("\n"),
      );

      const apiPatterns = [
        /['"`](\/api\/[^'"`\s]+)['"`]/g,
        /fetch\(['"`]([^'"`]+)['"`]/g,
        /axios\.\w+\(['"`]([^'"`]+)['"`]/g,
        /url\s*[:=]\s*['"`]([^'"`]+)['"`]/g,
        /endpoint\s*[:=]\s*['"`]([^'"`]+)['"`]/g,
      ];

      for (const pattern of apiPatterns) {
        let match;
        while ((match = pattern.exec(scripts)) !== null) {
          const ep = match[1];
          if (ep.startsWith("/") || ep.includes(baseHost)) {
            endpoints.push(ep.startsWith("/") ? `https://${baseHost}${ep}` : ep);
          }
        }
      }

      const scriptUrls = await page.evaluate(() =>
        Array.from(document.querySelectorAll("script[src]"))
          .map((s) => (s as HTMLScriptElement).src)
          .filter((s) => s.startsWith("http")),
      );

      log.info(
        `  → Found ${endpoints.length} API endpoints in JS, ${scriptUrls.length} external scripts`,
      );
    } catch {}

    return [...new Set(endpoints)];
  }

  private async discoverForms(
    page: Page,
    url: string,
  ): Promise<Array<{ action: string; inputs: string[] }>> {
    try {
      return await page.evaluate((pageUrl) => {
        return Array.from(document.querySelectorAll("form")).map((form) => ({
          action: form.action || pageUrl,
          inputs: Array.from(form.querySelectorAll("input, textarea, select")).map(
            (el) => (el as HTMLInputElement).name || (el as HTMLInputElement).id || "unnamed",
          ),
        }));
      }, url);
    } catch {
      return [];
    }
  }

  private checkSecurityHeaders(url: string, requests: CapturedRequest[]): ProFinding | null {
    const req = requests.find((r) => r.url === url && r.response);
    if (!req?.response) {
      return null;
    }

    const headers = req.response.headers;
    const missing: string[] = [];

    if (!headers["content-security-policy"]) {
      missing.push("Content-Security-Policy");
    }
    if (
      !headers["x-frame-options"] &&
      !headers["content-security-policy"]?.includes("frame-ancestors")
    ) {
      missing.push("X-Frame-Options");
    }
    if (!headers["x-content-type-options"]) {
      missing.push("X-Content-Type-Options");
    }
    if (!headers["strict-transport-security"] && url.startsWith("https")) {
      missing.push("Strict-Transport-Security");
    }

    if (missing.length >= 2) {
      return {
        id: makeFindingId(),
        timestamp: new Date(),
        title: `Missing Security Headers: ${missing.join(", ")}`,
        severity: "low",
        category: "Security Misconfiguration",
        url,
        evidence: `Missing headers: ${missing.join(", ")}`,
        phase: "crawl",
        cvss: 3.1,
      };
    }
    return null;
  }

  private async passivePhase(onFinding: (f: ProFinding) => void) {
    for (const req of this.capturedRequests) {
      if (!req.response) {
        continue;
      }

      for (const [dataType, pattern] of Object.entries(SENSITIVE_DATA_PATTERNS)) {
        if (pattern.test(req.response.body)) {
          this.emitFinding(
            {
              id: makeFindingId(),
              timestamp: new Date(),
              title: `Sensitive Data Exposure: ${dataType}`,
              severity:
                dataType.includes("Key") || dataType.includes("Private") ? "high" : "medium",
              category: "Information Disclosure",
              url: req.url,
              evidence: `${dataType} pattern found in response body`,
              phase: "passive",
              cvss: dataType.includes("Key") ? 7.5 : 5.3,
            },
            onFinding,
          );
          break;
        }
      }

      let urlObj: URL | null = null;
      try {
        urlObj = new URL(req.url);
      } catch {}

      if (urlObj) {
        const sensitiveParams = ["id", "uid", "user_id", "userId", "account", "order", "invoice"];
        for (const param of sensitiveParams) {
          if (urlObj.searchParams.has(param)) {
            const existing = this.findings.find((f) => f.category === "IDOR" && f.url === req.url);
            if (!existing) {
              this.emitFinding(
                {
                  id: makeFindingId(),
                  timestamp: new Date(),
                  title: `Potential IDOR: Numeric/Object ID in Parameter '${param}'`,
                  severity: "medium",
                  category: "IDOR",
                  url: req.url,
                  parameter: param,
                  evidence: `Parameter '${param}' with value '${urlObj.searchParams.get(param)}' — try incrementing/decrementing`,
                  phase: "passive",
                  cvss: 6.5,
                },
                onFinding,
              );
            }
          }
        }
      }

      if (urlObj?.pathname.match(/\/\d{3,}(\/|$|\?)/)) {
        const existing = this.findings.find((f) => f.category === "IDOR" && f.url === req.url);
        if (!existing) {
          this.emitFinding(
            {
              id: makeFindingId(),
              timestamp: new Date(),
              title: "Potential IDOR: Sequential Numeric ID in URL Path",
              severity: "medium",
              category: "IDOR",
              url: req.url,
              evidence: `Numeric ID in path: ${urlObj.pathname} — try adjacent IDs`,
              phase: "passive",
              cvss: 6.5,
            },
            onFinding,
          );
        }
      }

      if (!req.headers["authorization"] && req.response.status === 200) {
        if (req.url.includes("/api/") && req.method !== "GET") {
          const csrfHeaders = ["x-csrf-token", "x-xsrf-token", "csrf-token"];
          const hasCSRF = csrfHeaders.some((h) => req.headers[h]);
          if (!hasCSRF) {
            this.emitFinding(
              {
                id: makeFindingId(),
                timestamp: new Date(),
                title: "Potential CSRF: State-Changing API Endpoint Without CSRF Token",
                severity: "medium",
                category: "CSRF",
                url: req.url,
                evidence: `${req.method} ${req.url} — no CSRF token detected in headers`,
                phase: "passive",
                cvss: 6.1,
              },
              onFinding,
            );
          }
        }
      }

      if (req.response.status >= 500) {
        this.emitFinding(
          {
            id: makeFindingId(),
            timestamp: new Date(),
            title: `Server Error Exposed: ${req.response.status}`,
            severity: "low",
            category: "Information Disclosure",
            url: req.url,
            evidence: `HTTP ${req.response.status} — server error may reveal internals`,
            phase: "passive",
            cvss: 3.7,
          },
          onFinding,
        );
      }
    }
  }

  private async activePhase(
    ctx: BrowserContext,
    target: ScanTarget,
    onFinding: (f: ProFinding) => void,
    concurrency: number,
  ) {
    const testUrls = [...this.discoveredUrls].slice(0, 20);

    const chunks: string[][] = [];
    for (let i = 0; i < testUrls.length; i += concurrency) {
      chunks.push(testUrls.slice(i, i + concurrency));
    }

    for (const chunk of chunks) {
      await Promise.allSettled(
        chunk.map(async (url) => {
          const page = await ctx.newPage();
          try {
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
            await page.waitForTimeout(800);

            const forms = await this.discoverForms(page, url);
            for (const form of forms) {
              await this.testFormInjection(page, url, form, onFinding);
            }

            await this.testUrlParams(page, url, onFinding);
            await this.testOpenRedirect(page, url, onFinding);
          } catch (err) {
            log.warn(`  ✗ Active test failed for ${url}: ${(err as Error).message}`);
          } finally {
            await page.close().catch(() => {});
          }
        }),
      );
    }
  }

  private async testOpenRedirect(page: Page, url: string, onFinding: (f: ProFinding) => void) {
    const urlObj = new URL(url);
    const redirectParams = [
      "redirect",
      "url",
      "next",
      "return",
      "returnTo",
      "redirect_uri",
      "goto",
      "dest",
      "destination",
      "redir",
    ];
    const testPayload = "https://evil.ironcliw-test.example.com";

    for (const param of redirectParams) {
      if (!urlObj.searchParams.has(param)) {
        continue;
      }
      try {
        const testUrl = new URL(url);
        testUrl.searchParams.set(param, testPayload);
        const resp = await page.goto(testUrl.toString(), { waitUntil: "commit", timeout: 8000 });
        const finalUrl = page.url();
        const status = resp?.status() ?? 0;

        if (
          finalUrl.includes("evil.ironcliw-test") ||
          (status >= 300 &&
            status < 400 &&
            resp?.headers()["location"]?.includes("evil.ironcliw-test"))
        ) {
          this.emitFinding(
            {
              id: makeFindingId(),
              timestamp: new Date(),
              title: `Open Redirect in Parameter '${param}'`,
              severity: "medium",
              category: "Open Redirect",
              url,
              parameter: param,
              payload: testPayload,
              evidence: `Redirect to attacker URL confirmed — final URL: ${finalUrl.slice(0, 100)}`,
              phase: "active",
              cvss: 6.1,
            },
            onFinding,
          );
        }
      } catch {}
    }
  }

  private async testFormInjection(
    page: Page,
    url: string,
    form: { action: string; inputs: string[] },
    onFinding: (f: ProFinding) => void,
  ) {
    const vulnTypes: Array<{
      payloads: string[];
      category: string;
      name: string;
      severity: Severity;
      cvss: number;
    }> = [
      {
        payloads: PAYLOADS.xss.slice(0, 5),
        category: "XSS",
        name: "Cross-Site Scripting",
        severity: "high",
        cvss: 6.1,
      },
      {
        payloads: PAYLOADS.sqli.slice(0, 5),
        category: "SQLi",
        name: "SQL Injection",
        severity: "critical",
        cvss: 9.8,
      },
      {
        payloads: PAYLOADS.ssti.slice(0, 3),
        category: "SSTI",
        name: "Server-Side Template Injection",
        severity: "critical",
        cvss: 9.8,
      },
    ];

    for (const vuln of vulnTypes) {
      for (const payload of vuln.payloads) {
        try {
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 });

          const inputs = await page
            .locator(
              'input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]), textarea',
            )
            .all();

          for (const input of inputs) {
            try {
              await input.fill(payload, { timeout: 3000 });
            } catch {}
          }

          const submitBtn = page.locator('button[type="submit"], input[type="submit"]').first();
          let responseBody = "";

          const responseHandler = (resp: import("playwright-core").Response) => {
            resp
              .text()
              .then((t) => {
                responseBody += t.slice(0, 5000);
              })
              .catch(() => {});
          };
          page.on("response", responseHandler);

          try {
            if ((await submitBtn.count()) > 0) {
              await Promise.race([submitBtn.click(), page.waitForTimeout(3000)]);
            }

            await page.waitForTimeout(2000);

            const pageContent = await page.content().catch(() => "");

            const signatures = VULN_SIGNATURES[vuln.category.toLowerCase()];
            if (signatures) {
              for (const sig of signatures) {
                if (sig.test(pageContent) || sig.test(responseBody)) {
                  this.emitFinding(
                    {
                      id: makeFindingId(),
                      timestamp: new Date(),
                      title: `${vuln.name} (${vuln.category}) Confirmed`,
                      severity: vuln.severity,
                      category: vuln.category,
                      url,
                      payload,
                      evidence: `Signature match: ${sig.toString()} — payload reflected/executed in response`,
                      phase: "active",
                      cvss: vuln.cvss,
                    },
                    onFinding,
                  );
                  break;
                }
              }
            }

            for (const alertText of ["XSS"]) {
              try {
                const dialog = await page.waitForEvent("dialog", { timeout: 1000 });
                if (dialog.message().includes(alertText)) {
                  this.emitFinding(
                    {
                      id: makeFindingId(),
                      timestamp: new Date(),
                      title: "Reflected XSS — alert() Executed",
                      severity: "high",
                      category: "XSS",
                      url,
                      payload,
                      evidence: `alert() dialog fired with message: "${dialog.message()}"`,
                      phase: "active",
                      cvss: 6.1,
                    },
                    onFinding,
                  );
                  await dialog.dismiss();
                }
              } catch {}
            }
          } catch {
          } finally {
            page.off("response", responseHandler);
          }
        } catch {}
      }
    }
  }

  private async testUrlParams(page: Page, url: string, onFinding: (f: ProFinding) => void) {
    const urlObj = new URL(url);
    if (urlObj.searchParams.size === 0) {
      return;
    }

    const vulnPayloads = [
      ...PAYLOADS.xss.slice(0, 3),
      ...PAYLOADS.sqli.slice(0, 3),
      ...PAYLOADS.pathTraversal.slice(0, 2),
      ...PAYLOADS.openRedirect.slice(0, 2),
    ];

    for (const [param] of urlObj.searchParams) {
      for (const payload of vulnPayloads) {
        try {
          const testUrl = new URL(url);
          testUrl.searchParams.set(param, payload);

          const resp = await page.goto(testUrl.toString(), {
            waitUntil: "domcontentloaded",
            timeout: 10000,
          });

          const body = (await resp?.text().catch(() => "")) ?? "";
          const pageContent = await page.content().catch(() => "");

          for (const [vulnType, signatures] of Object.entries(VULN_SIGNATURES)) {
            for (const sig of signatures) {
              if (sig.test(body) || sig.test(pageContent)) {
                this.emitFinding(
                  {
                    id: makeFindingId(),
                    timestamp: new Date(),
                    title: `${vulnType.toUpperCase()} in URL Parameter '${param}'`,
                    severity: ["sqli", "commandInjection", "ssti"].includes(vulnType)
                      ? "critical"
                      : "high",
                    category: vulnType.toUpperCase(),
                    url: testUrl.toString(),
                    parameter: param,
                    payload,
                    evidence: `Signature ${sig} matched in response to payload injection`,
                    phase: "active",
                    cvss: vulnType === "sqli" ? 9.8 : 7.5,
                  },
                  onFinding,
                );
              }
            }
          }
        } catch {}
      }
    }
  }

  private async apiPhase(onFinding: (f: ProFinding) => void) {
    const apiEndpoints = [...this.discoveredEndpoints].filter((ep) => ep.includes("/api/"));

    for (const endpoint of apiEndpoints.slice(0, 20)) {
      try {
        const authBypassHeaders: Record<string, string>[] = [
          { "X-Forwarded-For": "127.0.0.1" },
          { "X-Real-IP": "127.0.0.1" },
          { "X-Original-URL": "/" },
          { "X-Rewrite-URL": "/" },
          { Authorization: "null" },
          { Authorization: "Bearer undefined" },
          { "X-API-Key": "admin" },
          { "X-Admin": "1" },
        ];

        for (const extraHeaders of authBypassHeaders) {
          try {
            const resp = await fetch(endpoint, {
              headers: { ...extraHeaders, "Content-Type": "application/json" },
              signal: AbortSignal.timeout(8000),
            });

            if (resp.status === 200 || resp.status === 201) {
              const body = await resp.text();
              if (body.length > 50) {
                this.emitFinding(
                  {
                    id: makeFindingId(),
                    timestamp: new Date(),
                    title: `Auth Bypass via Header: ${Object.keys(extraHeaders)[0]}`,
                    severity: "high",
                    category: "Auth Bypass",
                    url: endpoint,
                    evidence: `Header ${JSON.stringify(extraHeaders)} returned HTTP ${resp.status} with ${body.length} bytes`,
                    phase: "api",
                    cvss: 8.1,
                  },
                  onFinding,
                );
              }
            }
          } catch {}
        }

        const idorPatterns = endpoint.match(/\/(\d+)(\/|$|\?)/g);
        if (idorPatterns) {
          const ids = [1, 2, 3, 0, -1, 999999, 1000000];
          const originalBody = await fetch(endpoint, { signal: AbortSignal.timeout(5000) })
            .then((r) => r.text())
            .catch(() => "");
          for (const testId of ids) {
            try {
              const testEndpoint = endpoint.replace(/\/\d+(\/|$|\?)/, `/${testId}$1`);
              if (testEndpoint === endpoint) {
                continue;
              }

              const resp = await fetch(testEndpoint, {
                signal: AbortSignal.timeout(5000),
              });

              if (resp.status === 200) {
                const body = await resp.text();
                if (body.length > 50 && body !== originalBody) {
                  this.emitFinding(
                    {
                      id: makeFindingId(),
                      timestamp: new Date(),
                      title: `API IDOR: Accessed Object ID ${testId} Without Authorization`,
                      severity: "high",
                      category: "IDOR",
                      url: testEndpoint,
                      evidence: `GET ${testEndpoint} returned HTTP 200 with ${body.length} bytes`,
                      phase: "api",
                      cvss: 7.5,
                    },
                    onFinding,
                  );
                }
              }
            } catch {}
          }
        }
      } catch {}
    }
  }

  private emitFinding(finding: ProFinding, onFinding: (f: ProFinding) => void) {
    const key = this.makeDedupeKey(finding);
    if (this.seenFindingKeys.has(key)) {
      return;
    }
    this.seenFindingKeys.add(key);

    this.findings.push(finding);
    this.emit("finding", finding);
    onFinding(finding);

    const icon = SEVERITY_ICONS[finding.severity];
    const phase = PHASE_ICONS[finding.phase];
    const ts = new Date().toLocaleTimeString();
    console.log(
      `\n  ${phase} ${icon} [${ts}] [${finding.severity.toUpperCase()}] ${finding.title}`,
    );
    console.log(`     URL: ${finding.url}`);
    if (finding.payload) {
      console.log(`     Payload: ${finding.payload.slice(0, 60)}`);
    }
    console.log(`     Evidence: ${finding.evidence.slice(0, 120)}`);
  }

  getFindings(): ProFinding[] {
    return [...this.findings];
  }
}

export function formatFindingForDisplay(f: ProFinding): string {
  const lines = [
    `${SEVERITY_ICONS[f.severity]} [${f.severity.toUpperCase()}] ${f.title}`,
    `   Category : ${f.category}`,
    `   URL      : ${f.url}`,
  ];
  if (f.parameter) {
    lines.push(`   Parameter: ${f.parameter}`);
  }
  if (f.payload) {
    lines.push(`   Payload  : ${f.payload.slice(0, 80)}`);
  }
  if (f.cvss) {
    lines.push(`   CVSS     : ${f.cvss}`);
  }
  lines.push(`   Evidence : ${f.evidence}`);
  return lines.join("\n");
}
