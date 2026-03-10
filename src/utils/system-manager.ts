import { spawn } from "node:child_process";

/**
 * SystemManager provides utilities for system-level operations like clipboard and processes.
 */
export class SystemManager {
  /**
   * Reads text from the system clipboard.
   */
  async getClipboard(): Promise<string> {
    const psScript = "Get-Clipboard";
    return new Promise((resolve, reject) => {
      const ps = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", psScript]);
      let output = "";
      ps.stdout.on("data", (data) => (output += data.toString()));
      ps.on("close", (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error("Failed to read clipboard"));
        }
      });
    });
  }

  /**
   * Writes text to the system clipboard.
   */
  async setClipboard(text: string): Promise<void> {
    const escaped = text.replace(/"/g, '`"');
    const psScript = `Set-Clipboard -Value "${escaped}"`;
    return new Promise((resolve, reject) => {
      const ps = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", psScript]);
      ps.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error("Failed to set clipboard"));
        }
      });
    });
  }

  /**
   * Lists running processes.
   */
  async listProcesses(): Promise<
    Array<{ pid: number; name: string; cpu: number; memory: number }>
  > {
    const psScript =
      "Get-Process | Select-Object Id, ProcessName, CPU, WorkingSet64 | ConvertTo-Json";
    return new Promise((resolve, reject) => {
      const ps = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", psScript]);
      let output = "";
      ps.stdout.on("data", (data) => (output += data.toString()));
      ps.on("close", (code) => {
        if (code === 0) {
          try {
            const data = JSON.parse(output);
            const list = Array.isArray(data) ? data : [data];
            resolve(
              (
                list as Array<{
                  Id: number;
                  ProcessName: string;
                  CPU: number | null;
                  WorkingSet64: number;
                }>
              ).map((p) => ({
                pid: p.Id,
                name: p.ProcessName,
                cpu: p.CPU || 0,
                memory: Math.round((p.WorkingSet64 || 0) / 1024 / 1024), // MB
              })),
            );
          } catch {
            resolve([]);
          }
        } else {
          reject(new Error("Failed to list processes"));
        }
      });
    });
  }
}

export const systemManager = new SystemManager();
