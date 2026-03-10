import type { Command } from "commander";
import {
  AutonomousHunter,
  type HuntSummary,
  type ReconResult,
} from "../../plugins/hunter/autonomous-hunter.js";
import type { ProFinding } from "../../plugins/proscan/scanner.js";
import { scopeManager } from "../../security/scope-manager.js";

const SEVERITY_COLOR: Record<string, string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🔵",
  info: "⚪",
};

function printBanner(target: string) {
  const line = "═".repeat(72);
  console.log("\n" + line);
  console.log("  🦾  IRONCLIW AUTONOMOUS HUNTER — FULL AUTO BUG BOUNTY MODE");
  console.log(line);
  console.log(`  Target  : ${target}`);
  console.log(`  Mode    : Fully autonomous — recon → scan → exploit → report`);
  console.log(line + "\n");
}

function printRecon(recon: ReconResult) {
  console.log("  ─── RECON RESULTS ───────────────────────────────────────────");
  console.log(`  Title      : ${recon.title}`);
  console.log(`  Status     : HTTP ${recon.statusCode} (${recon.responseTimeMs}ms)`);
  console.log(`  Final URL  : ${recon.finalUrl}`);
  console.log(
    `  Tech Stack : ${recon.techStack.length > 0 ? recon.techStack.join(", ") : "Unknown"}`,
  );
  console.log(`  Endpoints  : ${recon.endpoints.length} discovered`);
  console.log(`  Login Page : ${recon.hasLogin ? "✅ Yes" : "❌ No"}`);
  console.log(`  API Surface: ${recon.hasApi ? "✅ Yes" : "❌ No"}`);
  if (recon.robots.length > 0) {
    console.log(
      `  robots.txt : ${recon.robots.slice(0, 5).join(", ")}${recon.robots.length > 5 ? " ..." : ""}`,
    );
  }
  console.log();
}

function printFinding(f: ProFinding) {
  const icon = SEVERITY_COLOR[f.severity] ?? "⚪";
  console.log(`  ${icon} [${f.severity.toUpperCase()}] ${f.title}`);
  console.log(`     URL      : ${f.url}`);
  if (f.parameter) {
    console.log(`     Param    : ${f.parameter}`);
  }
  if (f.payload) {
    console.log(`     Payload  : ${f.payload.slice(0, 70)}`);
  }
  console.log(`     Evidence : ${f.evidence.slice(0, 100)}`);
  if (f.cvss) {
    console.log(`     CVSS     : ${f.cvss}`);
  }
  console.log();
}

function printSummary(summary: HuntSummary) {
  const line = "═".repeat(72);
  console.log(line);
  console.log("  🦾  HUNT COMPLETE");
  console.log(line);
  console.log(`  Target    : ${summary.target}`);
  console.log(`  Duration  : ${summary.durationSeconds}s`);
  console.log(`  Findings  : ${summary.totalFindings} total`);
  console.log(`    🔴 Critical : ${summary.criticalCount}`);
  console.log(`    🟠 High     : ${summary.highCount}`);
  console.log(`    🟡 Medium   : ${summary.mediumCount}`);
  console.log(`    🔵 Low      : ${summary.lowCount}`);
  console.log(`    ⚪ Info     : ${summary.infoCount}`);
  if (summary.reportPath) {
    console.log(`\n  📄 Report saved to: ${summary.reportPath}`);
  }
  console.log(line);

  if (summary.totalFindings === 0) {
    console.log("\n  ✅ No vulnerabilities found. Target appears clean for tested vectors.");
  } else {
    console.log(`\n  ⚠️  ${summary.totalFindings} issue(s) found. Check report for full details.`);
    if (summary.criticalCount > 0 || summary.highCount > 0) {
      console.log("  🚨 CRITICAL/HIGH issues detected — prioritize these for submission!");
    }
  }
  console.log();
}

export function registerHuntCommand(program: Command) {
  program
    .command("hunt")
    .description("🦾 Autonomous bug hunter — give a URL, IronCliw does everything")
    .argument("<target>", "Target URL or domain (e.g. https://target.com or target.com)")
    .option("--program-name <name>", "Bug bounty program name (for report)")
    .option("--platform <p>", "Report platform: bugcrowd|hackerone|intigriti|generic", "bugcrowd")
    .option("--username <u>", "Login username (for authenticated scan)")
    .option("--password <pw>", "Login password (for authenticated scan)")
    .option("--login-url <url>", "Login page URL")
    .option("--output <dir>", "Output directory for report")
    .option("--no-scope-check", "Skip scope authorization check")
    .action(async (target, options) => {
      const normalized = target.startsWith("http") ? target : `https://${target}`;

      if (options.scopeCheck !== false) {
        await scopeManager.load();
        const isAuth = await scopeManager.isAuthorized(normalized);
        if (!isAuth) {
          console.log(`\n⚠️  Target not in authorized scope.`);
          console.log(`   Add it: IronCliw scan scope --add ${new URL(normalized).hostname}`);
          console.log(`   Or use --no-scope-check to bypass\n`);
          return;
        }
      }

      printBanner(normalized);

      const hunter = new AutonomousHunter();

      hunter.on("recon", (recon: ReconResult) => {
        printRecon(recon);
        console.log("  ─── SCANNING ────────────────────────────────────────────────");
      });

      hunter.on("status", (evt: { phase: string; message: string }) => {
        console.log(`  [${evt.phase.toUpperCase()}] ${evt.message}`);
      });

      hunter.on("finding", (f: ProFinding) => {
        console.log(`\n  🔍 LIVE FINDING:`);
        printFinding(f);
      });

      const credentials = options.username
        ? {
            username: options.username,
            password: options.password ?? "",
            loginUrl: options.loginUrl,
          }
        : undefined;

      const summary = await hunter.hunt({
        url: normalized,
        programName: options.programName,
        credentials,
        platform: options.platform as "bugcrowd" | "hackerone" | "intigriti" | "generic",
        outputDir: options.output,
      });

      console.log("\n  ─── ALL FINDINGS ────────────────────────────────────────────\n");
      if (summary.findings.length === 0) {
        console.log("  No findings to display.\n");
      } else {
        for (const f of summary.findings) {
          printFinding(f);
        }
      }

      printSummary(summary);
    });
}
