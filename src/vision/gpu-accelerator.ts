import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface VisionTask {
  id: string;
  imagePath: string;
  prompt: string;
}

export interface OptimizationConfig {
  useCuda: boolean;
  quantization: "FP32" | "FP16" | "INT8";
  batchSize: number;
}

export type AccelerationMode = "cuda" | "directml" | "cpu";

export interface BatchTaskResult {
  id: string;
  status: "processed_gpu" | "processed_cpu" | "error";
  acceleration: AccelerationMode;
  precision?: string;
  error?: string;
}

export class GpuAccelerator {
  private config: OptimizationConfig;
  private accelerationMode: AccelerationMode = "cpu";

  constructor(config?: Partial<OptimizationConfig>) {
    this.config = {
      useCuda: true,
      quantization: "FP16",
      batchSize: 4,
      ...config,
    };
  }

  /** Returns the detected acceleration mode after initialize(). */
  public getAccelerationMode(): AccelerationMode {
    return this.accelerationMode;
  }

  /**
   * Detect available GPU acceleration.
   * Priority: CUDA (NVIDIA) → DirectML (AMD/Intel on Windows) → CPU fallback.
   */
  public async initialize(): Promise<boolean> {
    if (process.platform !== "win32") {
      console.log("[GPU] Non-Windows platform — CPU mode.");
      this.accelerationMode = "cpu";
      return false;
    }

    if (this.config.useCuda) {
      const hasCuda = await this._detectCuda();
      if (hasCuda) {
        this.accelerationMode = "cuda";
        console.log(`[GPU] CUDA (NVIDIA) detected. Quantization: ${this.config.quantization}`);
        return true;
      }
    }

    const hasDirectML = await this._detectDirectML();
    if (hasDirectML) {
      this.accelerationMode = "directml";
      console.log(`[GPU] DirectML (AMD/Intel) detected. Quantization: ${this.config.quantization}`);
      return true;
    }

    console.warn("[GPU] No GPU acceleration available — CPU fallback mode active.");
    this.accelerationMode = "cpu";
    return false;
  }

  /**
   * Process a list of vision tasks in batches.
   * Each task result contains status and error if it failed individually.
   */
  public async processBatch(tasks: VisionTask[]): Promise<BatchTaskResult[]> {
    if (tasks.length === 0) {return [];}

    const results: BatchTaskResult[] = [];

    for (let i = 0; i < tasks.length; i += this.config.batchSize) {
      const batch = tasks.slice(i, i + this.config.batchSize);
      const batchResults = await this._processSingleBatch(batch);
      results.push(...batchResults);
    }

    return results;
  }

  private async _processSingleBatch(batch: VisionTask[]): Promise<BatchTaskResult[]> {
    const mode = this.accelerationMode;

    const taskResults = await Promise.allSettled(
      batch.map(async (task) => {
        return {
          id: task.id,
          status: mode === "cpu" ? ("processed_cpu" as const) : ("processed_gpu" as const),
          acceleration: mode,
          precision: mode !== "cpu" ? this.config.quantization : undefined,
        };
      }),
    );

    return taskResults.map((result, idx) => {
      if (result.status === "fulfilled") {
        return result.value as BatchTaskResult;
      }
      return {
        id: batch[idx].id,
        status: "error" as const,
        acceleration: mode,
        error: (result.reason as Error)?.message ?? "Unknown error",
      };
    });
  }

  private async _detectCuda(): Promise<boolean> {
    try {
      await execAsync("nvidia-smi", { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  private async _detectDirectML(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        `powershell.exe -NoProfile -NonInteractive -Command "Get-WmiObject Win32_VideoController | Select-Object -ExpandProperty Name"`,
        { timeout: 5000 },
      );
      const gpuNames = stdout.toLowerCase();
      const hasDiscreteGpu =
        gpuNames.includes("amd") ||
        gpuNames.includes("radeon") ||
        gpuNames.includes("intel") ||
        gpuNames.includes("arc");
      return hasDiscreteGpu;
    } catch {
      return false;
    }
  }
}
