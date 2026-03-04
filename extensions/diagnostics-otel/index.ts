import type { IroncliwPluginApi } from "Ironcliw/plugin-sdk";
import { emptyPluginConfigSchema } from "Ironcliw/plugin-sdk";
import { createDiagnosticsOtelService } from "./src/service.js";

const plugin = {
  id: "diagnostics-otel",
  name: "Diagnostics OpenTelemetry",
  description: "Export diagnostics events to OpenTelemetry",
  configSchema: emptyPluginConfigSchema(),
  register(api: IroncliwPluginApi) {
    api.registerService(createDiagnosticsOtelService());
  },
};

export default plugin;

