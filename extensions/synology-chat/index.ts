import type { IronCliwPluginApi } from "IronCliw/plugin-sdk/synology-chat";
import { emptyPluginConfigSchema } from "IronCliw/plugin-sdk/synology-chat";
import { createSynologyChatPlugin } from "./src/channel.js";
import { setSynologyRuntime } from "./src/runtime.js";

const plugin = {
  id: "synology-chat",
  name: "Synology Chat",
  description: "Native Synology Chat channel plugin for IronCliw",
  configSchema: emptyPluginConfigSchema(),
  register(api: IronCliwPluginApi) {
    setSynologyRuntime(api.runtime);
    api.registerChannel({ plugin: createSynologyChatPlugin() });
  },
};

export default plugin;

