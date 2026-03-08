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
   * Checks if Burp Suite is currently running.
   */
  async isRunning(): Promise<boolean> {
    try {
      const result = await runCommandWithTimeout(["powershell", "-NoProfile", "-Command", 'Get-Process | Where-Object { $_.MainWindowTitle -like "*Burp Suite*" }'], 5000);
      return result.stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Launch Burp Suite and complete the startup wizard.
   */
  async launch() {
    if (await this.isRunning()) {
      log.info("Burp Suite is already running. Bringing to focus...");
      await this.ensureFocus();
      return;
    }

    log.info("Launching Burp Suite visually...");
    await runCommandWithTimeout(["cmd", "/c", "start", "", this.burpPath], 10000);

    // 1. Wait for the Startup Wizard to appear
    log.info("Waiting for Burp Suite wizard (15s)...");
    await new Promise(resolve => setTimeout(resolve, 15000)); 

    // 2. Click 'Next' (usually 'Enter' selects 'Temporary Project' and moves to next)
    log.info("Step 1: Clicking 'Next' button...");
    await this.sendKeyPress("~"); 
    
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for screen change

    // 3. Click 'Start Burp' (usually 'Enter' selects 'Use Burp defaults' and starts)
    log.info("Step 2: Clicking 'Start Burp' button...");
    await this.sendKeyPress("~"); 

    log.info("Burp Suite startup sequence completed. Waiting for main UI (15s)...");
    await new Promise(resolve => setTimeout(resolve, 15000)); 
    await this.ensureFocus();
  }

  /**
   * Switch to a specific tab using keyboard shortcuts.
   */
  async switchToTab(tab: "proxy" | "repeater" | "intruder") {
    log.info(`Switching to Burp tab: ${tab}`);
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
      $process = Get-Process | Where-Object { $_.MainWindowTitle -like "*Burp Suite*" } | Select-Object -First 1;
      if ($process) {
        $wshell.AppActivate($process.Id);
        Sleep -m 500;
        $wshell.SendKeys("${keys}");
      } else {
        if ($wshell.AppActivate("Burp Suite")) {
          Sleep -m 500;
          $wshell.SendKeys("${keys}");
        }
      }
    `;
    await runCommandWithTimeout(["powershell", "-NoProfile", "-Command", psScript.replace(/\n/g, "")], 10000);
  }

  /**
   * Clicks at the specified normalized coordinates (0-1000).
   */
  async clickAt(x: number, y: number) {
    log.info(`Clicking at normalized coordinates: ${x}, ${y}`);
    await this.ensureFocus();
    await runCommandWithTimeout(["IronCliw", "mouse", "click", "--x", String(x), "--y", String(y), "--normalized"], 5000);
  }

  /**
   * Ensures the Burp window is focused.
   */
  async ensureFocus() {
    const psScript = `
      $wshell = New-Object -ComObject WScript.Shell;
      $process = Get-Process | Where-Object { $_.MainWindowTitle -like "*Burp Suite*" } | Select-Object -First 1;
      if ($process) { $wshell.AppActivate($process.Id) }
    `;
    await runCommandWithTimeout(["powershell", "-NoProfile", "-Command", psScript.replace(/\n/g, "")], 5000);
  }

  /**
   * Types text into the focused element.
   */
  async typeText(text: string) {
    log.info(`Typing text: ${text.slice(0, 20)}...`);
    await this.ensureFocus();
    const escaped = text.replace(/([%+^~{}()[\]])/g, '{$1}');
    await this.sendKeyPress(escaped);
  }

  /**
   * Captures a screenshot of the Burp Suite window for AI analysis.
   */
  async captureUI() {
    log.info("Capturing Burp Suite UI for analysis...");
    await this.ensureFocus();
    const outPath = "burp_capture.png";
    await runCommandWithTimeout(["IronCliw", "screenshot", "--window", "Burp Suite", "--out", outPath], 10000);
    return outPath;
  }
}

export const burpVisual = new BurpVisualController();
