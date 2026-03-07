import { desktopPlugin } from "../../plugins/desktop-automation/index.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";
import type { GatewayRequestHandlers } from "./types.js";

/**
 * Desktop Automation RPC Handlers
 */
export const desktopHandlers: GatewayRequestHandlers = {
  "desktop.capture": async ({ params, respond }) => {
    const { task } = params as { task: string };
    try {
      await desktopPlugin.init();
      const result = await desktopPlugin.analyzeDesktop(task || "General observation");
      respond(true, result);
    } catch (err: unknown) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, (err as Error).message));
    }
  },

  "desktop.control": async ({ params, respond }) => {
    const { appName, actions } = params as { appName: string, actions: unknown[] };
    try {
      await desktopPlugin.init();
      await desktopPlugin.controlApp(appName, actions as Array<{ action: "click" | "type" | "combo", x?: number, y?: number, text?: string }>);
      respond(true, { success: true });
    } catch (err: unknown) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, (err as Error).message));
    }
  },

  "desktop.targets": async ({ respond }) => {
    try {
      await desktopPlugin.init();
      const targets = await desktopPlugin.listAvailableTargets();
      respond(true, { targets });
    } catch (err: unknown) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, (err as Error).message));
    }
  },

  "desktop.clipboard.get": async ({ respond }) => {
    try {
      const text = await desktopPlugin.getClipboard();
      respond(true, { text });
    } catch (err: unknown) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, (err as Error).message));
    }
  },

  "desktop.clipboard.set": async ({ params, respond }) => {
    const { text } = params as { text: string };
    try {
      await desktopPlugin.setClipboard(text);
      respond(true, { success: true });
    } catch (err: unknown) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, (err as Error).message));
    }
  },

  "desktop.processes": async ({ respond }) => {
    try {
      const processes = await desktopPlugin.getProcesses();
      respond(true, { processes });
    } catch (err: unknown) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, (err as Error).message));
    }
  }
};
