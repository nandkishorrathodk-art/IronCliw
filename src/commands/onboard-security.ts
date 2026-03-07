import { burpPlugin } from "../plugins/burpsuite/index.js";
import type { WizardPrompter } from "../wizard/prompts.js";
import type { RuntimeEnv } from "../runtime.js";
import { theme } from "../terminal/theme.js";

/**
 * Interactive wizard to set up security tools like Burp Suite.
 */
export async function setupSecurityTools(
  runtime: RuntimeEnv,
  prompter: WizardPrompter,
) {
  await prompter.intro(theme.cyber(" SECURITY PROTOCOL SETUP "));

  const enableBurp = await prompter.confirm({
    message: "Enable Burp Suite Professional integration?",
    initialValue: false,
  });

  if (enableBurp) {
    runtime.log(theme.muted("  >> Establishing secure bridge to Burp Suite..."));
    const url = await prompter.text({
      message: "Burp REST API URL",
      initialValue: "http://127.0.0.1:1337",
    });

    const key = await prompter.password({
      message: "Burp REST API Key",
    });

    const fireworksKey = await prompter.password({
      message: "Fireworks API Key (for Vision Engine / Kimi 2.x)",
      hint: "Required for 'burp hunt' visual analysis",
    });

    if (fireworksKey) {
      process.env.FIREWORKS_API_KEY = fireworksKey;
    }

    try {
      const p = prompter.progress("Testing link...");
      await burpPlugin.init({ baseUrl: url, apiKey: key });
      const status = await burpPlugin.checkStatus();
      p.stop(status.status === "connected" ? "Link Established" : "Link Failed");
      
      if (status.status === "connected") {
        runtime.log(theme.success("  [OK] Burp Suite Professional detected."));
      } else {
        runtime.log(theme.warn("  [!] Burp Suite not responding. Verify API settings."));
      }
    } catch (err) {
      runtime.log(theme.error(`  [ERROR] Bridge failure: ${err instanceof Error ? err.message : String(err)}`));
    }
  }

  const addScope = await prompter.confirm({
    message: "Define authorized operation scope?",
    initialValue: true,
  });

  if (addScope) {
    const scopeInput = await prompter.text({
      message: "Targets (comma separated, e.g. target.com, *.api.target.com)",
      placeholder: "target.com, *.api.target.com",
    });

    if (scopeInput) {
      const domains = (scopeInput).split(",").map(d => d.trim()).filter(Boolean);
      runtime.log(theme.info(`  [SCOPE] Authorized: ${domains.join(", ")}`));
      runtime.log(theme.muted("  >> authorized_scopes.json updated."));
    }
  }

  await prompter.outro(theme.cyber(" PROTOCOLS CONFIGURED "));
}
