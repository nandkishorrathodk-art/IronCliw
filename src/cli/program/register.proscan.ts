import type { Command } from "commander";
import { proScanPlugin } from "../../plugins/proscan/index.js";
import { generateReport } from "../../plugins/proscan/reporter.js";
import { ProScanner, formatFindingForDisplay } from "../../plugins/proscan/scanner.js";
import { scopeManager } from "../../security/scope-manager.js";

export function registerProScanCommand(program: Command) {
  const scan = program
    .command("scan")
    .description("IronCliw ProScan — AI-powered security scanner (Burp Suite alternative)");

  scan
    .command("target <url>")
    .description("Run full autonomous security scan on a single URL")
    .option("--depth <n>", "Crawl depth", "3")
    .option("--pages <n>", "Max pages to crawl", "30")
    .option("--headed", "Show browser window during scan")
    .option("--username <u>", "Login username for authenticated scan")
    .option("--password <p>", "Login password")
    .option("--login-url <url>", "Login page URL")
    .option("--report <path>", "Save report to file (Markdown)")
    .option("--platform <p>", "Report format: bugcrowd|hackerone|generic", "bugcrowd")
    .option("--no-scope-check", "Skip scope authorization check")
    .action(async (url, options) => {
      const normalized = url.startsWith("http") ? url : `https://${url}`;

      if (options.scopeCheck !== false) {
        const isAuth = await scopeManager.isAuthorized(normalized);
        if (!isAuth) {
          console.log(`\n⚠️  Target not in authorized scope.`);
          console.log(`   Add it with: IronCliw scan scope --add ${new URL(normalized).hostname}`);
          console.log(`   Or use --no-scope-check to bypass (not recommended)\n`);
          return;
        }
      }

      console.log("\n" + "═".repeat(72));
      console.log("  🦾 IRONCLIW PROSCAN — AUTONOMOUS SECURITY SCANNER");
      console.log("═".repeat(72));
      console.log(`  Target : ${normalized}`);
      console.log(`  Depth  : ${options.depth}`);
      console.log(`  Pages  : ${options.pages}`);
      if (options.username) {
        console.log(`  Auth   : ${options.username}`);
      }
      console.log("═".repeat(72) + "\n");

      const scanner = new ProScanner();
      const findings = await scanner.scan(
        {
          url: normalized,
          depth: parseInt(options.depth),
          maxPages: parseInt(options.pages),
          headed: options.headed ?? false,
          credentials: options.username
            ? {
                username: options.username,
                password: options.password ?? "",
                loginUrl: options.loginUrl,
              }
            : undefined,
        },
        {
          onFinding: () => {},
        },
      );

      if (findings.length === 0) {
        console.log("  ✅ No vulnerabilities found!\n");
        return;
      }

      console.log("\n📋 DETAILED FINDINGS:\n");
      findings.forEach((f, i) => {
        console.log(`[${i + 1}] ${formatFindingForDisplay(f)}\n`);
      });

      if (options.report) {
        await generateReport(findings, {
          platform: options.platform as "bugcrowd" | "hackerone" | "generic",
          outputPath: options.report,
        });
      }
    });

  scan
    .command("bounty")
    .description("Bug bounty hunting mode — scan program targets and auto-generate reports")
    .requiredOption("--program <name>", "Bug bounty program name (e.g. Fireblocks)")
    .option("--scope <targets>", "Comma-separated target domains/URLs")
    .option("--target <url>", "Single target URL")
    .option("--depth <n>", "Crawl depth", "3")
    .option("--pages <n>", "Max pages per target", "30")
    .option("--headed", "Show browser during scan")
    .option("--username <u>", "Auth username")
    .option("--password <p>", "Auth password")
    .option("--login-url <url>", "Login page URL")
    .option("--platform <p>", "Platform format: bugcrowd|hackerone|generic", "bugcrowd")
    .option("--researcher <name>", "Your researcher handle")
    .option("--out <dir>", "Output directory for reports", "proscan-reports")
    .action(async (options) => {
      const targets: string[] = [];

      if (options.scope) {
        targets.push(...options.scope.split(",").map((t: string) => t.trim()));
      }
      if (options.target) {
        targets.push(options.target);
      }

      if (targets.length === 0) {
        console.log("❌ Error: provide --scope or --target");
        return;
      }

      await proScanPlugin.bountyHunt({
        programName: options.program,
        targets,
        credentials: options.username
          ? {
              username: options.username,
              password: options.password ?? "",
              loginUrl: options.loginUrl,
            }
          : undefined,
        depth: parseInt(options.depth),
        maxPages: parseInt(options.pages),
        headed: options.headed ?? false,
        platform: options.platform as "bugcrowd" | "hackerone" | "intigriti" | "generic",
        researcher: options.researcher,
        saveDir: options.out,
      });
    });

  scan
    .command("report <findings-json>")
    .description("Generate a bug bounty report from a saved findings JSON file")
    .option("--program <name>", "Program name for report header")
    .option("--platform <p>", "Platform format: bugcrowd|hackerone|generic", "bugcrowd")
    .option("--out <path>", "Output file path")
    .option("--researcher <name>", "Your researcher handle")
    .action(async (findingsJson, options) => {
      try {
        const report = await proScanPlugin.reportFromFile(findingsJson, {
          programName: options.program ?? "Target Program",
          platform: options.platform as "bugcrowd" | "hackerone" | "generic",
          outputPath: options.out,
        });

        if (!options.out) {
          console.log(report);
        }
      } catch (err) {
        console.error(`❌ Failed to generate report: ${(err as Error).message}`);
      }
    });

  scan
    .command("scope")
    .description("Manage authorized scanning targets")
    .option("--add <domain>", "Add domain to authorized scope")
    .option("--remove <domain>", "Remove domain from scope")
    .option("--list", "List all authorized domains")
    .option(
      "--add-program <targets>",
      "Add multiple comma-separated targets (for a bug bounty program)",
    )
    .action(async (options) => {
      await scopeManager.load();

      if (options.add) {
        const added = await scopeManager.addScope(options.add);
        if (added) {
          await scopeManager.saveScopes();
          console.log(`✅ Added to scope: ${options.add}`);
        } else {
          console.log(`ℹ️  Already in scope: ${options.add}`);
        }
      }

      if (options.remove) {
        const removed = await scopeManager.removeScope(options.remove);
        if (removed) {
          await scopeManager.saveScopes();
          console.log(`✅ Removed from scope: ${options.remove}`);
        } else {
          console.log(`⚠️  Not found in scope: ${options.remove}`);
        }
      }

      if (options.addProgram) {
        const targets = options.addProgram.split(",").map((t: string) => t.trim());
        let added = 0;
        for (const t of targets) {
          const ok = await scopeManager.addScope(t);
          if (ok) {
            added++;
          }
        }
        await scopeManager.saveScopes();
        console.log(`✅ Added ${added} of ${targets.length} targets to scope`);
      }

      if (options.list) {
        const scopes = await scopeManager.getScopes();
        console.log("\n📋 Authorized Scanning Scope:");
        if (scopes.length === 0) {
          console.log("  (none — add targets with --add <domain>)");
        } else {
          scopes.forEach((s) => console.log(`  ✓ ${s}`));
        }
        console.log();
      }
    });

  scan
    .command("quick <url>")
    .description("Quick passive scan — analyze a URL for obvious issues without crawling")
    .action(async (url) => {
      const normalized = url.startsWith("http") ? url : `https://${url}`;
      console.log(`\n🔍 Quick scan: ${normalized}\n`);

      try {
        const resp = await fetch(normalized, {
          signal: AbortSignal.timeout(10000),
          redirect: "manual",
        });

        const headers = Object.fromEntries(resp.headers.entries());

        const checks = [
          {
            name: "Content-Security-Policy",
            ok: !!headers["content-security-policy"],
            severity: "medium",
          },
          {
            name: "X-Frame-Options",
            ok:
              !!headers["x-frame-options"] ||
              headers["content-security-policy"]?.includes("frame-ancestors"),
            severity: "medium",
          },
          {
            name: "X-Content-Type-Options",
            ok: !!headers["x-content-type-options"],
            severity: "low",
          },
          {
            name: "Strict-Transport-Security",
            ok: normalized.startsWith("https") ? !!headers["strict-transport-security"] : true,
            severity: "high",
          },
          {
            name: "HTTPS Enforced",
            ok: normalized.startsWith("https"),
            severity: "high",
          },
          {
            name: "Server Header Hidden",
            ok: !headers["server"] || headers["server"] === "",
            severity: "low",
          },
          {
            name: "X-Powered-By Hidden",
            ok: !headers["x-powered-by"],
            severity: "low",
          },
        ];

        let issues = 0;
        for (const check of checks) {
          const icon = check.ok ? "✅" : "❌";
          const sev = check.ok ? "" : ` [${check.severity.toUpperCase()}]`;
          console.log(`  ${icon} ${check.name}${sev}`);
          if (!check.ok) {
            issues++;
          }
        }

        if (headers["server"]) {
          console.log(`\n  ℹ️  Server: ${headers["server"]}`);
        }
        if (headers["x-powered-by"]) {
          console.log(`  ℹ️  X-Powered-By: ${headers["x-powered-by"]}`);
        }

        console.log(`\n  HTTP Status: ${resp.status}`);
        console.log(`  Issues found: ${issues}\n`);

        if (issues > 0) {
          console.log(
            `  👉 Run 'IronCliw scan target ${normalized}' for a full autonomous scan.\n`,
          );
        }
      } catch (err) {
        console.error(`  ❌ Error: ${(err as Error).message}\n`);
      }
    });
}
