import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveIronCliwAgentDir } from "./agent-paths.js";
import {
  CUSTOM_PROXY_MODELS_CONFIG,
  installModelsConfigTestHooks,
  withModelsTempHome as withTempHome,
} from "./models-config.e2e-harness.js";
import { ensureIronCliwModelsJson } from "./models-config.js";

installModelsConfigTestHooks();

describe("models-config file mode", () => {
  it("writes models.json with mode 0600", async () => {
    if (process.platform === "win32") {
      return;
    }
    await withTempHome(async () => {
      await ensureIronCliwModelsJson(CUSTOM_PROXY_MODELS_CONFIG);
      const modelsPath = path.join(resolveIronCliwAgentDir(), "models.json");
      const stat = await fs.stat(modelsPath);
      expect(stat.mode & 0o777).toBe(0o600);
    });
  });

  it("repairs models.json mode to 0600 on no-content-change paths", async () => {
    if (process.platform === "win32") {
      return;
    }
    await withTempHome(async () => {
      await ensureIronCliwModelsJson(CUSTOM_PROXY_MODELS_CONFIG);
      const modelsPath = path.join(resolveIronCliwAgentDir(), "models.json");
      await fs.chmod(modelsPath, 0o644);

      const result = await ensureIronCliwModelsJson(CUSTOM_PROXY_MODELS_CONFIG);
      expect(result.wrote).toBe(false);

      const stat = await fs.stat(modelsPath);
      expect(stat.mode & 0o777).toBe(0o600);
    });
  });
});
