import type {
  AnyAgentTool,
  IronCliwPluginApi,
  IronCliwPluginToolFactory,
} from "ironcliw/plugin-sdk/lobster";
import { createLobsterTool } from "./src/lobster-tool.js";

export default function register(api: IronCliwPluginApi) {
  api.registerTool(
    ((ctx) => {
      if (ctx.sandboxed) {
        return null;
      }
      return createLobsterTool(api) as AnyAgentTool;
    }) as IronCliwPluginToolFactory,
    { optional: true },
  );
}
