import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import yaml from "yaml";

export interface BatchStep {
  name: string;
  command: string;
  ignoreError?: boolean;
  /** Timeout for this step in ms. Default: 120 000 (2 min). */
  timeoutMs?: number;
}

export interface BatchExecutionPlan {
  name: string;
  description: string;
  steps: BatchStep[];
}

export interface StepResult {
  name: string;
  success: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  skipped?: boolean;
}

export class BatchEngine {
  public async loadPlan(filePath: string): Promise<BatchExecutionPlan> {
    const content = await fs.readFile(filePath, "utf-8");
    if (filePath.endsWith(".json")) {
      return JSON.parse(content) as BatchExecutionPlan;
    } else if (filePath.endsWith(".yml") || filePath.endsWith(".yaml")) {
      return yaml.parse(content) as BatchExecutionPlan;
    }
    throw new Error("Unsupported format. Use JSON or YAML.");
  }

  /**
   * Execute all steps in order.
   * Returns a per-step result array and an overall success boolean.
   */
  public async executePlan(
    plan: BatchExecutionPlan,
  ): Promise<{ success: boolean; steps: StepResult[] }> {
    console.log(`[BatchEngine] Starting: ${plan.name}`);
    console.log(`[BatchEngine] ${plan.description}`);

    const stepResults: StepResult[] = [];
    let overallSuccess = true;

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      console.log(`[BatchEngine] Step ${i + 1}/${plan.steps.length}: ${step.name}`);

      const result = await this._runCommand(step.command, step.timeoutMs ?? 120_000);
      const stepResult: StepResult = { name: step.name, ...result };
      stepResults.push(stepResult);

      if (!stepResult.success) {
        console.error(
          `[BatchEngine] Step '${step.name}' failed (exit ${stepResult.exitCode}): ${stepResult.stderr || "(no stderr)"}`,
        );
        if (!step.ignoreError) {
          console.error("[BatchEngine] Aborting sequence — strict error policy.");
          overallSuccess = false;

          for (let j = i + 1; j < plan.steps.length; j++) {
            stepResults.push({
              name: plan.steps[j].name,
              success: false,
              exitCode: null,
              stdout: "",
              stderr: "",
              durationMs: 0,
              skipped: true,
            });
          }
          break;
        }
        console.log("[BatchEngine] ignoreError=true — continuing.");
      } else {
        console.log(`[BatchEngine] Step '${step.name}' OK (${result.durationMs}ms)`);
      }
    }

    if (overallSuccess) {
      console.log("[BatchEngine] Plan completed successfully.");
    }

    return { success: overallSuccess, steps: stepResults };
  }

  private _runCommand(
    command: string,
    timeoutMs: number,
  ): Promise<Omit<StepResult, "name" | "skipped">> {
    return new Promise((resolve) => {
      const t0 = Date.now();
      const isWindows = process.platform === "win32";
      const shell = isWindows ? "powershell.exe" : "sh";
      const shellArgs = isWindows
        ? ["-NoProfile", "-NonInteractive", "-Command", command]
        : ["-c", command];

      const child = spawn(shell, shellArgs, { stdio: "pipe" });

      let stdout = "";
      let stderr = "";
      let settled = false;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          child.kill();
          resolve({
            success: false,
            exitCode: null,
            stdout: stdout.trim(),
            stderr: `Timed out after ${timeoutMs}ms`,
            durationMs: Date.now() - t0,
          });
        }
      }, timeoutMs);

      child.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      child.on("close", (code) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve({
            success: code === 0,
            exitCode: code,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            durationMs: Date.now() - t0,
          });
        }
      });

      child.on("error", (err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve({
            success: false,
            exitCode: null,
            stdout: stdout.trim(),
            stderr: err.message,
            durationMs: Date.now() - t0,
          });
        }
      });
    });
  }
}
