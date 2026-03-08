import { EventEmitter } from "node:events";

export type TaskStatus = "pending" | "running" | "completed" | "failed" | "skipped" | "cancelled";

export interface Task {
  id: string;
  execute: () => Promise<unknown>;
  dependencies?: string[];
  /** Per-task timeout in ms. If exceeded, task fails with a timeout error. */
  timeoutMs?: number;
  /** Max retry attempts on failure. Default 0 (no retry). */
  maxRetries?: number;
  /** Base backoff ms for retries (exponential). Default 500ms. */
  retryBaseMs?: number;
}

export class ParallelExecutor extends EventEmitter {
  private tasks: Map<string, Task> = new Map();
  private status: Map<string, TaskStatus> = new Map();
  private results: Map<string, unknown> = new Map();
  private errors: Map<string, Error> = new Map();
  private activeWorkers = 0;
  private readonly maxConcurrency: number;
  private cancelledIds: Set<string> = new Set();

  constructor(maxConcurrency = 16) {
    super();
    this.maxConcurrency = maxConcurrency;
  }

  /**
   * Reset executor to a clean state. Can be reused after reset.
   */
  public reset(): void {
    this.tasks.clear();
    this.status.clear();
    this.results.clear();
    this.errors.clear();
    this.cancelledIds.clear();
    this.activeWorkers = 0;
  }

  /**
   * Cancel a pending task before it starts. Has no effect if already running or done.
   */
  public cancelTask(id: string): boolean {
    const s = this.status.get(id);
    if (s !== "pending") {return false;}
    this.cancelledIds.add(id);
    this.status.set(id, "cancelled");
    this.errors.set(id, new Error(`Task "${id}" was cancelled`));
    this.emit("taskFinished", id);
    return true;
  }

  public getProgress(): {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    skipped: number;
    cancelled: number;
    activeWorkers: number;
  } {
    let pending = 0, running = 0, completed = 0, failed = 0, skipped = 0, cancelled = 0;
    for (const s of this.status.values()) {
      if (s === "pending") {pending++;}
      else if (s === "running") {running++;}
      else if (s === "completed") {completed++;}
      else if (s === "failed") {failed++;}
      else if (s === "skipped") {skipped++;}
      else if (s === "cancelled") {cancelled++;}
    }
    return {
      total: this.tasks.size,
      pending,
      running,
      completed,
      failed,
      skipped,
      cancelled,
      activeWorkers: this.activeWorkers,
    };
  }

  public addTask(task: Task) {
    this.tasks.set(task.id, task);
    this.status.set(task.id, "pending");
  }

  public addTasks(tasks: Task[]) {
    for (const task of tasks) {
      this.addTask(task);
    }
  }

  public async executeAll(): Promise<{ results: Record<string, unknown>, errors: Record<string, Error> }> {
    return new Promise((resolve) => {
      const checkCompletion = () => {
        const allDone = Array.from(this.status.values()).every(
          s => s === "completed" || s === "failed" || s === "skipped" || s === "cancelled"
        );
        
        if (allDone) {
          this.off("taskFinished", checkCompletion);
          resolve({
            results: Object.fromEntries(this.results),
            errors: Object.fromEntries(this.errors)
          });
        } else {
          this.scheduleNext();
        }
      };

      this.on("taskFinished", checkCompletion);
      this.scheduleNext();
    });
  }

  private scheduleNext() {
    if (this.activeWorkers >= this.maxConcurrency) {return;}

    for (const [id, task] of this.tasks.entries()) {
      if (this.status.get(id) === "pending" && this.canRun(task)) {
        void this.runTask(task);
        if (this.activeWorkers >= this.maxConcurrency) {break;}
      }
    }

    this.detectAndResolveStalemateOrCycle();
  }

  private detectAndResolveStalemateOrCycle() {
    if (this.activeWorkers > 0) {return;}

    const pendingIds = Array.from(this.status.entries())
      .filter(([, s]) => s === "pending")
      .map(([id]) => id);

    if (pendingIds.length === 0) {return;}

    for (const id of pendingIds) {
      this.status.set(id, "skipped");
      this.errors.set(id, new Error(`Task "${id}" skipped due to unresolvable dependency cycle or stalemate`));
      this.emit("taskFinished", id);
    }
  }

  private canRun(task: Task): boolean {
    if (!task.dependencies || task.dependencies.length === 0) {return true;}

    for (const depId of task.dependencies) {
      const depStatus = this.status.get(depId);
      if (depStatus === "failed" || depStatus === "cancelled" || depStatus === "skipped") {
        this.status.set(task.id, "skipped");
        this.errors.set(task.id, new Error(`Task "${task.id}" skipped — dependency "${depId}" did not complete (${depStatus})`));
        this.emit("taskFinished", task.id);
        return false;
      }
      if (depStatus !== "completed") {
        return false;
      }
    }
    return true;
  }

  private async runTask(task: Task) {
    this.activeWorkers++;
    this.status.set(task.id, "running");

    const maxRetries = task.maxRetries ?? 0;
    const retryBaseMs = task.retryBaseMs ?? 500;
    let attempt = 0;
    let lastErr: unknown;

    while (attempt <= maxRetries) {
      try {
        let executePromise = task.execute();
        if (task.timeoutMs != null && task.timeoutMs > 0) {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`Task "${task.id}" timed out after ${task.timeoutMs}ms`)),
              task.timeoutMs,
            ),
          );
          executePromise = Promise.race([executePromise, timeoutPromise]);
        }
        const result = await executePromise;
        this.results.set(task.id, result);
        this.status.set(task.id, "completed");
        this.activeWorkers--;
        this.emit("taskFinished", task.id);
        return;
      } catch (err: unknown) {
        lastErr = err;
        attempt++;
        if (attempt <= maxRetries) {
          const backoffMs = retryBaseMs * Math.pow(2, attempt - 1);
          this.emit("taskRetry", { id: task.id, attempt, backoffMs });
          await new Promise((r) => setTimeout(r, backoffMs));
        }
      }
    }

    this.errors.set(task.id, lastErr as Error);
    this.status.set(task.id, "failed");
    this.activeWorkers--;
    this.emit("taskFinished", task.id);
  }
}
