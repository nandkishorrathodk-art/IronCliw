import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import { logVerbose } from "../../globals.js";
import type { AnyAgentTool } from "./common.js";
import { ToolInputError, jsonResult, readStringParam } from "./common.js";

interface ScreenshotData {
  timestamp: number;
  width: number;
  height: number;
  base64: string;
  analysis?: {
    description: string;
    elements: Array<{
      type: string;
      text: string;
      location: { x: number; y: number };
    }>;
  };
}

interface ComputerAction {
  action: "screenshot" | "click" | "type" | "key" | "wait" | "scroll";
  params: Record<string, unknown>;
}

interface ComputerControlResult {
  success: boolean;
  action: string;
  result?: unknown;
  error?: string;
  screenshot?: ScreenshotData;
}

class ComputerControlSession {
  private sessionId = Math.random().toString(36).substring(7);
  private lastScreenshot: ScreenshotData | null = null;
  private actionHistory: ComputerAction[] = [];
  private connected = false;

  constructor() {
    logVerbose(`[computer-control] Session created: ${this.sessionId}`);
  }

  async connect(): Promise<void> {
    try {
      const response = await fetch("http://localhost:5037/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: this.sessionId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to connect to computer control agent: ${response.status}`);
      }

      this.connected = true;
      logVerbose(`[computer-control] Connected to paired device`);
    } catch (error) {
      logVerbose(`[computer-control] Connection failed: ${String(error)}`);
      throw new Error("Computer control agent not available. Ensure a paired device is running.", { cause: error });
    }
  }

