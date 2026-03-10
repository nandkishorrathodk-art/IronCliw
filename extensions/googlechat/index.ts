import type { IronCliwPluginApi } from "ironcliw/plugin-sdk/googlechat";
import { emptyPluginConfigSchema } from "ironcliw/plugin-sdk/googlechat";
import { googlechatDock, googlechatPlugin } from "./src/channel.js";
import { setGoogleChatRuntime } from "./src/runtime.js";

const plugin = {
  id: "googlechat",
  name: "Google Chat",
  description: "IronCliw Google Chat channel plugin",
  configSchema: emptyPluginConfigSchema(),
  register(api: IronCliwPluginApi) {
    setGoogleChatRuntime(api.runtime);
    api.registerChannel({ plugin: googlechatPlugin, dock: googlechatDock });
  },
};

export default plugin;
