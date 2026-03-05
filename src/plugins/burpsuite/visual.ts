import { runCommandWithTimeout } from "../../process/exec.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("burp/visual");

/**
 * BurpVisualController handles GUI automation for Burp Suite.
 * It uses the IronCliwDaemon (via shell commands) to control the mouse and keyboard.
 */
export class BurpVisualController {
  private burpPath: string = "C:\\Program Files\\BurpSuitePro\\BurpSuitePro.exe"; // Default path

  /**
   * Launch Burp Suite and bring it to foreground.
   */
  async launch() {
    log.info("Launching Burp Suite visually...");
    // Using start command to launch GUI app asynchronously
    await runCommandWithTimeout(["cmd", "/c", "start", "", this.burpPath]);
  }

  /**
   * Switch to a specific tab using keyboard shortcuts.
   */
  async switchToTab(tab: "proxy" | "repeater" | "intruder") {
    log.info(`Switching to Burp tab: ${tab}`);
    // Common Burp shortcuts (may need customization based on user settings)
    const shortcuts = {
      proxy: "%p", // Alt+P
      repeater: "%r", // Alt+R
      intruder: "%i", // Alt+I
    };
    
    await this.sendKeyPress(shortcuts[tab]);
  }

  /**
   * Sends a key press or sequence using PowerShell (via IronCliw native bridge).
   */
  private async sendKeyPress(keys: string) {
    const psScript = `
      $wshell = New-Object -ComObject WScript.Shell;
      if ($wshell.AppActivate("Burp Suite")) {
        Sleep -m 500;
        $wshell.SendKeys("${keys}");
      }
    `;
    await runCommandWithTimeout(["powershell", "-NoProfile", "-Command", psScript.replace(/\n/g, "")]);
  }

  /**
   * Clicks at the specified normalized coordinates (0-1000).
   */
  async clickAt(x: number, y: number) {
    log.info(`Clicking at normalized coordinates: ${x}, ${y}`);
    // In a real implementation, this would trigger the IronCliwDaemon's click tool.
    await runCommandWithTimeout(["IronCliw", "mouse", "click", "--x", String(x), "--y", String(y), "--normalized"]);
  }

  /**
   * Types text into the focused element.
   */
  async typeText(text: string) {
    log.info(`Typing text: ${text.slice(0, 20)}...`);
    const psScript = `
      $wshell = New-Object -ComObject WScript.Shell;
      if ($wshell.AppActivate("Burp Suite")) {
        Sleep -m 200;
        $wshell.SendKeys("${text.replace(/"/g, '""')}");
      }
    `;
    await runCommandWithTimeout(["powershell", "-NoProfile", "-Command", psScript.replace(/\n/g, "")]);
  }

  /**
   * Captures a screenshot of the Burp Suite window for AI analysis.
   */
  async captureUI() {
    log.info("Capturing Burp Suite UI for analysis...");
    const outPath = "burp_capture.png";
    await runCommandWithTimeout(["IronCliw", "screenshot", "--window", "Burp Suite", "--out", outPath]);
    return outPath;
  }
}

export const burpVisual = new BurpVisualController();
