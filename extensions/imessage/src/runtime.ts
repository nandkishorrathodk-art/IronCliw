import { createPluginRuntimeStore } from "ironcliw/plugin-sdk";
import type { PluginRuntime } from "ironcliw/plugin-sdk/imessage";

const { setRuntime: setIMessageRuntime, getRuntime: getIMessageRuntime } =
  createPluginRuntimeStore<PluginRuntime>("iMessage runtime not initialized");
export { getIMessageRuntime, setIMessageRuntime };
