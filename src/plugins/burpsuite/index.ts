import { BurpClient } from "./client.js";
import { trafficAnalyzer } from "./analyzer.js";
import { burpVisual } from "./visual.js";
import { burpVision } from "./vision-engine.js";
import { scopeManager } from "../../security/scope-manager.js";
import { safetyGate } from "../../security/safety-gate.js";
import type { BurpApiConfig } from "./types.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("burp/plugin");

/**
 * IronCliw Burp Suite Integration Plugin
 */
export class BurpSuitePlugin {
  private client?: BurpClient;

  /**
   * Initialize the plugin with Burp configuration
   */
  async init(config: BurpApiConfig) {
    this.client = new BurpClient(config);
    await scopeManager.load();
  }

  /**
   * Performs a visual scan of the Burp Suite UI.
   * This is the "Human-like" approach using Computer Vision.
   */
  async performVisualHunt(task: string, modelId?: string) {
    log.info(`Starting visual hunt: ${task} (Model: ${modelId || "default"})`);
    
    // 1. Launch/Focus Burp
    await burpVisual.launch();
    
    // 2. Capture the UI
    const screenshotPath = await burpVisual.captureUI();
    
    // 3. Analyze with Fireworks Kimi
    const analysis = await burpVision.analyzeScreenshot({
      imagePath: screenshotPath,
      task: task,
      provider: "fireworks",
      modelId: modelId
    });

    log.info("Visual analysis complete.");
    return analysis;
  }

  /**
   * Executes a specific security test visually after approval.
   */
  async executeVisualTest(params: {
    analysis: any;
    targetElement: string;
    action: "click" | "type";
    payload?: string;
  }) {
    const coords = burpVision.getCoordinates(params.targetElement, params.analysis.elements);
    if (!coords) {
      throw new Error(`Could not find element: ${params.targetElement}`);
    }

    log.info(`Executing visual action: ${params.action} on ${params.targetElement}`);
    
    // Safety check: is the URL in the analysis authorized?
    if (params.analysis.url && !scopeManager.isAuthorized(params.analysis.url)) {
      throw new Error("Unauthorized target detected during visual test.");
    }

    if (params.action === "click") {
      await burpVisual.clickAt(coords.x, coords.y);
    } else if (params.action === "type" && params.payload) {
      await burpVisual.clickAt(coords.x, coords.y); // Focus first
      await burpVisual.typeText(params.payload);
    }

    log.info("Visual test action completed.");
  }
  async getSecuritySuggestions() {
    if (!this.client) throw new Error("Burp Plugin not initialized");

    const history = await this.client.getProxyHistory();
    const suggestions = [];

    for (const item of history) {
      if (!scopeManager.isAuthorized(item.url)) continue;

      const analysis = trafficAnalyzer.analyze(item);
      if (analysis.isInteresting) {
        suggestions.push({
          url: item.url,
          findings: analysis.findings,
          recommendation: "Human review required before modification."
        });
      }
    }

    return suggestions;
  }

  /**
   * Health check for Burp Suite connection
   */
  async checkStatus() {
    if (!this.client) return { status: "disconnected" };
    try {
      const ok = await this.client.healthCheck();
      return { 
        status: ok ? "connected" : "error",
        authorizedScopes: scopeManager.getScopes()
      };
    } catch {
      return { status: "error" };
    }
  }
}

export const burpPlugin = new BurpSuitePlugin();
