import { spawn } from "node:child_process";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { safetyGate } from "../security/safety-gate.js";

const log = createSubsystemLogger("input/desktop");

/**
 * DesktopInput provides methods to simulate mouse and keyboard input on the host OS.
 */
export class DesktopInput {
  /**
   * Moves the cursor to (x, y) and clicks.
   */
  async clickAt(x: number, y: number): Promise<void> {
    await safetyGate.waitInput();
    log.info(`Clicking at (${x}, ${y})`);

    const psScript = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})
      $signature = '[DllImport("user32.dll")]public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, uint dwExtraInfo);'
      $type = Add-Type -MemberDefinition $signature -Name "Win32MouseEvent" -Namespace "Win32" -PassThru
      $type::mouse_event(0x0002, 0, 0, 0, 0) # LEFTDOWN
      $type::mouse_event(0x0004, 0, 0, 0, 0) # LEFTUP
    `.trim();

    return this.runPowerShell(psScript);
  }

  /**
   * Types a string of text.
   */
  async typeText(text: string): Promise<void> {
    await safetyGate.waitInput();
    log.info(`Typing text: ${text.length > 20 ? text.slice(0, 20) + "..." : text}`);

    // Escape special characters for SendKeys
    const escaped = text.replace(/([%+^~{}()[\]])/g, '{$1}');
    const psScript = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]::SendWait("${escaped}")
    `.trim();

    return this.runPowerShell(psScript);
  }

  /**
   * Sends a special key combo (e.g., "^c" for Ctrl+C).
   */
  async sendKeyCombo(combo: string): Promise<void> {
    await safetyGate.waitInput();
    log.info(`Sending key combo: ${combo}`);

    const psScript = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]::SendWait("${combo}")
    `.trim();

    return this.runPowerShell(psScript);
  }

  private runPowerShell(script: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ps = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script]);
      ps.on("close", (code) => code === 0 ? resolve() : reject(new Error(`Input failed with code ${code}`)));
      ps.on("error", (err) => reject(err));
    });
  }
}

export const desktopInput = new DesktopInput();
