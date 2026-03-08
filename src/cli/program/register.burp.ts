import type { Command } from "commander";
import { burpPlugin } from "../../plugins/burpsuite/index.js";
import { scopeManager } from "../../security/scope-manager.js";

import { promptYesNo } from "../prompt.js";

export function registerBurpCommand(program: Command) {
  const burp = program.command("burp").description("Burp Suite Professional integration and automation");

  burp
    .command("init")
    .description("Initialize Burp Suite connection")
    .option("--url <url>", "Burp REST API base URL", "http://127.0.0.1:1337")
    .option("--key <key>", "Burp REST API key")
    .option("--fireworks-key <fkey>", "Fireworks API key for Vision Engine")
    .action(async (options) => {
      console.log(`Initializing Burp connection to ${options.url}...`);
      if (options.fireworksKey) {
        process.env.FIREWORKS_API_KEY = options.fireworksKey;
        console.log("Fireworks API key set for this session.");
      }
      await burpPlugin.init({ baseUrl: options.url, apiKey: options.key });
      const status = await burpPlugin.checkStatus();
      console.log(`Status: ${status.status}`);
    });

  burp
    .command("hunt")
    .description("Full visual security hunt with fireworks-kimi and human approval")
    .argument("[task]", "Hunting task", "Find potential IDOR in proxy history")
    .option("--model <model>", "Fireworks model ID", "accounts/fireworks/models/kimi-v1.5-vision-instruct")
    .action(async (task, options) => {
      console.log(`🚀 Starting Autonomous Visual Hunt [${task}]...`);
      const analysis = await burpPlugin.performVisualHunt(task, options.model);

      console.log("\n--- AI OBSERVATIONS ---");
      console.log(analysis.findings);
      console.log("\n--- AI SUGGESTION ---");
      console.log(analysis.suggestion);

      if (analysis.elements && analysis.elements.length > 0) {
        const proceed = await promptYesNo("Do you want IronCliw to execute the suggested visual action?");
        if (proceed) {
          // Find the best element to target based on suggestion
          const target = analysis.elements[0].label; // Simple heuristic for now
          console.log(`🎯 Executing action on ${target}...`);
          await burpPlugin.executeVisualTest({
            analysis,
            targetElement: target,
            action: "click"
          });
          console.log("✅ Action executed.");
        }
      }
    });

  burp
    .command("scope")
    .description("Manage authorized scopes for testing")
    .option("--add <domain>", "Add a domain to authorized scope")
    .option("--list", "List all authorized scopes")
    .action(async (options) => {
      await scopeManager.load();
      if (options.add) {
        console.log(`Adding ${options.add} to authorized scopes... (Note: manually edit authorized_scopes.json for now)`);
      }
      if (options.list) {
        console.log("Authorized Scopes:");
        scopeManager.getScopes().forEach(s => console.log(`- ${s}`));
      }
    });
}
