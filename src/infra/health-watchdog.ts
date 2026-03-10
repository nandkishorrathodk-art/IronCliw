/**
 * IronCliw Health Watchdog
 *
 * Real-time system health monitor that:
 *   - Tracks CPU, RAM, and disk usage every 30 seconds
 *   - Fires alerts if resources are critically high
 *   - Exposes stats for the /health/system gateway endpoint
 *   - Auto-logs warnings to the IronCliw logger
 *
 * Usage:
 *   const watchdog = new HealthWatchdog();
 *   watchdog.start();                          // begin monitoring
 *   const stats = watchdog.currentStats();     // get snapshot
 *   watchdog.stop();                           // graceful shutdown
 */

import { execSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { freemem, totalmem, cpus, platform, hostname, uptime } from "node:os";
import { join } from "node:path";

/* ─────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────── */

export interface SystemStats {
  timestamp: number;
  cpu: {
    usagePercent: number;
    cores: number;
    model: string;
  };
  memory: {
    usedMb: number;
    totalMb: number;
    usagePercent: number;
    freeMb: number;
  };
  heap: {
    usedMb: number;
    totalMb: number;
    externalMb: number;
    usagePercent: number;
  };
  disk: {
    usedGb: number;
    totalGb: number;
    freeGb: number;
    usagePercent: number;
  };
  system: {
    platform: string;
    hostname: string;
    uptimeSeconds: number;
    nodeVersion: string;
    ironcliwVersion: string;
  };
  status: "healthy" | "warning" | "critical";
  warnings: string[];
}

export interface WatchdogOptions {
  /** How often to sample in ms. Default: 30 000 (30 seconds) */
  intervalMs?: number;
  /** Alert threshold for CPU %. Default: 90 */
  cpuAlertThreshold?: number;
  /** Alert threshold for RAM %. Default: 85 */
  memAlertThreshold?: number;
  /** Alert threshold for disk %. Default: 90 */
  diskAlertThreshold?: number;
  /** Print warnings to console. Default: true */
  consoleAlerts?: boolean;
}

/* ─────────────────────────────────────────────────────────────
   CPU usage calculation (compare two OS samples)
   ───────────────────────────────────────────────────────────── */

function getCpuTimes() {
  const coreList = cpus();
  return coreList.reduce(
    (acc, core) => {
      acc.idle += core.times.idle;
      acc.total +=
        core.times.user + core.times.nice + core.times.sys + core.times.idle + core.times.irq;
      return acc;
    },
    { idle: 0, total: 0 },
  );
}

async function measureCpuUsage(sampleMs = 200): Promise<number> {
  const before = getCpuTimes();
  await new Promise((r) => setTimeout(r, sampleMs));
  const after = getCpuTimes();

  const idleDelta = after.idle - before.idle;
  const totalDelta = after.total - before.total;

  if (totalDelta === 0) {
    return 0;
  }
  return Math.round(((totalDelta - idleDelta) / totalDelta) * 100);
}

/* ─────────────────────────────────────────────────────────────
   Disk usage (Windows via WMIC or cross-platform df)
   ───────────────────────────────────────────────────────────── */

interface DiskInfo {
  totalGb: number;
  freeGb: number;
  usedGb: number;
  usagePercent: number;
}

function getDiskInfo(): DiskInfo {
  try {
    if (platform() === "win32") {
      const output = execSync(
        "wmic logicaldisk where \"DeviceID='C:'\" get Size,FreeSpace /format:value",
        { timeout: 5000, stdio: "pipe" },
      ).toString();

      const freeMatch = output.match(/FreeSpace=(\d+)/);
      const sizeMatch = output.match(/Size=(\d+)/);

      const freeBytes = freeMatch ? Number(freeMatch[1]) : 0;
      const totalBytes = sizeMatch ? Number(sizeMatch[1]) : 1;

      const totalGb = totalBytes / 1e9;
      const freeGb = freeBytes / 1e9;
      const usedGb = totalGb - freeGb;

      return {
        totalGb: Math.round(totalGb * 10) / 10,
        freeGb: Math.round(freeGb * 10) / 10,
        usedGb: Math.round(usedGb * 10) / 10,
        usagePercent: Math.round((usedGb / totalGb) * 100),
      };
    } else {
      const output = execSync("df -k /", { timeout: 5000, stdio: "pipe" }).toString();
      const lines = output.trim().split("\n");
      const parts = lines[1]?.split(/\s+/) ?? [];
      const totalKb = Number(parts[1] ?? 0);
      const usedKb = Number(parts[2] ?? 0);
      const freeKb = Number(parts[3] ?? 0);

      return {
        totalGb: Math.round((totalKb / 1e6) * 10) / 10,
        usedGb: Math.round((usedKb / 1e6) * 10) / 10,
        freeGb: Math.round((freeKb / 1e6) * 10) / 10,
        usagePercent: Math.round((usedKb / totalKb) * 100),
      };
    }
  } catch {
    return { totalGb: 0, freeGb: 0, usedGb: 0, usagePercent: 0 };
  }
}

/* ─────────────────────────────────────────────────────────────
   IronCliw version reader
   ───────────────────────────────────────────────────────────── */

function readIronCliwVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf-8")) as {
      version?: string;
    };
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

