import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

export interface VisionAnalysisResult {
  text: string[];
  objects: { label: string; confidence: number; boundingBox: [number, number, number, number] }[];
  suggestedActions: string[];
  rawResponse?: string;
}

export interface VisionEngineConfig {
  /** Fireworks AI API key. Defaults to FIREWORKS_API_KEY env var. */
  apiKey?: string;
  /** Model to use. Default: "accounts/fireworks/models/firefunction-v2" (vision-capable). */
  model?: string;
  /** Request timeout in ms. Default: 30 000. */
  timeoutMs?: number;
  /** Vision analysis prompt. Can be overridden for specific tasks. */
  analysisPrompt?: string;
}

const DEFAULT_MODEL = "accounts/fireworks/models/llava-yi-34b";
const DEFAULT_PROMPT =
  "Analyze this screenshot. List: 1) all visible text, 2) UI elements (buttons, inputs, menus) with their approximate positions, 3) suggested next actions a user or automation agent could take. Respond in JSON with keys: text (string[]), objects (array of {label, confidence, boundingBox: [x1,y1,x2,y2]}), suggestedActions (string[]).";

export class VisionEngine {
  private readonly config: Required<VisionEngineConfig>;

  constructor(config: VisionEngineConfig = {}) {
    this.config = {
      apiKey: config.apiKey ?? process.env.FIREWORKS_API_KEY ?? "",
      model: config.model ?? DEFAULT_MODEL,
      timeoutMs: config.timeoutMs ?? 30_000,
      analysisPrompt: config.analysisPrompt ?? DEFAULT_PROMPT,
    };
  }

  /**
   * Analyze a screenshot file using Fireworks vision API.
   * Falls back to a structured stub if no API key is configured.
   */
  public async analyzeScreenshot(imagePath: string): Promise<VisionAnalysisResult> {
    const imageBuffer = await fs.readFile(imagePath).catch(() => {
      throw new Error(`Screenshot not found at path: ${imagePath}`);
    });
    const ext = path.extname(imagePath).toLowerCase().slice(1);
    const format = (["png", "jpg", "jpeg", "webp"] as const).includes(
      ext as "png" | "jpg" | "jpeg" | "webp",
    )
      ? (ext as "png" | "jpg" | "jpeg" | "webp")
      : "png";
    return this.analyzeImageBuffer(imageBuffer, format);
  }

  /**
   * Analyze an in-memory image buffer using Fireworks vision API.
   * Accepts any image format supported by Fireworks (png, jpg, webp).
   */
  public async analyzeImageBuffer(
    imageBuffer: Buffer,
    format: "png" | "jpg" | "jpeg" | "webp" = "png",
  ): Promise<VisionAnalysisResult> {
    if (!this.config.apiKey) {
      console.warn("[VisionEngine] No FIREWORKS_API_KEY set — returning stub result.");
      return this._stubResult();
    }

    const base64Image = imageBuffer.toString("base64");
    const mimeType = format === "jpg" || format === "jpeg" ? "image/jpeg" : `image/${format}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch("https://api.fireworks.ai/inference/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: this.config.analysisPrompt },
                { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } },
              ],
            },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`Fireworks API error ${response.status}: ${errorText}`);
      }

      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const rawContent = json.choices?.[0]?.message?.content ?? "";

      return this._parseVisionResponse(rawContent);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Detect all visible windows on the Windows desktop using PowerShell.
   * Returns real window titles from the running processes.
   */
  public async detectMultiWindow(): Promise<string[]> {
    if (process.platform !== "win32") {
      return [];
    }

    const psScript = `
Get-Process | Where-Object { $_.MainWindowTitle -ne "" } | Select-Object -ExpandProperty MainWindowTitle
`.trim();

    return new Promise((resolve) => {
      const ps = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", psScript], {
        stdio: "pipe",
      });

      let output = "";
      let settled = false;
      let watchdog: ReturnType<typeof setTimeout> | undefined;

      const done = (titles: string[]) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(watchdog);
        resolve(titles);
      };

      watchdog = setTimeout(() => {
        try {
          ps.kill();
        } catch {}
        done([]);
      }, 5000);

      ps.stdout.on("data", (chunk: Buffer) => {
        output += chunk.toString();
      });

      ps.on("close", () => {
        const titles = output
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);
        done(titles);
      });

      ps.on("error", () => done([]));
    });
  }

  private _parseVisionResponse(raw: string): VisionAnalysisResult {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as Partial<VisionAnalysisResult>;
        return {
          text: Array.isArray(parsed.text) ? parsed.text : [],
          objects: Array.isArray(parsed.objects) ? parsed.objects : [],
          suggestedActions: Array.isArray(parsed.suggestedActions) ? parsed.suggestedActions : [],
          rawResponse: raw,
        };
      } catch {
        // fall through to text parsing
      }
    }

    return {
      text: raw ? [raw] : [],
      objects: [],
      suggestedActions: [],
      rawResponse: raw,
    };
  }

  private _stubResult(): VisionAnalysisResult {
    return {
      text: [],
      objects: [],
      suggestedActions: [],
    };
  }
}
