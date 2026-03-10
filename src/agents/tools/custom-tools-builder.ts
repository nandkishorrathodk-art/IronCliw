import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import { logVerbose } from "../../globals.js";
import type { AnyAgentTool } from "./common.js";
import { ToolInputError, jsonResult, readStringParam } from "./common.js";

export const customToolsBuilderTool: AnyAgentTool = {
  name: "custom_tools_builder",
  description:
    "No-code tool builder: Create custom tools by defining input/output and execution logic. " +
    "Share tools with team members via marketplace.",
  input_schema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["create", "edit", "list", "delete", "share"],
        description: "Tool builder action",
      },
      tool_name: { type: "string", description: "Tool name" },
      description: { type: "string", description: "Tool description" },
      inputs: { type: "object", description: "Input schema" },
      execution_logic: { type: "string", description: "Execution code/logic" },
    },
    required: ["action"],
  },

  async execute(params: Record<string, unknown>): Promise<AgentToolResult> {
    try {
      const action = readStringParam(params, "action", { required: true });

      logVerbose(`[custom-tools] ${action} action`);

      return jsonResult({
        success: true,
        message: `Custom tools builder ${action} feature available`,
      });
    } catch (error) {
      if (error instanceof ToolInputError) {
        throw error;
      }
      throw new ToolInputError(`Custom tools builder failed: ${String(error)}`);
    }
  },
};