const IRONCLIW_VERSION = readIronCliwVersion();

/* ─────────────────────────────────────────────────────────────
   HealthWatchdog class
   ───────────────────────────────────────────────────────────── */

export class HealthWatchdog extends EventEmitter {
  private readonly opts: Required<WatchdogOptions>;
  private timer: ReturnType<typeof setInterval> | null = null;
  private _latest: SystemStats | null = null;
  private _running = false;
  private readonly _history: SystemStats[] = [];
  private static readonly HISTORY_SIZE = 10;

  constructor(opts: WatchdogOptions = {}) {
    super();
    this.opts = {
      intervalMs: opts.intervalMs ?? 30_000,
      cpuAlertThreshold: opts.cpuAlertThreshold ?? 90,
      memAlertThreshold: opts.memAlertThreshold ?? 85,
      diskAlertThreshold: opts.diskAlertThreshold ?? 90,
      consoleAlerts: opts.consoleAlerts ?? true,
    };
  }

  /** Start monitoring. Safe to call multiple times. */
  start(): void {
    if (this._running) {
      return;
    }
    this._running = true;

    // Immediate first sample
    void this.sample();

    this.timer = setInterval(() => {
      void this.sample();
    }, this.opts.intervalMs);

    // Don't block process exit
    this.timer.unref();
  }

