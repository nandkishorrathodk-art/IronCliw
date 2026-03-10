import os from "node:os";
import path from "node:path";
import type { PluginRuntime } from "ironcliw/plugin-sdk/msteams";

export const msteamsRuntimeStub = {
  state: {
    resolveStateDir: (env: NodeJS.ProcessEnv = process.env, homedir?: () => string) => {
      const override = env.IRONCLIW_STATE_DIR?.trim() || env.IRONCLIW_STATE_DIR?.trim();
      if (override) {
        return override;
      }
      const resolvedHome = homedir ? homedir() : os.homedir();
      return path.join(resolvedHome, ".ironcliw");
    },
  },
} as unknown as PluginRuntime;
