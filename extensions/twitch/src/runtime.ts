import { createPluginRuntimeStore } from "ironcliw/plugin-sdk";
import type { PluginRuntime } from "ironcliw/plugin-sdk/twitch";

const { setRuntime: setTwitchRuntime, getRuntime: getTwitchRuntime } =
  createPluginRuntimeStore<PluginRuntime>("Twitch runtime not initialized");
export { getTwitchRuntime, setTwitchRuntime };
