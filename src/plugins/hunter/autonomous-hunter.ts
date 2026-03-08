import { EventEmitter } from "node:events";
import { ProScanner, type ProFinding } from "../proscan/scanner.js";
import { generateReport } from "../proscan/reporter.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("hunter/autonomous");

export interface HuntTarget {
  url: string;
  programName?: string;
  credentials?: { username: string; password: string; loginUrl?: string };
  scope?: string[];
  platform?: "bugcrowd" | "hackerone" | "intigriti" | "generic";
  outputDir?: string;
}

export interface ReconResult {
  finalUrl: string;
  title: string;
  techStack: string[];
  endpoints: string[];
  forms: number;
  hasLogin: boolean;
  hasApi: boolean;
  robots: string[];
  sitemap: string[];
  headers: Record<string, string>;
  statusCode: number;
  responseTimeMs: number;
}

export interface HuntSummary {
  target: string;
  programName: string;
  startedAt: Date;
  completedAt: Date;
  durationSeconds: number;
  recon: ReconResult;
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  findings: ProFinding[];
  reportPath?: string;
}

const TECH_SIGNATURES: Array<{ pattern: RegExp; tech: string }> = [
  { pattern: /wp-content|wp-includes|wordpress/i, tech: "WordPress" },
  { pattern: /drupal/i, tech: "Drupal" },
  { pattern: /joomla/i, tech: "Joomla" },
  { pattern: /laravel/i, tech: "Laravel (PHP)" },
  { pattern: /django|csrfmiddlewaretoken/i, tech: "Django (Python)" },
  { pattern: /rails|authenticity_token/i, tech: "Ruby on Rails" },
  { pattern: /__next|_next\/static/i, tech: "Next.js" },
  { pattern: /nuxt/i, tech: "Nuxt.js" },
  { pattern: /react/i, tech: "React" },
  { pattern: /angular/i, tech: "Angular" },
  { pattern: /vue\.js|vuejs/i, tech: "Vue.js" },
  { pattern: /graphql/i, tech: "GraphQL" },
  { pattern: /swagger|openapi/i, tech: "OpenAPI/Swagger" },
  { pattern: /strapi/i, tech: "Strapi (CMS)" },
  { pattern: /shopify/i, tech: "Shopify" },
  { pattern: /\.php/i, tech: "PHP" },
  { pattern: /\.asp/i, tech: "ASP.NET" },
  { pattern: /\.jsp/i, tech: "Java (JSP)" },
];

/**
 * AutonomousHunter — The core engine for fully autonomous bug hunting.
 * Give it a URL, it figures out everything else.
 *
 * Flow:
 *  1. Recon      — detect tech, find endpoints, check headers
 *  2. Strategy   — pick best scan approach based on recon
 *  3. ProScan    — full 4-phase scan (crawl + passive + active + API)
 *  4. Report     — generate structured bug bounty report
 */
export class AutonomousHunter extends EventEmitter {
  private scanner = new ProScanner();

  async hunt(target: HuntTarget): Promise<HuntSummary> {
    const startedAt = new Date();
    const normalized = target.url.startsWith("http") ? target.url : `https://${target.url}`;
    const programName = target.programName ?? new URL(normalized).hostname;

    this.emit("status", { phase: "recon", message: `Starting reconnaissance on ${normalized}` });
    log.info(`[Hunter] 🎯 Target: ${normalized}`);

    const recon = await this.recon(normalized);
    this.emit("recon", recon);
    log.info(`[Hunter] Recon done — tech: [${recon.techStack.join(", ")}], endpoints: ${recon.endpoints.length}`);

    const strategy = this.buildStrategy(recon, target);
    this.emit("status", { phase: "scan", message: `Strategy: ${strategy.label}` });
    log.info(`[Hunter] Strategy: ${strategy.label}`);

    const findings: ProFinding[] = [];
    this.scanner.on("finding", (f: ProFinding) => {
      findings.push(f);
      this.emit("finding", f);
    });

    this.emit("status", { phase: "scan", message: "Running full autonomous security scan..." });
    await this.scanner.scan(
      {
        url: normalized,
        credentials: target.credentials,
        depth: strategy.depth,
        maxPages: strategy.maxPages,
        headed: false,
        timeoutMs: strategy.timeoutMs,
        includeAPIs: strategy.includeAPIs,
      },
      {
        concurrency: strategy.concurrency,
        onFinding: (f) => {
          findings.push(f);
          this.emit("finding", f);
        },
      },
    );

    const deduped = this.deduplicate(findings);
    const completedAt = new Date();
    const durationSeconds = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000);

