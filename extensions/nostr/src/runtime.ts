import { createPluginRuntimeStore } from "ironcliw/plugin-sdk";
import type { PluginRuntime } from "ironcliw/plugin-sdk/nostr";

const { setRuntime: setNostrRuntime, getRuntime: getNostrRuntime } =
  createPluginRuntimeStore<PluginRuntime>("Nostr runtime not initialized");
export { getNostrRuntime, setNostrRuntime };
