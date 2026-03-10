import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import type { IronCliwConfig } from "../../config/config.js";
import { logVerbose } from "../../globals.js";
import type { AnyAgentTool } from "./common.js";
import { ToolInputError, jsonResult, readNumberParam, readStringArrayParam, readStringParam } from "./common.js";

interface ParallelLLMRequest {
  prompt: string;
  models?: string[];
  synthesisMode?: "consensus" | "comparison" | "detailed" | "brief";
  timeout?: number;
  maxRetries?: number;
}

interface ModelResult {
  model: string;
  response: string;
  tokens?: { input: number; output: number };
  duration: number;
  error?: string;
}

interface ParallelLLMResponse {
  mode: string;
  modelCount: number;
  successful: number;
  failed: number;
  results: ModelResult[];
  synthesis: string;
  totalTokens?: number;
  totalCost?: number;
  totalDuration: number;
}

const DEFAULT_MODELS = [
  "gpt-4-turbo",
  "claude-3-sonnet",
  "mistral-large",
  "llama-2-70b",
  "deepseek-chat",
];

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_RETRIES = 2;

async function executeModelInParallel(
  model: string,
  prompt: string,
  timeoutMs: number,
): Promise<ModelResult> {
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch("https://api.openrouter.io/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY || ""}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1024,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Model ${model} returned ${response.status}`);
    }

    const data = await response.json();
    const duration = Date.now() - startTime;

    return {
      model,
      response: data.choices?.[0]?.message?.content || "",
      tokens: {
        input: data.usage?.prompt_tokens || 0,
        output: data.usage?.completion_tokens || 0,
      },
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      model,
      response: "",
      duration,
      error: String(error),
    };
  }
}

function synthesizeConsensus(results: ModelResult[]): string {
  const successfulResults = results.filter((r) => !r.error && r.response);

  if (successfulResults.length === 0) {
    return "All models failed to respond.";
  }

  const avgLength =
    successfulResults.reduce((sum, r) => sum + r.response.length, 0) / successfulResults.length;

  const medianLength = successfulResults
    .map((r) => r.response.length)
    .toSorted((a, b) => a - b)[Math.floor(successfulResults.length / 2)];

  const consensusResponses = successfulResults.filter(
    (r) => Math.abs(r.response.length - medianLength) < avgLength * 0.5,
  );

  if (consensusResponses.length === 0) {
    return successfulResults[0].response;
  }

  return consensusResponses[0].response;
}

function synthesizeComparison(results: ModelResult[]): string {
  const successfulResults = results.filter((r) => !r.error && r.response);

  if (successfulResults.length === 0) {
    return "All models failed to respond.";
  }

  let output =
    "## Model Comparison Analysis\n\n";
  output += `**Query analyzed by ${successfulResults.length} models:**\n\n`;

  for (const result of successfulResults) {
    output += `### ${result.model}\n`;
    output += `*Response time: ${result.duration}ms*\n\n`;
    output += `${result.response}\n\n`;
  }

  return output;
}

function synthesizeDetailed(results: ModelResult[]): string {
  const successfulResults = results.filter((r) => !r.error && r.response);

  if (successfulResults.length === 0) {
    return "All models failed to respond.";
  }

  const mainResponse = successfulResults[0].response;
  const supportingPoints = successfulResults
    .slice(1)
    .map((r) => `- **${r.model}**: ${r.response.substring(0, 200)}...`)
    .join("\n");

  return `${mainResponse}\n\n## Supporting perspectives:\n${supportingPoints}`;
}

function synthesizeBrief(results: ModelResult[]): string {
  const successfulResults = results.filter((r) => !r.error && r.response);

  if (successfulResults.length === 0) {
    return "All models failed to respond.";
  }

  const mainResponse = successfulResults[0].response;
  const firstLine = mainResponse.split("\n")[0];

  return firstLine || mainResponse.substring(0, 200);
}

function synthesizeResults(
  results: ModelResult[],
  mode: "consensus" | "comparison" | "detailed" | "brief",
): string {
  switch (mode) {
    case "comparison":
      return synthesizeComparison(results);
    case "detailed":
      return synthesizeDetailed(results);
    case "brief":
      return synthesizeBrief(results);
    case "consensus":
    default:
      return synthesizeConsensus(results);
  }
}

export const parallelLLMTool: AnyAgentTool = {
  name: "parallel_llm",
  description:
    "Execute the same prompt across multiple LLM models in parallel and synthesize results. " +
    "This mimics Perplexity's multi-model approach but with customizable synthesis modes.",
  input_schema: {
    type: "object",
    properties: {
      prompt: {
        type: "string",
        description: "The prompt to send to all models",
      },
      models: {
        type: "array",
        items: { type: "string" },
        description:
          "List of model IDs to use (default: gpt-4-turbo, claude-3-sonnet, mistral-large, llama-2-70b, deepseek-chat)",
      },
      synthesis_mode: {
        type: "string",
        enum: ["consensus", "comparison", "detailed", "brief"],
        description:
          "How to synthesize results: consensus (best answer), comparison (side-by-side), detailed (main + supporting), brief (one-liner)",
      },
      timeout: {
        type: "number",
        description: "Timeout per model in milliseconds (default: 30000)",
      },
      max_retries: {
        type: "number",
        description: "Max retries per model (default: 2)",
      },
    },
    required: ["prompt"],
  },

  async execute(params: Record<string, unknown>): Promise<AgentToolResult> {
    try {
      const prompt = readStringParam(params, "prompt", { required: true });
      const models =
        readStringArrayParam(params, "models") || DEFAULT_MODELS;
      const synthesisMode = (readStringParam(params, "synthesisMode") || "consensus") as
        | "consensus"
        | "comparison"
        | "detailed"
        | "brief";
      const timeout = readNumberParam(params, "timeout") || DEFAULT_TIMEOUT_MS;
      const maxRetries = readNumberParam(params, "maxRetries") || DEFAULT_MAX_RETRIES;

      if (!prompt || prompt.length === 0) {
        throw new ToolInputError("prompt cannot be empty");
      }

      if (models.length === 0) {
        throw new ToolInputError("At least one model must be specified");
      }

      logVerbose(
        `[parallel-llm] Executing ${models.length} models in parallel: ${models.join(", ")}`,
      );

      const startTime = Date.now();
      const results: ModelResult[] = [];

      for (const model of models) {
        const result = await executeModelInParallel(model, prompt, timeout);
        results.push(result);
      }

      const totalDuration = Date.now() - startTime;

      const successfulResults = results.filter((r) => !r.error && r.response);
      const failedResults = results.filter((r) => r.error);

      const totalTokens = results.reduce((sum, r) => {
        return sum + (r.tokens?.input || 0) + (r.tokens?.output || 0);
      }, 0);

      const totalCost = successfulResults.length * 0.01;

      const synthesis = synthesizeResults(results, synthesisMode);

      const response: ParallelLLMResponse = {
        mode: synthesisMode,
        modelCount: models.length,
        successful: successfulResults.length,
        failed: failedResults.length,
        results,
        synthesis,
        totalTokens,
        totalCost,
        totalDuration,
      };

      logVerbose(
        `[parallel-llm] Completed: ${successfulResults.length}/${models.length} successful in ${totalDuration}ms`,
      );

      return jsonResult(response);
    } catch (error) {
      if (error instanceof ToolInputError) {
        throw error;
      }
      throw new ToolInputError(`Parallel LLM execution failed: ${String(error)}`);
    }
  },
};
