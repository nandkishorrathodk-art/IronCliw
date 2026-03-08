import type { BurpClient } from "./client.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("burp/interceptor");

export type InterceptRule = {
  name: string;
  match: (req: { url: string; method: string; headers: Record<string, string>; body?: string }) => boolean;
  modify: (req: { url: string; method: string; headers: Record<string, string>; body?: string }) => {
    url?: string;
    headers?: Record<string, string>;
    body?: string;
    drop?: boolean;
  };
};

export type InterceptedRequest = {
  messageId: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
};

/**
 * BurpInterceptor — Autonomous proxy interceptor.
 * Watches Burp's intercept queue and applies rules to modify or drop requests.
 * Can inject headers, payloads, or custom logic before forwarding.
 */
export class BurpInterceptor {
  private rules: InterceptRule[] = [];
  private running = false;
  private pollInterval = 1000;
  private processedCount = 0;
  private modifiedCount = 0;

  constructor(private client: BurpClient) {}

  addRule(rule: InterceptRule) {
    this.rules.push(rule);
    log.info(`[Interceptor] Rule added: "${rule.name}"`);
  }

  clearRules() {
    this.rules = [];
  }

  /**
   * Add a built-in rule that injects a header into every matching request.
   */
  addHeaderInjectionRule(headerName: string, headerValue: string, urlPattern?: RegExp) {
    this.addRule({
      name: `Inject header: ${headerName}`,
      match: (req) => urlPattern ? urlPattern.test(req.url) : true,
      modify: (req) => ({
        headers: { ...req.headers, [headerName]: headerValue },
      }),
    });
  }

  /**
   * Add a rule that injects a payload into a specific parameter for all matching requests.
   */
  addPayloadInjectionRule(paramName: string, payload: string, urlPattern?: RegExp) {
    this.addRule({
      name: `Inject payload into param: ${paramName}`,
      match: (req) => {
        const urlMatch = urlPattern ? urlPattern.test(req.url) : true;
        return urlMatch && (req.url.includes(paramName) || (req.body ?? "").includes(paramName));
      },
      modify: (req) => {
        const url = new URL(req.url);
        if (url.searchParams.has(paramName)) {
          url.searchParams.set(paramName, payload);
          return { url: url.toString() };
        }
        if (req.body && req.body.includes(paramName)) {
          const params = new URLSearchParams(req.body);
          params.set(paramName, payload);
          return { body: params.toString() };
        }
        return {};
      },
    });
  }

  /**
   * Start polling the Burp proxy intercept queue and processing messages.
   * Runs until stop() is called or maxMessages is reached.
   */
  async start(opts: {
    maxMessages?: number;
    onIntercept?: (req: InterceptedRequest, action: string) => void;
  } = {}): Promise<void> {
    this.running = true;
    this.processedCount = 0;
    this.modifiedCount = 0;
    const maxMessages = opts.maxMessages ?? Infinity;

    log.info(`[Interceptor] Started — watching Burp proxy intercept queue...`);

    while (this.running && this.processedCount < maxMessages) {
      try {
        const messages = await this.client.getInterceptedMessages();

        for (const msg of messages) {
          if (!this.running || this.processedCount >= maxMessages) { break; }

          const rawReq = Buffer.from(msg.request, "base64").toString("utf-8");
          const parsed = this.parseRawRequest(rawReq, msg.url);

          let action = "forward";
          let modifiedRequest: string | undefined;

          for (const rule of this.rules) {
            if (rule.match(parsed)) {
              const modification = rule.modify(parsed);

              if (modification.drop) {
                action = "drop";
                break;
              }

              if (modification.url) { parsed.url = modification.url; }
              if (modification.headers) { Object.assign(parsed.headers, modification.headers); }
              if (modification.body !== undefined) { parsed.body = modification.body; }

              modifiedRequest = this.buildRawRequest(parsed);
              action = `modified by "${rule.name}"`;
              this.modifiedCount++;
            }
          }

          opts.onIntercept?.(parsed, action);

          if (action === "drop") {
            await this.client.dropInterceptedMessage(msg.messageId);
            log.info(`[Interceptor] Dropped: ${msg.method} ${msg.url}`);
          } else {
            await this.client.forwardInterceptedMessage(msg.messageId, modifiedRequest);
            if (modifiedRequest) {
              log.info(`[Interceptor] Modified + forwarded: ${msg.method} ${msg.url}`);
            }
          }

          this.processedCount++;
        }
      } catch (err) {
        log.warn(`[Interceptor] Poll error: ${(err as Error).message}`);
      }

      if (this.running) {
        await new Promise(r => setTimeout(r, this.pollInterval));
      }
    }

    log.info(`[Interceptor] Stopped. Processed: ${this.processedCount}, Modified: ${this.modifiedCount}`);
  }

  stop() {
    this.running = false;
    log.info(`[Interceptor] Stop requested.`);
  }

  getStats() {
    return {
      running: this.running,
      processed: this.processedCount,
      modified: this.modifiedCount,
      rules: this.rules.map(r => r.name),
    };
  }

  private parseRawRequest(raw: string, url: string): InterceptedRequest & { headers: Record<string, string> } {
    const lines = raw.split(/\r?\n/);
    const headers: Record<string, string> = {};
    let bodyStartIdx = -1;

    for (let i = 1; i < lines.length; i++) {
      if (lines[i]?.trim() === "") {
        bodyStartIdx = i + 1;
        break;
      }
      const colonIdx = lines[i]?.indexOf(":") ?? -1;
      if (colonIdx > 0) {
        const key = (lines[i] ?? "").slice(0, colonIdx).trim();
        const val = (lines[i] ?? "").slice(colonIdx + 1).trim();
        headers[key] = val;
      }
    }

    const body = bodyStartIdx !== -1 ? lines.slice(bodyStartIdx).join("\n").trim() || undefined : undefined;
    const firstLine = lines[0] ?? "";
    const [method] = firstLine.split(" ");

    return {
      messageId: "",
      url,
      method: method ?? "GET",
      headers,
      body,
    };
  }

  private buildRawRequest(req: { url: string; method: string; headers: Record<string, string>; body?: string }): string {
    const urlObj = new URL(req.url);
    const path = urlObj.pathname + urlObj.search;
    const lines: string[] = [`${req.method} ${path} HTTP/1.1`];

    for (const [k, v] of Object.entries(req.headers)) {
      lines.push(`${k}: ${v}`);
    }

    lines.push("");
    if (req.body) {
      lines.push(req.body);
    }

    return lines.join("\r\n");
  }
}
