import type { IronCliwConfig } from "../config/config.js";
import { loadIronCliwPlugins } from "../plugins/loader.js";
import { resolveUserPath } from "../utils.js";

export function ensureRuntimePluginsLoaded(params: {
  config?: IronCliwConfig;
  workspaceDir?: string | null;
}): void {
  const workspaceDir =
    typeof params.workspaceDir === "string" && params.workspaceDir.trim()
      ? resolveUserPath(params.workspaceDir)
      : undefined;

  loadIronCliwPlugins({
    config: params.config,
    workspaceDir,
  });
}
