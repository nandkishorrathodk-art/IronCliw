import { fireworksUnderstandImage } from "../../agents/fireworks-vlm.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import fs from "node:fs/promises";

const log = createSubsystemLogger("burp/vision");

/**
 * VisionEngine uses AI to interpret screenshots of the Burp Suite UI.
 */
export class BurpVisionEngine {
  /**
   * Interprets a screenshot and returns actionable coordinates or findings.
   * Uses Fireworks Kimi by default, with optional fallbacks.
   */
  async analyzeScreenshot(params: {
    imagePath: string;
    task: string;
    apiKey?: string;
    modelId?: string;
    provider?: "fireworks" | "openai" | "anthropic";
  }) {
    const { imagePath, task, apiKey, modelId, provider = "fireworks" } = params;
    log.info(`AI is analyzing Burp screenshot using ${provider} for task: ${task}`);

    // Read image and convert to base64 data URL
    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString("base64");
    const imageDataUrl = `data:image/png;base64,${base64Image}`;

    if (provider === "fireworks") {
      const prompt = `You are an expert security researcher. Look at this screenshot of Burp Suite Professional. 
      Task: ${task}
      
      Identify key UI elements, request details, and potential vulnerabilities. 
      Return a JSON object with:
      - findings: A summary of what you see.
      - elements: A list of UI components with { label, x, y } (normalized 0-1000 coordinates).
      - suggestion: What should the user do next?`;

      const response = await fireworksUnderstandImage({
        apiKey: apiKey || process.env.FIREWORKS_API_KEY || "",
        prompt,
        imageDataUrl,
        modelId: modelId || "accounts/fireworks/models/kimi-v1.5-vision-instruct"
      });

      try {
        // Attempt to parse JSON from the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        return { findings: response, elements: [], suggestion: "Could not parse structured data." };
      } catch (err) {
        log.warn("Failed to parse AI response as JSON, returning raw text.");
        return { findings: response, elements: [], suggestion: "Manual review required." };
      }
    }

    // Fallback for Claude/GPT (optional)
    throw new Error(`Provider ${provider} not yet implemented in Vision Engine.`);
  }

  /**
   * Translates a label (like 'Proxy') to coordinates based on the last analysis.
   */
  getCoordinates(label: string, elements: any[]) {
    const element = elements.find(e => e.label.toLowerCase().includes(label.toLowerCase()));
    return element ? { x: element.x, y: element.y } : null;
  }
}

export const burpVision = new BurpVisionEngine();
