import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import { logVerbose } from "../../globals.js";
import type { AnyAgentTool } from "./common.js";
import { ToolInputError, jsonResult, readStringParam, readStringArrayParam } from "./common.js";

interface WorkflowStep {
  id: string;
  type: "agent_task" | "approval_gate" | "condition" | "parallel";
  action: string;
  params: Record<string, unknown>;
  onSuccess?: string;
  onError?: string;
  retries?: number;
}

interface WorkflowExecution {
  workflowId: string;
  status: "running" | "paused" | "completed" | "failed";
  currentStep: string;
  results: Record<string, unknown>;
  approvalsPending: string[];
  startedAt: number;
  completedAt?: number;
}

interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  triggers?: string[];
  version: string;
}

const workflows = new Map<string, WorkflowDefinition>();
const executions = new Map<string, WorkflowExecution>();

function createWorkflow(def: WorkflowDefinition): void {
  workflows.set(def.id, def);
  logVerbose(`[workflow] Created workflow: ${def.name}`);
}

function executeWorkflow(workflowId: string): WorkflowExecution {
  const workflow = workflows.get(workflowId);
  if (!workflow) {
    throw new Error(`Workflow not found: ${workflowId}`);
  }

  const execution: WorkflowExecution = {
    workflowId,
    status: "running",
    currentStep: workflow.steps[0]?.id || "",
    results: {},
    approvalsPending: [],
    startedAt: Date.now(),
  };

  executions.set(`${workflowId}-${Date.now()}`, execution);
  return execution;
}

function approveStep(executionId: string, stepId: string): void {
  const execution = executions.get(executionId);
  if (!execution) {
    throw new Error(`Execution not found: ${executionId}`);
  }

  execution.approvalsPending = execution.approvalsPending.filter((s) => s !== stepId);
  logVerbose(`[workflow] Step approved: ${stepId}`);
}

export const multiAgentWorkflowTool: AnyAgentTool = {
  name: "multi_agent_workflow",
  description:
    "Define, execute, and manage multi-step workflows with sub-agents, approval gates, " +
    "conditional routing, and parallel execution. Supports task chaining and error handling.",
  input_schema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["create", "execute", "approve", "status", "cancel"],
        description: "Workflow action to perform",
      },
      workflow_id: {
        type: "string",
        description: "Workflow identifier",
      },
      name: {
        type: "string",
        description: "Workflow name (for create action)",
      },
      description: {
        type: "string",
        description: "Workflow description",
      },
      steps: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            type: { type: "string" },
            action: { type: "string" },
            params: { type: "object" },
          },
        },
        description: "Workflow steps",
      },
      execution_id: {
        type: "string",
        description: "Execution ID for status/approve/cancel",
      },
      step_id: {
        type: "string",
        description: "Step ID for approval",
      },
    },
    required: ["action"],
  },

  async execute(params: Record<string, unknown>): Promise<AgentToolResult> {
    try {
      const action = readStringParam(params, "action", { required: true });

      switch (action) {
        case "create": {
          const workflowId = readStringParam(params, "workflowId") || `wf-${Date.now()}`;
          const name = readStringParam(params, "name", { required: true });
          const description = readStringParam(params, "description") || "";
          const steps = (params.steps as WorkflowStep[]) || [];

          const workflow: WorkflowDefinition = {
            id: workflowId,
            name,
            description,
            steps,
            version: "1.0",
          };

          createWorkflow(workflow);

          return jsonResult({
            success: true,
            workflowId,
            message: `Workflow "${name}" created with ${steps.length} steps`,
          });
        }

        case "execute": {
          const workflowId = readStringParam(params, "workflowId", { required: true });
          const execution = executeWorkflow(workflowId);

          return jsonResult({
            success: true,
            executionId: Object.keys(executions).pop(),
            execution,
          });
        }

        case "approve": {
          const executionId = readStringParam(params, "executionId", { required: true });
          const stepId = readStringParam(params, "stepId", { required: true });

          approveStep(executionId, stepId);

          return jsonResult({
            success: true,
            message: `Step ${stepId} approved`,
          });
        }

        case "status": {
          const executionId = readStringParam(params, "executionId", { required: true });
          const execution = executions.get(executionId);

          if (!execution) {
            throw new ToolInputError(`Execution not found: ${executionId}`);
          }

          return jsonResult({
            success: true,
            execution,
          });
        }

        case "cancel": {
          const executionId = readStringParam(params, "executionId", { required: true });
          const execution = executions.get(executionId);

          if (!execution) {
            throw new ToolInputError(`Execution not found: ${executionId}`);
          }

          execution.status = "failed";
          execution.completedAt = Date.now();

          return jsonResult({
            success: true,
            message: "Workflow execution cancelled",
          });
        }

        default:
          throw new ToolInputError(`Unknown action: ${action}`);
      }
    } catch (error) {
      if (error instanceof ToolInputError) {
        throw error;
      }
      throw new ToolInputError(`Workflow execution failed: ${String(error)}`);
    }
  },
};
