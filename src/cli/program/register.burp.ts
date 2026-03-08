import type { Command } from "commander";
import { burpPlugin } from "../../plugins/burpsuite/index.js";
import { scopeManager } from "../../security/scope-manager.js";
import { promptYesNo } from "../prompt.js";

export function registerBurpCommand(program: Command) {
  const burp = program.command("burp").description("Burp Suite Professional — full autonomous integration");

  burp
    .command("init")
    .description("Initialize Burp Suite connection (Burp must be running with REST API enabled)")
    .option("--url <url>", "Burp REST API base URL", "http://127.0.0.1:1337")
    .option("--key <key>", "Burp REST API key", "")
    .option("--fireworks-key <fkey>", "Fireworks API key for Vision Engine")
    .action(async (options) => {
      console.log(`\n🔌 Connecting to Burp Suite at ${options.url}...`);
      if (options.fireworksKey) {
        process.env.FIREWORKS_API_KEY = options.fireworksKey;
      }
      await burpPlugin.init({ baseUrl: options.url, apiKey: options.key });
      const status = await burpPlugin.checkStatus();
      console.log(`Status  : ${status.status}`);
      if ("capabilities" in status) {
        console.log(`Modules : ${status.capabilities.join(", ")}`);
      }
    });

  burp
    .command("status")
    .description("Show Burp connection status and capabilities")
    .action(async () => {
      const status = await burpPlugin.checkStatus();
      console.log(JSON.stringify(status, null, 2));
    });

  burp
    .command("hunt")
    .description("Visual AI hunt — screenshot Burp UI and analyze with Kimi Vision")
    .argument("[task]", "Hunting task", "Find potential IDOR in proxy history")
    .option("--model <model>", "Fireworks model ID", "accounts/fireworks/models/kimi-v1.5-vision-instruct")
    .action(async (task, options) => {
      console.log(`\n🦾 Starting Visual Hunt: ${task}`);
      const analysis = await burpPlugin.performVisualHunt(task, options.model);
      console.log("\n--- AI FINDINGS ---");
      console.log(analysis.findings);
      console.log("\n--- SUGGESTION ---");
      console.log(analysis.suggestion);

      if (analysis.elements?.length > 0) {
        const proceed = await promptYesNo("Execute suggested action in Burp?");
        if (proceed) {
          await burpPlugin.executeVisualTest({
            analysis,
            targetElement: analysis.elements[0].label,
            action: "click",
          });
          console.log("✅ Action executed.");
        }
      }
    });

  burp
    .command("repeater")
    .description("Autonomous Repeater — pull proxy history and inject payloads into all parameters")
    .option("--filter <url>", "Only test URLs containing this string")
    .option("--types <types>", "Vuln types: xss,sqli,ssti,path_traversal,open_redirect", "xss,sqli,ssti,path_traversal")
    .option("--max <n>", "Max requests to send", "500")
    .action(async (options) => {
      console.log("\n" + "═".repeat(70));
      console.log("  🔁 IRONCLIW BURP REPEATER — AUTONOMOUS PAYLOAD INJECTION");
      console.log("═".repeat(70));
      console.log("  Pulling proxy history from Burp...");

      const vulnTypes = options.types.split(",").map((s: string) => s.trim());
      const findings = await burpPlugin.repeaterHunt({
        filterUrl: options.filter,
        vulnTypes,
        maxRequests: Number(options.max),
      });

      console.log(`\n  Found ${findings.length} potential issue(s):\n`);
      for (const f of findings) {
        const sev = f.vulnType === "sqli" || f.vulnType === "ssti" ? "🔴 CRITICAL" : "🟠 HIGH";
        console.log(`  ${sev} [${f.vulnType.toUpperCase()}]`);
        console.log(`    URL       : ${f.url}`);
        console.log(`    Parameter : ${f.parameter}`);
        console.log(`    Payload   : ${f.payload.slice(0, 60)}`);
        console.log(`    Evidence  : ${f.evidence}`);
        console.log(`    HTTP      : ${f.statusCode} | ${f.responseTime}ms\n`);
      }
    });

  burp
    .command("intruder")
    .description("Autonomous Intruder — fuzz a target URL with payloads in all 4 attack modes")
    .argument("<url>", "Target URL (use §param§ markers for injection positions)")
    .option("--mode <mode>", "Attack mode: sniper|battering-ram|pitchfork|cluster-bomb", "sniper")
    .option("--param <names>", "Comma-separated parameter names to fuzz", "id")
    .option("--payloads <file>", "Newline-separated payload file (or use built-in)")
    .option("--method <m>", "HTTP method", "GET")
    .option("--max <n>", "Max requests", "1000")
    .action(async (url, options) => {
      console.log("\n" + "═".repeat(70));
      console.log("  🎯 IRONCLIW BURP INTRUDER — AUTONOMOUS FUZZER");
      console.log("═".repeat(70));
      console.log(`  Target : ${url}`);
      console.log(`  Mode   : ${options.mode}`);

      const positionNames = options.param.split(",").map((s: string) => s.trim());

      let payloadList: string[];
      if (options.payloads) {
        const { readFileSync } = await import("node:fs");
        payloadList = readFileSync(options.payloads, "utf-8").split("\n").filter(Boolean);
      } else {
        payloadList = [
          `'`, `"`, `<script>alert(1)</script>`, `{{7*7}}`,
          `../../../etc/passwd`, `1 OR 1=1`, `1; DROP TABLE users--`,
          `admin`, `true`, `null`, `undefined`, `-1`, `0`, `999999`,
        ];
      }

      const report = await burpPlugin.intruderAttack({
        url,
        method: options.method,
        payloads: [payloadList],
        positionNames,
        mode: options.mode as "sniper" | "battering-ram" | "pitchfork" | "cluster-bomb",
        maxRequests: Number(options.max),
      });

      console.log(`\n  Sent ${report.totalRequests} requests. Baseline: HTTP ${report.baselineStatusCode}, ${report.baselineLength}B`);
      console.log(`  Anomalies found: ${report.findings.length}\n`);

      const top10 = report.findings.slice(0, 10);
      for (const f of top10) {
        console.log(`  Score: ${(f.anomalyScore * 100).toFixed(0)}% | HTTP ${f.statusCode} | ${f.responseLength}B | ${f.responseTime}ms`);
        console.log(`    Payloads : ${JSON.stringify(f.payloads)}`);
        for (const flag of f.flags) {
          console.log(`    ⚠️  ${flag}`);
        }
        console.log();
      }
    });

  burp
    .command("intercept")
    .description("Start autonomous proxy interceptor — modify requests in real-time")
    .option("--inject-header <header>", "Inject header (format: Name:Value)")
    .option("--inject-param <param>", "Inject payload into URL/body param (format: name:payload)")
    .option("--max <n>", "Max messages to process (0 = unlimited)", "0")
    .action(async (options) => {
      console.log("\n" + "═".repeat(70));
      console.log("  🕵️  IRONCLIW BURP INTERCEPTOR — REAL-TIME REQUEST MODIFIER");
      console.log("═".repeat(70));
      console.log("  Watching Burp proxy intercept queue... (Ctrl+C to stop)\n");

      const opts: Parameters<typeof burpPlugin.startInterceptor>[0] = {};

      if (options.injectHeader) {
        const [name, ...rest] = options.injectHeader.split(":");
        opts.injectHeader = { name: name ?? "", value: rest.join(":").trim() };
        console.log(`  Rule: Inject header "${opts.injectHeader.name}: ${opts.injectHeader.value}"`);
      }

      if (options.injectParam) {
        const [pname, ...prest] = options.injectParam.split(":");
        opts.injectPayload = { param: pname ?? "", payload: prest.join(":").trim() };
        console.log(`  Rule: Inject payload into param "${opts.injectPayload.param}"`);
      }

      opts.maxMessages = Number(options.max) > 0 ? Number(options.max) : undefined;
      opts.onIntercept = (req, action) => {
        const r = req as { method: string; url: string };
        console.log(`  [${new Date().toISOString()}] ${r.method} ${r.url.slice(0, 80)} → ${action}`);
      };

      await burpPlugin.startInterceptor(opts);
      console.log("\n  Interceptor stopped.");
    });

  burp
    .command("scan")
    .description("Launch Burp active scanner on a URL and wait for results")
    .argument("<url>", "Target URL to scan")
    .option("--username <u>", "Login username for authenticated scan")
    .option("--password <p>", "Login password")
    .option("--wait", "Wait for scan to complete before printing results")
    .option("--timeout <ms>", "Scan timeout in ms", "300000")
    .action(async (url, options) => {
      console.log(`\n🔍 Starting Burp Active Scan: ${url}`);
      const result = await burpPlugin.startActiveScan(url, {
        username: options.username,
        password: options.password,
        waitForCompletion: !!options.wait,
        timeoutMs: Number(options.timeout),
      });

      console.log(`  Task ID : ${result.taskId}`);
      if ("result" in result && result.result) {
        console.log(`  Status  : ${result.result.status}`);
        console.log(`  Issues  : ${result.result.issuesCount}`);
      }
      if ("issues" in result && result.issues) {
        for (const issue of result.issues) {
          console.log(`\n  [${issue.severity}] ${issue.name}`);
          console.log(`    URL: ${issue.url}`);
          console.log(`    ${issue.description.slice(0, 120)}...`);
        }
      }
    });

  burp
    .command("analyze")
    .description("Analyze a raw HTTP response for vulnerabilities")
    .option("--url <url>", "Request URL")
    .option("--payload <p>", "Payload that was sent")
    .option("--status <n>", "HTTP status code", "200")
    .option("--body <b>", "Response body (or pipe via stdin)")
    .option("--vuln-type <t>", "Specific vuln type to check (xss|sqli|ssti|path_traversal|open_redirect|idor|rce)")
    .option("--time <ms>", "Response time in ms", "0")
    .action(async (options) => {
      const body = options.body ?? "";
      const result = burpPlugin.analyzeResponse({
        responseBody: body,
        statusCode: Number(options.status),
        responseHeaders: {},
        responseTimeMs: Number(options.time),
        requestUrl: options.url ?? "",
        requestPayload: options.payload,
        vulnType: options.vulnType,
      });

      if (Array.isArray(result)) {
        console.log(`\n  Auto-detect results (${result.length} findings):`);
        for (const r of result) {
          if (r.confirmed) {
            console.log(`\n  ✅ [${r.vulnType}] CVSS ${r.cvss}`);
            console.log(`     Evidence   : ${r.evidence}`);
            console.log(`     Remediation: ${r.remediation}`);
          }
        }
        if (result.filter(r => r.confirmed).length === 0) {
          console.log("  No vulnerabilities confirmed.");
        }
      } else {
        const r = result;
        console.log(`\n  ${r.confirmed ? "✅ CONFIRMED" : "❌ Not confirmed"}: [${r.vulnType}]`);
        if (r.confirmed) {
          console.log(`  Evidence   : ${r.evidence}`);
          console.log(`  CVSS       : ${r.cvss}`);
          console.log(`  Remediation: ${r.remediation}`);
        }
      }
    });

  burp
    .command("scope")
    .description("Manage authorized testing scopes")
    .option("--add <domain>", "Add domain to authorized scope")
    .option("--list", "List authorized scopes")
    .action(async (options) => {
      await scopeManager.load();
      if (options.add) {
        console.log(`Adding ${options.add} to authorized scopes...`);
      }
      if (options.list) {
        const scopes = scopeManager.getScopes();
        console.log(`Authorized Scopes (${scopes.length}):`);
        for (const s of scopes) {
          console.log(`  - ${s}`);
        }
      }
    });
}
