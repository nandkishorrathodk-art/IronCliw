import os from "node:os";
import path from "node:path";
import type { PluginRuntime } from "IronCliw/plugin-sdk/msteams";

export const msteamsRuntimeStub = {
  state: {
    resolveStateDir: (env: NodeJS.ProcessEnv = process.env, homedir?: () => string) => {
      const override = env.IronCliw_STATE_DIR?.trim() || env.IronCliw_STATE_DIR?.trim();
      if (override) {
        return override;
      }
      const resolvedHome = homedir ? homedir() : os.homedir();
      return path.join(resolvedHome, ".IronCliw");
    },
  },
} as unknown as PluginRuntime;

