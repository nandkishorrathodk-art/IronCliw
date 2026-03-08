import { BurpClient } from "./client.js";
import { burpVisual } from "./visual.js";
import { burpVision } from "./vision-engine.js";
import { burpKnowledge } from "./knowledge.js";
import { BurpRepeater } from "./repeater.js";
import { BurpIntruder } from "./intruder.js";
import { BurpInterceptor } from "./interceptor.js";
import { responseAnalyzer } from "./response-analyzer.js";
import { scopeManager } from "../../security/scope-manager.js";
import type { BurpApiConfig } from "./types.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("burp/plugin");

export class BurpSuitePlugin {
  private client?: BurpClient;
  public repeater?: BurpRepeater;
  public intruder?: BurpIntruder;
  public interceptor?: BurpInterceptor;

  async init(config: BurpApiConfig) {
    this.client = new BurpClient(config);
    this.repeater = new BurpRepeater(this.client);
    this.intruder = new BurpIntruder(this.client);
    this.interceptor = new BurpInterceptor(this.client);
    await scopeManager.load();
    log.info("[BurpPlugin] Initialized — Repeater, Intruder, Interceptor, ResponseAnalyzer ready.");
  }

  private ensureClient(): BurpClient {
    if (!this.client) {
      throw new Error("Burp not initialized. Run: IronCliw burp init");
    }
    return this.client;
  }

  async performVisualHunt(task: string, modelId?: string) {
    log.info(`Starting visual hunt: ${task}`);
    const tutorial = await burpKnowledge.consultTutorial(task);
    await burpVisual.launch();
    const screenshotPath = await burpVisual.captureUI();
    const analysis = await burpVision.analyzeScreenshot({
      imagePath: screenshotPath,
      task: tutorial ? `Tutorial provided: ${tutorial}\n\nTask: ${task}` : task,
      provider: "fireworks",
      modelId,
    });
    log.info("Visual analysis complete.");
    return analysis;
  }

  async executeVisualTest(params: {
    analysis: { url?: string; elements: { label: string; x: number; y: number }[] };
    targetElement: string;
    action: "click" | "type";
    payload?: string;
  }) {
    const coords = burpVision.getCoordinates(params.targetElement, params.analysis.elements);
    if (!coords) {
      throw new Error(`Could not find element: ${params.targetElement}`);
    }
    if (params.analysis.url && !scopeManager.isAuthorized(params.analysis.url)) {
      throw new Error("Unauthorized target detected during visual test.");
    }
    if (params.action === "click") {
      await burpVisual.clickAt(coords.x, coords.y);
    } else if (params.action === "type" && params.payload) {
      await burpVisual.clickAt(coords.x, coords.y);
      await burpVisual.typeText(params.payload);
    }
  }

  /**
   * Autonomous repeater hunt — pull proxy history, inject payloads, confirm bugs.
   */
  async repeaterHunt(opts: {
    filterUrl?: string;
    vulnTypes?: string[];
    maxRequests?: number;
  } = {}) {
    const client = this.ensureClient();
    const rep = this.repeater ?? new BurpRepeater(client);
    return await rep.huntFromHistory(opts);
  }

  /**
   * Autonomous Intruder attack on a target URL.
   */
  async intruderAttack(params: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    payloads: string[][];
    positionNames: string[];
    mode?: "sniper" | "battering-ram" | "pitchfork" | "cluster-bomb";
    maxRequests?: number;
  }) {
    const client = this.ensureClient();
    const intr = this.intruder ?? new BurpIntruder(client);
    const positions = params.positionNames.map((name, i) => ({ name, start: i * 10, end: i * 10 + 5 }));
    return await intr.attack({
      url: params.url,
      method: params.method,
      headers: params.headers,
      body: params.body,
      positions,
      payloadSets: params.payloads,
      mode: params.mode,
      maxRequests: params.maxRequests,
    });
  }

  /**
   * Start autonomous proxy interceptor with optional rules.
   */
  async startInterceptor(opts: {
    injectHeader?: { name: string; value: string };
    injectPayload?: { param: string; payload: string };
    maxMessages?: number;
    onIntercept?: (req: unknown, action: string) => void;
  } = {}) {
    const client = this.ensureClient();
    const icept = this.interceptor ?? new BurpInterceptor(client);

    if (opts.injectHeader) {
      icept.addHeaderInjectionRule(opts.injectHeader.name, opts.injectHeader.value);
    }
    if (opts.injectPayload) {
      icept.addPayloadInjectionRule(opts.injectPayload.param, opts.injectPayload.payload);
    }

    return icept.start({ maxMessages: opts.maxMessages, onIntercept: opts.onIntercept });
  }

  /**
   * Launch Burp's built-in active scanner on a target URL.
   */
  async startActiveScan(targetUrl: string, opts: {
    username?: string;
    password?: string;
    waitForCompletion?: boolean;
    timeoutMs?: number;
  } = {}) {
    const client = this.ensureClient();
    const { taskId } = await client.startScan(targetUrl, {
      username: opts.username,
      password: opts.password,
    });
    log.info(`[BurpPlugin] Active scan started — task ID: ${taskId}`);

    if (opts.waitForCompletion) {
      const result = await client.waitForScan(taskId, opts.timeoutMs);
      const issues = await client.getScanIssues();
      return { taskId, result, issues };
    }

    return { taskId };
  }

  /**
   * Analyze a raw response to confirm/detect vulnerabilities.
   */
  analyzeResponse(params: {
    responseBody: string;
    statusCode: number;
    responseHeaders: Record<string, string>;
    responseTimeMs: number;
    requestUrl: string;
    requestPayload?: string;
    vulnType?: string;
  }) {
    if (params.vulnType) {
      return responseAnalyzer.confirmVulnerability({
        payload: params.requestPayload ?? "",
        vulnType: params.vulnType,
        responseBody: params.responseBody,
        statusCode: params.statusCode,
        responseHeaders: params.responseHeaders,
        responseTimeMs: params.responseTimeMs,
      });
    }
    return responseAnalyzer.autoDetect(params);
  }

  async checkStatus() {
    if (!this.client) {
      return { status: "disconnected" };
    }
    try {
      const ok = await this.client.healthCheck();
      return {
        status: ok ? "connected" : "error",
        authorizedScopes: scopeManager.getScopes(),
        capabilities: ["visual-hunt", "repeater", "intruder", "interceptor", "active-scan", "response-analyzer"],
      };
    } catch {
      return { status: "error" };
    }
  }
}

export const burpPlugin = new BurpSuitePlugin();
export { responseAnalyzer };
