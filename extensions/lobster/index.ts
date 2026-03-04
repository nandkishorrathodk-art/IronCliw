import type {
  AnyAgentTool,
  IroncliwPluginApi,
  IroncliwPluginToolFactory,
} from "../../src/plugins/types.js";
import { createLobsterTool } from "./src/lobster-tool.js";

export default function register(api: IroncliwPluginApi) {
  api.registerTool(
    ((ctx) => {
      if (ctx.sandboxed) {
        return null;
      }
      return createLobsterTool(api) as AnyAgentTool;
    }) as IroncliwPluginToolFactory,
    { optional: true },
  );
}

