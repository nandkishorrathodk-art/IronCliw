// Narrow plugin-sdk surface for the bundled diffs plugin.
// Keep this list additive and scoped to symbols used under extensions/diffs.

export type { IronCliwConfig } from "../config/config.js";
export { resolvePreferredIronCliwTmpDir } from "../infra/tmp-ironcliw-dir.js";
export type {
  AnyAgentTool,
  IronCliwPluginApi,
  IronCliwPluginConfigSchema,
  PluginLogger,
} from "../plugins/types.js";
