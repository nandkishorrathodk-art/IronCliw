import type { Command } from "commander";
import { desktopPlugin } from "../../plugins/desktop-automation/index.js";

export function registerDesktopCommand(program: Command) {
  const desktop = program.command("desktop").description("Desktop automation and vision control");

  desktop
    .command("capture")
    .description("Capture a screenshot of the desktop")
    .argument("[task]", "Reason for capture", "General observation")
    .action(async (task) => {
      console.log(`\n🦾 IronCliw: Capturing vision for [${task}]...`);
      try {
        await desktopPlugin.init();
        const result = await desktopPlugin.analyzeDesktop(task);
        console.log(`✅ Screenshot saved to: ${result.screenshotPath}`);
      } catch (err: unknown) {
        console.error(`❌ Vision failed: ${(err as Error).message}`);
      }
    });

  desktop
    .command("targets")
    .description("List all active windows on the host")
    .action(async () => {
      try {
        await desktopPlugin.init();
        const targets = await desktopPlugin.listAvailableTargets();
        console.log("\n--- ACTIVE WINDOWS ---");
        targets.forEach((t) => {
          const auth = t.isAuthorized ? "✅ [AUTH]" : "❌ [UNAUTH]";
          console.log(`${auth} ${t.processName} | Title: ${t.title}`);
        });
      } catch (err: unknown) {
        console.error(`❌ Failed to list targets: ${(err as Error).message}`);
      }
    });

  const clipboard = desktop.command("clipboard").description("Manage host clipboard");

  clipboard
    .command("get")
    .description("Get text from clipboard")
    .action(async () => {
      try {
        const text = await desktopPlugin.getClipboard();
        console.log(`\n📋 Clipboard Content:\n${text}`);
      } catch (err: unknown) {
        console.error(`❌ Failed to get clipboard: ${(err as Error).message}`);
      }
    });

  clipboard
    .command("set")
    .description("Set text to clipboard")
    .argument("<text>", "Text to set")
    .action(async (text) => {
      try {
        await desktopPlugin.setClipboard(text);
        console.log("✅ Clipboard updated.");
      } catch (err: unknown) {
        console.error(`❌ Failed to set clipboard: ${(err as Error).message}`);
      }
    });

  desktop
    .command("processes")
    .description("List running processes")
    .action(async () => {
      try {
        const processes = await desktopPlugin.getProcesses();
        console.log("\n--- TOP PROCESSES (by Memory) ---");
        processes
          .toSorted((a, b) => b.memory - a.memory)
          .slice(0, 20)
          .forEach((p) => {
            console.log(`[${p.pid}] ${p.name.padEnd(25)} | Mem: ${p.memory}MB`);
          });
      } catch (err: unknown) {
        console.error(`❌ Failed to list processes: ${(err as Error).message}`);
      }
    });
}
