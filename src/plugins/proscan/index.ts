import fs from "node:fs/promises";
import path from "node:path";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import { scopeManager } from "../../security/scope-manager.js";
import { generateReport, printFindingSummary } from "./reporter.js";
import { ProScanner, type ProFinding, type ScanTarget, type ScanOptions } from "./scanner.js";

const log = createSubsystemLogger("proscan");

export interface BountyHuntOptions {
  programName: string;
  targets: string[];
  credentials?: { username: string; password: string; loginUrl?: string };
  depth?: number;
  maxPages?: number;
  headed?: boolean;
  platform?: "bugcrowd" | "hackerone" | "intigriti" | "generic";
  researcher?: string;
  saveDir?: string;
}

export class ProScanPlugin {
  private scanner = new ProScanner();

  async scan(target: ScanTarget, opts: ScanOptions = {}): Promise<ProFinding[]> {
    const isAuth = await scopeManager.isAuthorized(target.url);
    if (!isAuth) {
      throw new Error(
        `Target not in authorized scope: ${target.url}\n` +
          `Run: IronCliw scan scope --add <domain>  to authorize it.`,
      );
    }

    log.info(`[ProScan] Scanning: ${target.url}`);
    const findings = await this.scanner.scan(target, opts);
    printFindingSummary(findings);
    return findings;
  }

  async bountyHunt(opts: BountyHuntOptions): Promise<void> {
    console.log("\n" + "═".repeat(72));
    console.log("  🦾 IRONCLIW PROSCAN — BUG BOUNTY HUNT MODE");
    console.log("═".repeat(72));
    console.log(`  Program  : ${opts.programName}`);
    console.log(`  Targets  : ${opts.targets.join(", ")}`);
    console.log(`  Platform : ${opts.platform ?? "bugcrowd"}`);
    console.log("═".repeat(72) + "\n");

    const allFindings: ProFinding[] = [];

    for (const targetUrl of opts.targets) {
      const normalized = targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`;

      await scopeManager.addScope(normalized);

      console.log(`\n🎯 Scanning target: ${normalized}`);

      try {
        const findings = await this.scanner.scan(
          {
            url: normalized,
            credentials: opts.credentials,
            depth: opts.depth ?? 3,
            maxPages: opts.maxPages ?? 30,
            headed: opts.headed ?? false,
          },
          {
            onFinding: (f) => {
              allFindings.push(f);
            },
          },
        );

        allFindings.push(...findings.filter((f) => !allFindings.some((af) => af.id === f.id)));
      } catch (err) {
        log.error(`Scan failed for ${normalized}: ${(err as Error).message}`);
        console.log(`  ⚠️  Scan error: ${(err as Error).message}`);
      }
    }

    printFindingSummary(allFindings);

    if (allFindings.length === 0) {
      console.log("  ✅ No vulnerabilities found! Program appears secure for tested scope.\n");
      return;
    }

    const saveDir = opts.saveDir ?? "proscan-reports";
    await fs.mkdir(saveDir, { recursive: true });

    const safeProgram = opts.programName.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const reportPath = path.join(saveDir, `${safeProgram}-${timestamp}.md`);
    const findingsPath = path.join(saveDir, `${safeProgram}-${timestamp}.json`);

    await generateReport(allFindings, {
      programName: opts.programName,
      platform: opts.platform ?? "bugcrowd",
      researcher: opts.researcher,
      outputPath: reportPath,
    });

    await fs.writeFile(findingsPath, JSON.stringify(allFindings, null, 2), "utf-8");
    console.log(`📦 Raw findings saved to: ${findingsPath}`);

    console.log("\n" + "═".repeat(72));
    console.log("  NEXT STEPS:");
    console.log("═".repeat(72));

    const criticals = allFindings.filter((f) => f.severity === "critical");
    const highs = allFindings.filter((f) => f.severity === "high");

    if (criticals.length > 0) {
      console.log(`\n  🔴 Submit ${criticals.length} CRITICAL finding(s) IMMEDIATELY:`);
      criticals.forEach((f) => console.log(`     → ${f.title.slice(0, 70)}`));
    }
    if (highs.length > 0) {
      console.log(`\n  🟠 Submit ${highs.length} HIGH finding(s):`);
      highs.forEach((f) => console.log(`     → ${f.title.slice(0, 70)}`));
    }
    console.log(`\n  📄 Full report ready at: ${reportPath}`);
    console.log("═".repeat(72) + "\n");
  }

  async reportFromFile(
    findingsPath: string,
    opts: {
      programName?: string;
      platform?: "bugcrowd" | "hackerone" | "intigriti" | "generic";
      outputPath?: string;
    } = {},
  ): Promise<string> {
    const raw = await fs.readFile(findingsPath, "utf-8");
    const findings: ProFinding[] = JSON.parse(raw);
    return await generateReport(findings, opts);
  }
}

export const proScanPlugin = new ProScanPlugin();
export { type ProFinding, type ScanTarget } from "./scanner.js";
export { generateReport, printFindingSummary } from "./reporter.js";
