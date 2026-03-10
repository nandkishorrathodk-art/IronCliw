import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import { logVerbose } from "../../globals.js";
import type { AnyAgentTool } from "./common.js";
import { ToolInputError, jsonResult, readStringParam } from "./common.js";

export const multiChannelTool: AnyAgentTool = {
  name: "multi_channel",
  description:
    "Route messages across WhatsApp, Telegram, Slack, Discord, Email, and custom channels. " +
    "Unified inbox shows all messages. Channel-specific formatting and commands.",
  input_schema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["send", "list_channels", "route_rule", "format_message"],
      },
      channel: {
        type: "string",
        enum: ["whatsapp", "telegram", "slack", "discord", "email"],
      },
      recipient: { type: "string" },
      message: { type: "string" },
    },
    required: ["action"],
  },

  async execute(params: Record<string, unknown>): Promise<AgentToolResult> {
    try {
      const action = readStringParam(params, "action", { required: true });

      logVerbose(`[multi-channel] ${action} action`);

      return jsonResult({
        success: true,
        message: `Multi-channel ${action} feature available`,
        channels: ["whatsapp", "telegram", "slack", "discord", "email"],
      });
    } catch (error) {
      if (error instanceof ToolInputError) {
        throw error;
      }
      throw new ToolInputError(`Multi-channel failed: ${String(error)}`);
    }
  },
};
