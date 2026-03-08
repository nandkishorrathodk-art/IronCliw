import { spawn } from "node:child_process";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { scopeManager } from "../security/scope-manager.js";

const log = createSubsystemLogger("utils/window-manager");

export interface WindowInfo {
  id: number;
  title: string;
  processName: string;
}

/**
 * WindowManager provides utilities to find and manipulate OS windows.
 */
export class WindowManager {
  /**
   * Lists all active windows with titles.
   */
  async listWindows(): Promise<WindowInfo[]> {
    const psScript = `
      Get-Process | Where-Object { $_.MainWindowTitle } | Select-Object Id, MainWindowTitle, ProcessName | ConvertTo-Json
    `.trim();

    return new Promise((resolve, reject) => {
      const ps = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", psScript]);
      let output = "";
      ps.stdout.on("data", (data) => output += data.toString());
      ps.on("close", (code) => {
        if (code === 0) {
          try {
            const data = JSON.parse(output);
            const list = Array.isArray(data) ? data : [data];
            resolve((list as Array<{ Id: number, MainWindowTitle: string, ProcessName: string }>).map((item) => ({
              id: item.Id,
              title: item.MainWindowTitle,
              processName: item.ProcessName
            })));
          } catch {
            resolve([]);
          }
        } else {
          reject(new Error("Failed to list windows"));
        }
      });
    });
  }

  /**
   * Brings a window to the foreground if it's authorized.
   */
  async focusWindow(titleOrProcess: string): Promise<boolean> {
    if (!(await scopeManager.isAppAuthorized(titleOrProcess))) {
      log.warn(`Denying focus request for unauthorized app: ${titleOrProcess}`);
      return false;
    }

    log.info(`Focusing window: ${titleOrProcess}`);
    const psScript = `
      $wshell = New-Object -ComObject WScript.Shell;
      $wshell.AppActivate("${titleOrProcess}")
    `.trim();

    return new Promise((resolve) => {
      const ps = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", psScript]);
      ps.on("close", (code) => resolve(code === 0));
    });
  }
}

export const windowManager = new WindowManager();
