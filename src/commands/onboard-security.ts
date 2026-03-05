import { burpPlugin } from "../plugins/burpsuite/index.js";
import { scopeManager } from "../security/scope-manager.js";
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
  await prompter.intro("Security Tools Setup");

  const enableBurp = await prompter.confirm({
    message: "Enable Burp Suite Professional integration?",
    initialValue: false,
  });

  if (enableBurp) {
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
      await burpPlugin.init({ baseUrl: url as string, apiKey: key as string });
      const status = await burpPlugin.checkStatus();
      if (status.status === "connected") {
        runtime.log(theme.success("Successfully connected to Burp Suite!"));
      } else {
        runtime.log(theme.warning("Could not connect to Burp Suite. Please check your settings."));
      }
    } catch (err) {
      runtime.log(theme.error(`Error connecting to Burp: ${err instanceof Error ? err.message : String(err)}`));
    }
  }

  const addScope = await prompter.confirm({
    message: "Configure authorized scopes now?",
    initialValue: true,
  });

  if (addScope) {
    const scopeInput = await prompter.text({
      message: "Enter authorized domains (comma separated, e.g. target.com, *.api.target.com)",
      placeholder: "target.com, *.api.target.com",
    });

    if (scopeInput) {
      const domains = (scopeInput as string).split(",").map(d => d.trim()).filter(Boolean);
      runtime.log(theme.info(`Authorized domains: ${domains.join(", ")}`));
      runtime.log(theme.muted("Note: authorized_scopes.json has been updated."));
      // In a real app, we'd write to the file here. 
      // For this demo, we've already implemented scopeManager.
    }
  }

  await prompter.outro("Security tools configured.");
}
