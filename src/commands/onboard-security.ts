import type { RuntimeEnv } from "../runtime.js";
import { theme } from "../terminal/theme.js";
import type { WizardPrompter } from "../wizard/prompts.js";

/**
 * Interactive wizard to set up security tools and scope.
 */
export async function setupSecurityTools(runtime: RuntimeEnv, prompter: WizardPrompter) {
  await prompter.intro(theme.cyber(" SECURITY PROTOCOL SETUP "));

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
      const { scopeManager } = await import("../security/scope-manager.js");
      const domains = scopeInput
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);
      for (const domain of domains) {
        await scopeManager.addScope(domain);
      }
      await scopeManager.saveScopes();
      runtime.log(theme.info(`  [SCOPE] Authorized: ${domains.join(", ")}`));
      runtime.log(theme.muted("  >> authorized_scopes.json updated."));
    }
  }

  await prompter.outro(theme.cyber(" PROTOCOLS CONFIGURED "));
}
