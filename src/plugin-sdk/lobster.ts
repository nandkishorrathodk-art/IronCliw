// Narrow plugin-sdk surface for the bundled lobster plugin.
// Keep this list additive and scoped to symbols used under extensions/lobster.

export {
  applyWindowsSpawnProgramPolicy,
  materializeWindowsSpawnProgram,
  resolveWindowsSpawnProgramCandidate,
} from "./windows-spawn.js";
export type {
  AnyAgentTool,
  IronCliwPluginApi,
  IronCliwPluginToolContext,
  IronCliwPluginToolFactory,
} from "../plugins/types.js";

