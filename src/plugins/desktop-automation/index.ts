import path from "node:path";
import { desktopInput } from "../../input/desktop-input.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import { scopeManager } from "../../security/scope-manager.js";
import { CONFIG_DIR } from "../../utils.js";
import { systemManager } from "../../utils/system-manager.js";
import { windowManager } from "../../utils/window-manager.js";
import { desktopVision } from "../../vision/desktop-vision.js";

const log = createSubsystemLogger("plugin/desktop");

/**
 * IronCliw Desktop Automation Plugin
 * Provides global vision and input control with strict safety scoping.
 */
export class DesktopAutomationPlugin {
  async init() {
    await scopeManager.load();
    log.info("Desktop Automation Plugin Initialized.");
  }

  /**
   * Captures the entire desktop and returns the analysis.
   */
  async analyzeDesktop(task: string) {
    const screenshotPath = path.join(CONFIG_DIR, "tmp", `desktop_${Date.now()}.png`);

    // 1. Capture
    await desktopVision.captureScreenshot(screenshotPath);

    // 2. Returning the path for external processing
    log.info(`Desktop captured for task: ${task}`);
    return { screenshotPath, task };
  }

  /**
   * Focuses an authorized app and performs actions.
   */
  async controlApp(
    appName: string,
    actions: Array<{ action: "click" | "type" | "combo"; x?: number; y?: number; text?: string }>,
  ) {
    // 1. Check Scope
    if (!(await scopeManager.isAppAuthorized(appName))) {
      throw new Error(`Unauthorized application: ${appName}`);
    }

    // 2. Focus
    const focused = await windowManager.focusWindow(appName);
    if (!focused) {
      throw new Error(`Could not focus application: ${appName}`);
    }

    // 3. Execute
    for (const step of actions) {
      if (step.action === "click" && step.x !== undefined && step.y !== undefined) {
        await desktopInput.clickAt(step.x, step.y);
      } else if (step.action === "type" && step.text) {
        await desktopInput.typeText(step.text);
      } else if (step.action === "combo" && step.text) {
        await desktopInput.sendKeyCombo(step.text);
      }
    }

    log.info(`Completed automation sequence for ${appName}`);
  }

  /**
   * Clipboard Operations
   */
  async getClipboard() {
    return systemManager.getClipboard();
  }

  async setClipboard(text: string) {
    return systemManager.setClipboard(text);
  }

  /**
   * System Process Info
   */
  async getProcesses() {
    return systemManager.listProcesses();
  }

  /**
   * Lists all windows to help the user/AI identify targets.
   */
  async listAvailableTargets() {
    const windows = await windowManager.listWindows();
    const authorized = await Promise.all(
      windows.map(async (w) => ({
        ...w,
        isAuthorized:
          (await scopeManager.isAppAuthorized(w.processName)) ||
          (await scopeManager.isAppAuthorized(w.title)),
      })),
    );
    return authorized;
  }
}

export const desktopPlugin = new DesktopAutomationPlugin();
