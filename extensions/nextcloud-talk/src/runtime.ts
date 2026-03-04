import type { PluginRuntime } from "Ironcliw/plugin-sdk";

let runtime: PluginRuntime | null = null;

export function setNextcloudTalkRuntime(next: PluginRuntime) {
  runtime = next;
}

export function getNextcloudTalkRuntime(): PluginRuntime {
  if (!runtime) {
    throw new Error("Nextcloud Talk runtime not initialized");
  }
  return runtime;
}