    let reportPath: string | undefined;
    if (deduped.length > 0) {
      this.emit("status", { phase: "report", message: "Generating bug bounty report..." });
      try {
        reportPath = await generateReport(deduped, {
          programName,
          programUrl: normalized,
          platform: target.platform ?? "bugcrowd",
          outputPath: target.outputDir
            ? `${target.outputDir}\\ironcliw-report-${Date.now()}.md`
            : `ironcliw-hunt-${programName.replace(/[^a-z0-9]/gi, "_")}-${Date.now()}.md`,
        });
      } catch (err) {
        log.warn(`[Hunter] Report generation failed: ${(err as Error).message}`);
      }
    }

    const summary: HuntSummary = {
      target: normalized,
      programName,
      startedAt,
      completedAt,
      durationSeconds,
      recon,
      totalFindings: deduped.length,
      criticalCount: deduped.filter(f => f.severity === "critical").length,
      highCount: deduped.filter(f => f.severity === "high").length,
      mediumCount: deduped.filter(f => f.severity === "medium").length,
      lowCount: deduped.filter(f => f.severity === "low").length,
      infoCount: deduped.filter(f => f.severity === "info").length,
      findings: deduped,
      reportPath,
    };

    this.emit("complete", summary);
    return summary;
  }

  /**
   * Phase 1 — Reconnaissance.
   * Fetches the homepage, checks headers, detects tech stack,
   * reads robots.txt + sitemap, and identifies login/API surfaces.
   */
  private async recon(url: string): Promise<ReconResult> {
    const endpoints: string[] = [];
    const techStack: string[] = [];
    let title = "";
    let hasLogin = false;
    let hasApi = false;
    let statusCode = 0;
    let responseHeaders: Record<string, string> = {};
    let responseTimeMs = 0;
    let finalUrl = url;

    try {
      const start = Date.now();
      const resp = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(10000),
        headers: { "User-Agent": "IronCliw-Hunter/1.0" },
      });
      responseTimeMs = Date.now() - start;
      statusCode = resp.status;
      finalUrl = resp.url;

      resp.headers.forEach((v, k) => { responseHeaders[k] = v; });

      const body = await resp.text();

      const titleMatch = body.match(/<title[^>]*>([^<]+)<\/title>/i);
      title = titleMatch?.[1]?.trim() ?? new URL(finalUrl).hostname;

      for (const sig of TECH_SIGNATURES) {
        if (sig.pattern.test(body)) {
          if (!techStack.includes(sig.tech)) { techStack.push(sig.tech); }
        }
      }

      const serverHeader = responseHeaders["server"] ?? "";
      if (serverHeader && !techStack.some(t => t.toLowerCase().includes("server"))) {
        techStack.push(`Server: ${serverHeader}`);
      }
      const poweredBy = responseHeaders["x-powered-by"] ?? "";
      if (poweredBy) { techStack.push(`X-Powered-By: ${poweredBy}`); }

      const hrefPattern = /href=["']([^"'#]+)["']/gi;
      const srcPattern = /(?:action|src|data-url|data-href)=["']([^"'#]+)["']/gi;
      const allLinks = [...body.matchAll(hrefPattern), ...body.matchAll(srcPattern)];
      for (const match of allLinks) {
        try {
          const href = match[1] ?? "";
          const abs = new URL(href, finalUrl).toString();
          if (abs.startsWith(finalUrl.replace(/\/+$/, "")) || new URL(abs).hostname === new URL(finalUrl).hostname) {
            if (!endpoints.includes(abs)) { endpoints.push(abs); }
          }
        } catch { }
      }

      hasLogin = /login|signin|sign-in|auth|password/i.test(body + JSON.stringify(responseHeaders));
      hasApi = /api\//i.test(body) || /application\/json/i.test(responseHeaders["content-type"] ?? "");

      if (/graphql/i.test(body)) {
        endpoints.push(new URL("/graphql", finalUrl).toString());
        if (!techStack.includes("GraphQL")) { techStack.push("GraphQL"); }
      }
      if (/swagger|openapi/i.test(body)) {
        endpoints.push(new URL("/api-docs", finalUrl).toString());
        endpoints.push(new URL("/swagger.json", finalUrl).toString());
        endpoints.push(new URL("/openapi.json", finalUrl).toString());
      }
    } catch (err) {
      log.warn(`[Hunter] Main page fetch failed: ${(err as Error).message}`);
    }

    const robots = await this.fetchRobots(finalUrl);
    const sitemap = await this.fetchSitemap(finalUrl);

    for (const robotUrl of robots) {
      try {
        const abs = new URL(robotUrl, finalUrl).toString();
        if (!endpoints.includes(abs)) { endpoints.push(abs); }
      } catch { }
    }

    return {
      finalUrl,
      title,
      techStack,
      endpoints: endpoints.slice(0, 100),
      forms: 0,
      hasLogin,
      hasApi,
      robots,
      sitemap: sitemap.slice(0, 50),
      headers: responseHeaders,
      statusCode,
      responseTimeMs,
    };
  }

  private async fetchRobots(baseUrl: string): Promise<string[]> {
    try {
      const resp = await fetch(new URL("/robots.txt", baseUrl).toString(), {
        signal: AbortSignal.timeout(5000),
      });
      if (!resp.ok) { return []; }
      const text = await resp.text();
      const paths: string[] = [];
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (trimmed.startsWith("Disallow:") || trimmed.startsWith("Allow:")) {
          const path = trimmed.split(":")[1]?.trim();
          if (path && path !== "/" && path !== "*") { paths.push(path); }
        }
      }
      return paths;
    } catch {
      return [];
    }
  }

  private async fetchSitemap(baseUrl: string): Promise<string[]> {
    try {
      const resp = await fetch(new URL("/sitemap.xml", baseUrl).toString(), {
        signal: AbortSignal.timeout(5000),
      });
      if (!resp.ok) { return []; }
      const text = await resp.text();
      const urls: string[] = [];
      const matches = text.matchAll(/<loc>([^<]+)<\/loc>/gi);
      for (const m of matches) {
        if (m[1]) { urls.push(m[1].trim()); }
      }
      return urls;
    } catch {
      return [];
    }
  }

  /**
   * Phase 2 — Build scan strategy based on recon.
   * Adjusts depth, concurrency, and timeout based on what we found.
   */
  private buildStrategy(recon: ReconResult, _target: HuntTarget): {
    label: string;
    depth: number;
    maxPages: number;
    concurrency: number;
    timeoutMs: number;
    includeAPIs: boolean;
  } {
    const isLarge = recon.endpoints.length > 50;
    const hasGraphQL = recon.techStack.some(t => t.includes("GraphQL"));
    const hasWordPress = recon.techStack.some(t => t.includes("WordPress"));

    if (hasWordPress) {
      return {
        label: "WordPress deep scan (CMS-specific vectors)",
        depth: 4,
        maxPages: 40,
        concurrency: 3,
        timeoutMs: 15 * 60 * 1000,
        includeAPIs: true,
      };
    }

    if (hasGraphQL) {
      return {
        label: "GraphQL + REST API focused scan",
        depth: 2,
        maxPages: 20,
        concurrency: 4,
        timeoutMs: 12 * 60 * 1000,
        includeAPIs: true,
      };
    }

    if (recon.hasApi && !recon.hasLogin) {
      return {
        label: "API-only surface scan",
        depth: 2,
        maxPages: 20,
        concurrency: 5,
        timeoutMs: 8 * 60 * 1000,
        includeAPIs: true,
      };
    }

    if (isLarge) {
      return {
        label: "Large application — breadth-first scan",
        depth: 3,
        maxPages: 30,
        concurrency: 3,
        timeoutMs: 12 * 60 * 1000,
        includeAPIs: true,
      };
    }

    return {
      label: "Standard full-coverage scan",
      depth: 3,
      maxPages: 30,
      concurrency: 3,
      timeoutMs: 10 * 60 * 1000,
      includeAPIs: true,
    };
  }

  private deduplicate(findings: ProFinding[]): ProFinding[] {
    const seen = new Set<string>();
    return findings.filter(f => {
      const key = `${f.category}:${f.url}:${f.parameter ?? ""}:${(f.payload ?? "").slice(0, 30)}`;
      if (seen.has(key)) { return false; }
      seen.add(key);
      return true;
    });
  }
}

export const autonomousHunter = new AutonomousHunter();
