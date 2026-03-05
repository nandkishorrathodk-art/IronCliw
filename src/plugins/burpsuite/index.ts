import { BurpClient } from "./client.js";
import { trafficAnalyzer } from "./analyzer.js";
import { burpVisual } from "./visual.js";
import { burpVision } from "./vision-engine.js";
import { burpKnowledge } from "./knowledge.js";
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
   * Now includes self-learning via tutorials!
   */
  async performVisualHunt(task: string, modelId?: string) {
    log.info(`Starting visual hunt: ${task}`);
    
    // 1. Consulting knowledge base if task is specific
    const tutorial = await burpKnowledge.consultTutorial(task);
    if (tutorial) {
      log.info("Learning from tutorial before action...");
      // In a real flow, the AI would ingest this tutorial content
    }

    // 2. Launch/Focus Burp
    await burpVisual.launch();
    
    // 3. Capture the UI
    const screenshotPath = await burpVisual.captureUI();
    
    // 4. Analyze with Vision + Knowledge
    const analysis = await burpVision.analyzeScreenshot({
      imagePath: screenshotPath,
      task: tutorial ? `Tutorial provided: ${tutorial}\n\nTask: ${task}` : task,
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
    
    if (params.analysis.url && !scopeManager.isAuthorized(params.analysis.url)) {
      throw new Error("Unauthorized target detected during visual test.");
    }

    if (params.action === "click") {
      await burpVisual.clickAt(coords.x, coords.y);
    } else if (params.action === "type" && params.payload) {
      await burpVisual.clickAt(coords.x, coords.y);
      await burpVisual.typeText(params.payload);
    }

    log.info("Visual test action completed.");
  }

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
