import croner from "croner";
import { spawn } from "node:child_process";

export interface ScheduledTask {
  id: string;
  cronExpression: string;
  command: string;
  timezone?: string;
  enabled: boolean;
}

export interface TaskRunRecord {
  runAt: number;
  durationMs: number;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  status: "success" | "failed" | "timeout";
}

export interface TaskStats {
  task: ScheduledTask;
  lastRun: TaskRunRecord | null;
  totalRuns: number;
  successRuns: number;
  failedRuns: number;
  history: TaskRunRecord[];
}

const MAX_HISTORY = 50;

export class CronScheduler {
  private jobs: Map<string, croner.Cron> = new Map();
  private configMap: Map<string, ScheduledTask> = new Map();
  private history: Map<string, TaskRunRecord[]> = new Map();
  private runCounts: Map<string, { total: number; success: number; failed: number }> = new Map();

  public scheduleTask(task: ScheduledTask): void {
    if (this.jobs.has(task.id)) {
      this.jobs.get(task.id)!.stop();
      this.jobs.delete(task.id);
    }

    this.configMap.set(task.id, { ...task });
    if (!this.history.has(task.id)) {
      this.history.set(task.id, []);
      this.runCounts.set(task.id, { total: 0, success: 0, failed: 0 });
    }

    if (!task.enabled) {
      console.log(`[Scheduler] Task '${task.id}' registered but disabled.`);
      return;
    }

    try {
      const job = new croner.Cron(task.cronExpression, { timezone: task.timezone }, () => {
        this._executeScheduledTask(task).catch((err: Error) => {
          console.error(`[Scheduler] Unhandled error in task '${task.id}':`, err);
        });
      });

      this.jobs.set(task.id, job);
      console.log(`[Scheduler] Scheduled task '${task.id}' at '${task.cronExpression}'`);
    } catch (err) {
      console.error(`[Scheduler] Failed to schedule task '${task.id}':`, err);
    }
  }

  /**
   * Enable a previously disabled task. Reschedules it immediately.
   * Returns false if the task is not found.
   */
  public enableTask(taskId: string): boolean {
    const task = this.configMap.get(taskId);
    if (!task) {return false;}
    task.enabled = true;
    this.scheduleTask(task);
    return true;
  }

  /**
   * Disable a running task without removing it from the registry.
   * Returns false if the task is not found.
   */
  public disableTask(taskId: string): boolean {
    const task = this.configMap.get(taskId);
    if (!task) {return false;}
    task.enabled = false;
    if (this.jobs.has(taskId)) {
      this.jobs.get(taskId)!.stop();
      this.jobs.delete(taskId);
      console.log(`[Scheduler] Disabled task '${taskId}'`);
    }
    return true;
  }

  /**
   * Get a registered task's config.
   */
  public getTask(taskId: string): ScheduledTask | undefined {
    const t = this.configMap.get(taskId);
    return t ? { ...t } : undefined;
  }

  /**
   * List all registered tasks (config snapshot).
   */
  public listTasks(): ScheduledTask[] {
    return [...this.configMap.values()].map((t) => ({ ...t }));
  }

  /**
   * Get full stats for a task: config, history, run counts.
   */
  public getStats(taskId: string): TaskStats | null {
    const task = this.configMap.get(taskId);
    if (!task) {return null;}
    const historyList = this.history.get(taskId) ?? [];
    const counts = this.runCounts.get(taskId) ?? { total: 0, success: 0, failed: 0 };
    return {
      task: { ...task },
      lastRun: historyList[historyList.length - 1] ?? null,
      totalRuns: counts.total,
      successRuns: counts.success,
      failedRuns: counts.failed,
      history: [...historyList],
    };
  }

  private async _executeScheduledTask(task: ScheduledTask): Promise<void> {
    console.log(`[Scheduler] Running '${task.id}': ${task.command}`);
    const t0 = Date.now();

    const record = await this._runCommand(task.command);
    const durationMs = Date.now() - t0;
    const run: TaskRunRecord = { runAt: t0, durationMs, ...record };

    const historyList = this.history.get(task.id) ?? [];
    historyList.push(run);
    if (historyList.length > MAX_HISTORY) {historyList.shift();}
    this.history.set(task.id, historyList);

    const counts = this.runCounts.get(task.id) ?? { total: 0, success: 0, failed: 0 };
    counts.total++;
    if (run.status === "success") {
      counts.success++;
    } else {
      counts.failed++;
    }
    this.runCounts.set(task.id, counts);

    if (run.status === "success") {
      console.log(`[Scheduler] Task '${task.id}' OK (${durationMs}ms)`);
    } else {
      console.error(
        `[Scheduler] Task '${task.id}' ${run.status} (exit ${run.exitCode}, ${durationMs}ms)`,
      );
    }
  }

  private _runCommand(
    command: string,
    timeoutMs = 60_000,
  ): Promise<Omit<TaskRunRecord, "runAt" | "durationMs">> {
    return new Promise((resolve) => {
      const isWindows = process.platform === "win32";
      const shell = isWindows ? "powershell.exe" : "sh";
      const shellArgs = isWindows ? ["-NoProfile", "-NonInteractive", "-Command", command] : ["-c", command];

      const child = spawn(shell, shellArgs, { stdio: "pipe" });

      let stdout = "";
      let stderr = "";
      let settled = false;

      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          child.kill();
          resolve({ exitCode: null, stdout, stderr, status: "timeout" });
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
          clearTimeout(timeout);
          resolve({
            exitCode: code,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            status: code === 0 ? "success" : "failed",
          });
        }
      });

      child.on("error", (err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          resolve({ exitCode: null, stdout, stderr: err.message, status: "failed" });
        }
      });
    });
  }

  public cancelTask(taskId: string): void {
    if (this.jobs.has(taskId)) {
      this.jobs.get(taskId)!.stop();
      this.jobs.delete(taskId);
    }
    this.configMap.delete(taskId);
    this.history.delete(taskId);
    this.runCounts.delete(taskId);
    console.log(`[Scheduler] Removed task '${taskId}'`);
  }

  public shutdown(): void {
    for (const job of this.jobs.values()) {
      job.stop();
    }
    this.jobs.clear();
  }
}