  /** Stop monitoring. */
  stop(): void {
    this._running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Get the most recent stats snapshot. Returns null if not started yet. */
  currentStats(): SystemStats | null {
    return this._latest;
  }

  /** Get last N stats samples (up to HISTORY_SIZE). */
  history(): SystemStats[] {
    return [...this._history];
  }

  /** Average CPU usage over the last N samples (default: all history). */
  avgCpu(samples?: number): number {
    const slice = samples ? this._history.slice(-samples) : this._history;
    if (slice.length === 0) {
      return 0;
    }
    return Math.round(slice.reduce((s, h) => s + h.cpu.usagePercent, 0) / slice.length);
  }

  /** Peak CPU usage across history. */
  peakCpu(): number {
    return this._history.reduce((max, h) => Math.max(max, h.cpu.usagePercent), 0);
  }

  /** Force an immediate stats collection and return result. */
  async snapshot(): Promise<SystemStats> {
    return this.sample();
  }

  private async sample(): Promise<SystemStats> {
    const cpuUsage = await measureCpuUsage(250);
    const totalMem = totalmem();
    const freeMem = freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = Math.round((usedMem / totalMem) * 100);
    const disk = getDiskInfo();
    const coreList = cpus();
    const heapRaw = process.memoryUsage();
    const heapUsedMb = Math.round(heapRaw.heapUsed / 1_048_576);
    const heapTotalMb = Math.round(heapRaw.heapTotal / 1_048_576);
    const externalMb = Math.round(heapRaw.external / 1_048_576);
    const warnings: string[] = [];

    // Determine alert thresholds
    if (cpuUsage >= this.opts.cpuAlertThreshold) {
      warnings.push(`🔴 CPU usage critical: ${cpuUsage}%`);
    } else if (cpuUsage >= this.opts.cpuAlertThreshold - 15) {
      warnings.push(`🟡 CPU usage high: ${cpuUsage}%`);
    }

    if (memPercent >= this.opts.memAlertThreshold) {
      warnings.push(`🔴 Memory usage high: ${memPercent}%`);
    }

    if (disk.usagePercent >= this.opts.diskAlertThreshold) {
      warnings.push(`🔴 Disk usage critical: ${disk.usagePercent}% (only ${disk.freeGb}GB free)`);
    }

    const status: SystemStats["status"] = warnings.some((w) => w.startsWith("🔴"))
      ? "critical"
      : warnings.length > 0
        ? "warning"
        : "healthy";

    const stats: SystemStats = {
      timestamp: Date.now(),
      cpu: {
        usagePercent: cpuUsage,
        cores: coreList.length,
        model: coreList[0]?.model ?? "unknown",
      },
      memory: {
        usedMb: Math.round(usedMem / 1_048_576),
        totalMb: Math.round(totalMem / 1_048_576),
        usagePercent: memPercent,
        freeMb: Math.round(freeMem / 1_048_576),
      },
      heap: {
        usedMb: heapUsedMb,
        totalMb: heapTotalMb,
        externalMb,
        usagePercent: heapTotalMb > 0 ? Math.round((heapUsedMb / heapTotalMb) * 100) : 0,
      },
      disk,
      system: {
        platform: platform(),
        hostname: hostname(),
        uptimeSeconds: Math.round(uptime()),
        nodeVersion: process.version,
        ironcliwVersion: IRONCLIW_VERSION,
      },
      status,
      warnings,
    };

    this._latest = stats;
    this._history.push(stats);
    if (this._history.length > HealthWatchdog.HISTORY_SIZE) {
      this._history.shift();
    }
    this.emit("stats", stats);

    if (warnings.length > 0) {
      this.emit("alert", { stats, warnings });
      if (this.opts.consoleAlerts) {
        console.warn(`\n[IronCliw HealthWatchdog] ⚠️  System Alert:`);
        for (const w of warnings) {
          console.warn(`  ${w}`);
        }
        console.warn("");
      }
    }

    return stats;
  }

  /** Format stats as a human-readable string. */
  static formatStats(stats: SystemStats): string {
    const statusEmoji = { healthy: "✅", warning: "⚠️", critical: "🔴" }[stats.status];
    return [
      `🖥️  IronCliw System Health  ${statusEmoji} ${stats.status.toUpperCase()}`,
      `────────────────────────────────`,
      `🧠 CPU:    ${stats.cpu.usagePercent}% (${stats.cpu.cores} cores — ${stats.cpu.model})`,
      `💾 RAM:    ${stats.memory.usedMb} MB / ${stats.memory.totalMb} MB (${stats.memory.usagePercent}%)`,
      `🔮 Heap:   ${stats.heap.usedMb} MB / ${stats.heap.totalMb} MB (${stats.heap.usagePercent}%) + ${stats.heap.externalMb} MB external`,
      `💿 Disk:   ${stats.disk.usedGb} GB / ${stats.disk.totalGb} GB (${stats.disk.usagePercent}%)`,
      `🌐 Host:   ${stats.system.hostname} | ${stats.system.platform}`,
      `⬆️  Uptime: ${Math.round(stats.system.uptimeSeconds / 3600)}h ${Math.round((stats.system.uptimeSeconds % 3600) / 60)}m`,
      `📦 Version: IronCliw ${stats.system.ironcliwVersion} | Node ${stats.system.nodeVersion}`,
      ...(stats.warnings.length > 0
        ? [`\n⚠️  Warnings:`, ...stats.warnings.map((w) => `   ${w}`)]
        : []),
    ].join("\n");
  }
}

/* ─────────────────────────────────────────────────────────────
   Singleton instance (auto-started with gateway)
   ───────────────────────────────────────────────────────────── */

/**
 * Global watchdog instance. Call `.start()` to begin monitoring.
 *
 * @example
 * globalHealthWatchdog.start();
 * globalHealthWatchdog.on('alert', ({ warnings }) => notifyAdmin(warnings));
 */
export const globalHealthWatchdog = new HealthWatchdog({
  intervalMs: 30_000,
  consoleAlerts: true,
});
