import type { BurpClient } from "./client.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("burp/intruder");

export type IntruderAttackMode = "sniper" | "battering-ram" | "pitchfork" | "cluster-bomb";

export type IntruderPosition = {
  name: string;
  start: number;
  end: number;
};

export type IntruderResult = {
  payloads: Record<string, string>;
  statusCode: number;
  responseLength: number;
  responseTime: number;
  anomalyScore: number;
  flags: string[];
};

export type IntruderReport = {
  target: string;
  mode: IntruderAttackMode;
  totalRequests: number;
  baselineStatusCode: number;
  baselineLength: number;
  findings: IntruderResult[];
};

/**
 * BurpIntruder — Autonomous fuzzer with anomaly detection.
 * Equivalent to Burp Intruder with all 4 attack modes.
 * Detects anomalies by comparing responses to a baseline.
 */
export class BurpIntruder {
  constructor(private client: BurpClient) {}

  /**
   * Run an Intruder-style attack on a target URL.
   */
  async attack(params: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    positions: IntruderPosition[];
    payloadSets: string[][];
    mode?: IntruderAttackMode;
    concurrency?: number;
    maxRequests?: number;
  }): Promise<IntruderReport> {
    const mode = params.mode ?? "sniper";
    const method = params.method ?? "GET";
    const concurrency = params.concurrency ?? 4;
    const maxRequests = params.maxRequests ?? 1000;

    log.info(`[Intruder] Attack mode: ${mode} | Target: ${params.url}`);

    const baseline = await this.sendRequest(params.url, method, params.headers, params.body);
    log.info(`[Intruder] Baseline: HTTP ${baseline.statusCode}, ${baseline.responseLength}B, ${baseline.responseTime}ms`);

    const payloadCombos = this.buildPayloadCombos(params.positions, params.payloadSets, mode);
    const totalCombos = Math.min(payloadCombos.length, maxRequests);
    log.info(`[Intruder] Sending ${totalCombos} requests (${payloadCombos.length} total, cap ${maxRequests})...`);

    const allResults: IntruderResult[] = [];
    const chunks: typeof payloadCombos = [];

    for (let i = 0; i < totalCombos; i += concurrency) {
      chunks.push(payloadCombos.slice(i, i + concurrency));
    }

    let sent = 0;
    for (const chunk of chunks) {
      const batchResults = await Promise.allSettled(
        chunk.map(async (combo) => {
          const testBody = params.body
            ? this.injectPayloads(params.body, params.positions, combo)
            : undefined;
          const testUrl = this.injectIntoUrl(params.url, params.positions, combo);
          const result = await this.sendRequest(testUrl, method, params.headers, testBody);

          const flags = this.detectAnomalies(baseline, result, combo);
          const anomalyScore = this.scoreAnomaly(baseline, result);
          sent++;

          if (sent % 50 === 0) {
            log.info(`[Intruder] Progress: ${sent}/${totalCombos}`);
          }

          return {
            payloads: Object.fromEntries(params.positions.map((p, i) => [p.name, combo[i] ?? ""])),
            statusCode: result.statusCode,
            responseLength: result.responseLength,
            responseTime: result.responseTime,
            anomalyScore,
            flags,
          } satisfies IntruderResult;
        }),
      );

      for (const r of batchResults) {
        if (r.status === "fulfilled" && (r.value.flags.length > 0 || r.value.anomalyScore > 0.4)) {
          allResults.push(r.value);
        }
      }
    }

    allResults.sort((a, b) => b.anomalyScore - a.anomalyScore);

    log.info(`[Intruder] Done. ${allResults.length} anomalous responses found.`);
    return {
      target: params.url,
      mode,
      totalRequests: sent,
      baselineStatusCode: baseline.statusCode,
      baselineLength: baseline.responseLength,
      findings: allResults,
    };
  }

  private buildPayloadCombos(
    positions: IntruderPosition[],
    payloadSets: string[][],
    mode: IntruderAttackMode,
  ): string[][] {
    if (mode === "sniper") {
      const result: string[][] = [];
      const defaultPayloads = payloadSets[0] ?? [];
      for (let posIdx = 0; posIdx < positions.length; posIdx++) {
        for (const payload of defaultPayloads) {
          const combo = positions.map((_, i) => (i === posIdx ? payload : ""));
          result.push(combo);
        }
      }
      return result;
    }

    if (mode === "battering-ram") {
      const defaultPayloads = payloadSets[0] ?? [];
      return defaultPayloads.map(p => positions.map(() => p));
    }

    if (mode === "pitchfork") {
      const len = Math.min(...payloadSets.map(ps => ps.length));
      return Array.from({ length: len }, (_, i) =>
        positions.map((_, posIdx) => payloadSets[posIdx]?.[i] ?? ""),
      );
    }

    if (mode === "cluster-bomb") {
      return this.cartesianProduct(payloadSets.map((ps, i) => ps.length > 0 ? ps : [positions[i]?.name ?? ""]));
    }

    return [];
  }

  private cartesianProduct(arrays: string[][]): string[][] {
    return arrays.reduce<string[][]>(
      (acc, arr) => acc.flatMap(combo => arr.map(item => [...combo, item])),
      [[]],
    );
  }

  private injectPayloads(template: string, positions: IntruderPosition[], payloads: string[]): string {
    let result = template;
    for (let i = positions.length - 1; i >= 0; i--) {
      const pos = positions[i];
      const payload = payloads[i] ?? "";
      if (pos) {
        result = result.slice(0, pos.start) + payload + result.slice(pos.end);
      }
    }
    return result;
  }

  private injectIntoUrl(url: string, positions: IntruderPosition[], payloads: string[]): string {
    let modified = url;
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const payload = payloads[i] ?? "";
      if (pos && modified.includes(`§${pos.name}§`)) {
        modified = modified.replace(`§${pos.name}§`, encodeURIComponent(payload));
      }
    }
    return modified;
  }

  private async sendRequest(
    url: string,
    method: string,
    headers?: Record<string, string>,
    body?: string,
  ): Promise<{ statusCode: number; responseLength: number; responseTime: number; responseBody: string }> {
    const start = Date.now();
    const result = await this.client.fireRequest({ url, method, headers, body });
    const elapsed = Date.now() - start;
    const responseBody = result.responseBody ?? Buffer.from(result.response ?? "", "base64").toString("utf-8");
    return {
      statusCode: result.statusCode,
      responseLength: result.responseLength ?? responseBody.length,
      responseTime: elapsed,
      responseBody,
    };
  }

  private detectAnomalies(
    baseline: { statusCode: number; responseLength: number; responseTime: number },
    current: { statusCode: number; responseLength: number; responseTime: number; responseBody: string },
    payloads: string[],
  ): string[] {
    const flags: string[] = [];

    if (current.statusCode !== baseline.statusCode) {
      flags.push(`Status changed: ${baseline.statusCode} → ${current.statusCode}`);
    }

    const lenDiff = Math.abs(current.responseLength - baseline.responseLength);
    if (lenDiff > 500 || (baseline.responseLength > 0 && lenDiff / baseline.responseLength > 0.3)) {
      flags.push(`Response length anomaly: ${baseline.responseLength}B → ${current.responseLength}B (Δ${lenDiff}B)`);
    }

    if (current.responseTime > baseline.responseTime + 2500) {
      flags.push(`Time-based anomaly: ${current.responseTime}ms (baseline: ${baseline.responseTime}ms)`);
    }

    if (current.statusCode >= 500) {
      flags.push(`Server error triggered (HTTP ${current.statusCode})`);
    }

    for (const payload of payloads) {
      if (payload && current.responseBody.includes(payload)) {
        flags.push(`Payload reflected: "${payload.slice(0, 40)}"`);
      }
    }

    const sqlErrors = ["sql syntax", "ora-", "pg_query", "mysql_fetch", "sqlite3"];
    for (const sig of sqlErrors) {
      if (current.responseBody.toLowerCase().includes(sig)) {
        flags.push(`SQL error signature: "${sig}"`);
        break;
      }
    }

    if (current.responseBody.includes("root:x:") || current.responseBody.includes("[boot loader]")) {
      flags.push(`File disclosure detected (path traversal)`);
    }

    return flags;
  }

  private scoreAnomaly(
    baseline: { statusCode: number; responseLength: number; responseTime: number },
    current: { statusCode: number; responseLength: number; responseTime: number },
  ): number {
    let score = 0;

    if (current.statusCode !== baseline.statusCode) { score += 0.3; }
    if (current.statusCode >= 500) { score += 0.3; }
    if (current.statusCode === 200 && baseline.statusCode !== 200) { score += 0.2; }

    const lenRatio = baseline.responseLength > 0
      ? Math.abs(current.responseLength - baseline.responseLength) / baseline.responseLength
      : 0;
    score += Math.min(lenRatio * 0.4, 0.4);

    if (current.responseTime > baseline.responseTime + 2500) { score += 0.3; }

    return Math.min(score, 1.0);
  }
}
