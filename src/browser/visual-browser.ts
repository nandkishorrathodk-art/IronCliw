import fs from "node:fs/promises";
import type { Page } from "playwright-core";
import { fireworksUnderstandImage } from "../agents/fireworks-vlm.js";
import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("browser/visual");

/**
 * VisualBrowser provides AI-driven visual interaction for browser pages.
 */
export class VisualBrowser {
  /**
   * Finds an element visually and clicks it.
   * @param page Playwright Page instance
   * @param prompt Description of the element to find (e.g., "Login button")
   */
  async visualClick(page: Page, prompt: string): Promise<boolean> {
    try {
      // 1. Take screenshot of the viewport
      const screenshotBuffer = await page.screenshot();
      const imageDataUrl = `data:image/png;base64,${screenshotBuffer.toString("base64")}`;
      log.info(
        `Captured page screenshot for visual click (buffer size: ${screenshotBuffer.length})`,
      );

      // 2. Analyze with Vision AI
      const analysis = await fireworksUnderstandImage({
        apiKey: process.env.FIREWORKS_API_KEY || "",
        imageDataUrl,
        prompt: `List the coordinates (x, y) of the center of the "${prompt}" in the image. Return JSON format: { "x": number, "y": number }`,
      });

      // 3. Parse coordinates
      const jsonMatch = analysis.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        log.warn("AI could not find coordinates in visual analysis.");
        return false;
      }

      const coords = JSON.parse(jsonMatch[0]) as { x: number; y: number };
      log.info(`AI found "${prompt}" at (${coords.x}, ${coords.y}). Clicking...`);

      // 4. Perform click
      await page.mouse.click(coords.x, coords.y);
      return true;
    } catch (err) {
      log.error(`Visual click failed: ${(err as Error).message}`);
      return false;
    } finally {
      await fs.rm(screenshotPath, { force: true });
    }
  }
}

export const visualBrowser = new VisualBrowser();
