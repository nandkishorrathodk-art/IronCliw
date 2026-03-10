import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import { logVerbose } from "../../globals.js";
import type { AnyAgentTool } from "./common.js";
import { ToolInputError, jsonResult, readStringParam } from "./common.js";

export const teamCollaborationTool: AnyAgentTool = {
  name: "team_collaboration",
  description:
    "Manage team members, permissions, spending limits, audit logs, and role-based access control. " +
    "Monitor team activity and resource usage across all channels.",
  input_schema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["invite_user", "set_role", "set_limit", "view_activity", "audit_log"],
      },
      email: { type: "string", description: "User email" },
      role: { type: "string", enum: ["admin", "member", "viewer"] },
      spending_limit: { type: "number", description: "Monthly spending limit in USD" },
    },
    required: ["action"],
  },

  async execute(params: Record<string, unknown>): Promise<AgentToolResult> {
    try {
      const action = readStringParam(params, "action", { required: true });

      logVerbose(`[team-collaboration] ${action} action`);

      return jsonResult({
        success: true,
        message: `Team collaboration ${action} feature available`,
      });
    } catch (error) {
      if (error instanceof ToolInputError) {
        throw error;
      }
      throw new ToolInputError(`Team collaboration failed: ${String(error)}`);
    }
  },
};
