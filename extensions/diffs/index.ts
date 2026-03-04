import path from "node:path";
import type { IronCliwPluginApi } from "IronCliw/plugin-sdk/diffs";
import { resolvePreferredIronCliwTmpDir } from "IronCliw/plugin-sdk/diffs";
import {
  diffsPluginConfigSchema,
  resolveDiffsPluginDefaults,
  resolveDiffsPluginSecurity,
} from "./src/config.js";
import { createDiffsHttpHandler } from "./src/http.js";
import { DiffArtifactStore } from "./src/store.js";
import { createDiffsTool } from "./src/tool.js";

const plugin = {
  id: "diffs",
  name: "Diffs",
  description: "Read-only diff viewer and PNG/PDF renderer for agents.",
  configSchema: diffsPluginConfigSchema,
  register(api: IronCliwPluginApi) {
    const defaults = resolveDiffsPluginDefaults(api.pluginConfig);
    const security = resolveDiffsPluginSecurity(api.pluginConfig);
    const store = new DiffArtifactStore({
      rootDir: path.join(resolvePreferredIronCliwTmpDir(), "IronCliw-diffs"),
      logger: api.logger,
    });

    api.registerTool(createDiffsTool({ api, store, defaults }));
    api.registerHttpRoute({
      path: "/plugins/diffs",
      auth: "plugin",
      match: "prefix",
      handler: createDiffsHttpHandler({
        store,
        logger: api.logger,
        allowRemoteViewer: security.allowRemoteViewer,
      }),
    });
  },
};

export default plugin;