  async takeScreenshot(): Promise<ScreenshotData> {
    if (!this.connected) {
      await this.connect();
    }

    try {
      const response = await fetch("http://localhost:5037/api/screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: this.sessionId }),
      });

      if (!response.ok) {
        throw new Error(`Screenshot failed: ${response.status}`);
      }

      const data = await response.json();
      this.lastScreenshot = {
        timestamp: Date.now(),
        width: data.width || 0,
        height: data.height || 0,
        base64: data.image || "",
      };

      return this.lastScreenshot;
    } catch (error) {
      throw new Error(`Failed to take screenshot: ${String(error)}`, { cause: error });
    }
  }

  async analyzeScreenshot(screenshot: ScreenshotData): Promise<void> {
    try {
      const response = await fetch("https://api.openai.com/v1/vision/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY || ""}`,
        },
        body: JSON.stringify({
          model: "gpt-4-vision",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/png;base64,${screenshot.base64}`,
                  },
                },
                {
                  type: "text",
                  text: "Analyze this screenshot. Identify all visible UI elements, buttons, text fields, and their approximate locations. Format as JSON.",
                },
              ],
            },
          ],
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        logVerbose(`[computer-control] Vision analysis failed: ${response.status}`);
        return;
      }

      const data = await response.json();
      const analysisText = data.choices?.[0]?.message?.content || "";

      screenshot.analysis = {
        description: analysisText,
        elements: [],
      };
    } catch (error) {
      logVerbose(`[computer-control] Vision analysis error: ${String(error)}`);
    }
  }

  async click(x: number, y: number): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }

    const response = await fetch("http://localhost:5037/api/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: this.sessionId, x, y }),
    });

    if (!response.ok) {
      throw new Error(`Click failed: ${response.status}`);
    }

    this.actionHistory.push({
      action: "click",
      params: { x, y },
    });
  }

  async type(text: string): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }

    const response = await fetch("http://localhost:5037/api/type", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: this.sessionId, text }),
    });

    if (!response.ok) {
      throw new Error(`Type failed: ${response.status}`);
    }

    this.actionHistory.push({
      action: "type",
      params: { text },
    });
  }

  async pressKey(key: string): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }

    const response = await fetch("http://localhost:5037/api/key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: this.sessionId, key }),
    });

    if (!response.ok) {
      throw new Error(`Key press failed: ${response.status}`);
    }

    this.actionHistory.push({
      action: "key",
      params: { key },
    });
  }

  async scroll(dx: number, dy: number): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }

    const response = await fetch("http://localhost:5037/api/scroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: this.sessionId, dx, dy }),
    });

    if (!response.ok) {
      throw new Error(`Scroll failed: ${response.status}`);
    }

    this.actionHistory.push({
      action: "scroll",
      params: { dx, dy },
    });
  }

  async wait(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
    this.actionHistory.push({
      action: "wait",
      params: { ms },
    });
  }
}

const sessions = new Map<string, ComputerControlSession>();

export const computerControlTool: AnyAgentTool = {
  name: "computer_control",
  description:
    "Control a paired desktop/laptop computer: take screenshots, analyze with vision LLM, " +
    "click buttons, type text, press keys, and scroll. Enables RPA (Robotic Process Automation) workflows. " +
    "Requires a paired IronCliw Node running on the target device.",
  input_schema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["screenshot", "click", "type", "key", "scroll", "wait"],
        description: "Control action to perform",
      },
      x: {
        type: "number",
        description: "X coordinate for click action",
      },
      y: {
        type: "number",
        description: "Y coordinate for click action",
      },
      text: {
        type: "string",
        description: "Text to type",
      },
      key: {
        type: "string",
        description: "Key to press (e.g., 'enter', 'tab', 'ctrl+c', 'alt+tab')",
      },
      dx: {
        type: "number",
        description: "Horizontal scroll delta",
      },
      dy: {
        type: "number",
        description: "Vertical scroll delta",
      },
      ms: {
        type: "number",
        description: "Milliseconds to wait",
      },
      session_id: {
        type: "string",
        description: "Session ID (auto-generated if not provided)",
      },
      analyze: {
        type: "boolean",
        description: "Analyze screenshot with vision LLM (default: false)",
      },
    },
    required: ["action"],
  },

  async execute(params: Record<string, unknown>): Promise<AgentToolResult> {
    try {
      const action = readStringParam(params, "action", { required: true });
      const sessionId =
        readStringParam(params, "sessionId") || Math.random().toString(36).substring(7);

      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, new ComputerControlSession());
      }

      const session = sessions.get(sessionId)!;
      const result: ComputerControlResult = {
        success: false,
        action,
      };

      switch (action) {
        case "screenshot": {
          const screenshot = await session.takeScreenshot();
          const analyze = params.analyze === true || params.analyze === "true";
          if (analyze) {
            await session.analyzeScreenshot(screenshot);
          }
          result.success = true;
          result.screenshot = screenshot;
          break;
        }

        case "click": {
          const x = params.x as number;
          const y = params.y as number;
          if (typeof x !== "number" || typeof y !== "number") {
            throw new ToolInputError("click requires x and y coordinates");
          }
          await session.click(x, y);
          result.success = true;
          result.result = `Clicked at (${x}, ${y})`;
          break;
        }

        case "type": {
          const text = readStringParam(params, "text", { required: true });
          await session.type(text);
          result.success = true;
          result.result = `Typed: ${text}`;
          break;
        }

        case "key": {
          const key = readStringParam(params, "key", { required: true });
          await session.pressKey(key);
          result.success = true;
          result.result = `Pressed: ${key}`;
          break;
        }

        case "scroll": {
          const dx = params.dx as number;
          const dy = params.dy as number;
          if (typeof dx !== "number" || typeof dy !== "number") {
            throw new ToolInputError("scroll requires dx and dy");
          }
          await session.scroll(dx, dy);
          result.success = true;
          result.result = `Scrolled (${dx}, ${dy})`;
          break;
        }

        case "wait": {
          const ms = params.ms as number;
          if (typeof ms !== "number" || ms < 0) {
            throw new ToolInputError("wait requires positive ms value");
          }
          await session.wait(ms);
          result.success = true;
          result.result = `Waited ${ms}ms`;
          break;
        }

        default:
          throw new ToolInputError(`Unknown action: ${action}`);
      }

      logVerbose(`[computer-control] ${action} completed successfully`);

      return jsonResult(result);
    } catch (error) {
      if (error instanceof ToolInputError) {
        throw error;
      }
      throw new ToolInputError(`Computer control failed: ${String(error)}`);
    }
  },
};
