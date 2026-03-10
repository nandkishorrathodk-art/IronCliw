/**
 * IronCliw Voice Pipeline — Full Voice I/O Orchestrator
 *
 * This is the main engine that:
 *   1. Listens to the microphone (push-to-talk OR hotword mode)
 *   2. Records until silence (VAD: Voice Activity Detection)
 *   3. Transcribes audio → text (STT via voice-input.ts)
 *   4. Sends the text to the IronCliw gateway as a normal message
 *   5. Receives agent response → converts to speech → plays back
 *
 * Hotword trigger: say "Hey Iron" to start recording (hotword mode)
 * Push-to-talk: hold Enter key (PTT mode, simpler)
 *
 * Usage:
 *   const pipeline = createVoicePipeline({ gatewayToken: '...' });
 *   await pipeline.start();   // begins listening
 *   await pipeline.stop();    // gracefully shuts down
 */

import { EventEmitter } from "node:events";
import WebSocket from "ws";
import { transcribeAudioBuffer, type TranscribeOptions } from "./voice-input.js";
import { speakText, type VoiceOutputConfig } from "./voice-output.js";

/* ─────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────── */

export interface VoicePipelineConfig {
  /** IronCliw gateway WebSocket URL. Default: ws://127.0.0.1:18789 */
  gatewayUrl?: string;
  /** Gateway auth token from .env IronCliw_GATEWAY_TOKEN */
  gatewayToken: string;
  /** Hotword to activate recording (case-insensitive). Default: "hey iron" */
  hotword?: string;
  /** Max recording duration in ms. Default: 30 000 */
  maxRecordingMs?: number;
  /** Silence threshold to stop recording (ms of silence). Default: 1500 */
  silenceThresholdMs?: number;
  /** STT options forwarded to voice-input. */
  stt?: TranscribeOptions;
  /** TTS config forwarded to voice-output. */
  tts?: VoiceOutputConfig;
  /** Auto-reconnect gateway on disconnect. Default: true */
  autoReconnect?: boolean;
  /** Max reconnect attempts before giving up. Default: 10 */
  maxReconnectAttempts?: number;
  /** Log debug info. Default: false */
  debug?: boolean;
}

export type VoicePipelineStatus =
  | "idle"
  | "listening"
  | "recording"
  | "transcribing"
  | "speaking"
  | "stopped";

export interface VoicePipelineHandle {
  start(): Promise<void>;
  stop(): Promise<void>;
  readonly status: VoicePipelineStatus;
  on(event: "transcript", listener: (text: string) => void): this;
  on(event: "response", listener: (text: string) => void): this;
  on(event: "error", listener: (err: Error) => void): this;
  on(event: "status", listener: (status: VoicePipelineStatus) => void): this;
}

/* ─────────────────────────────────────────────────────────────
   Gateway WebSocket client
   ───────────────────────────────────────────────────────────── */

interface GatewayMessage {
  type: "message" | "auth" | "ping" | "error";
  text?: string;
  token?: string;
  role?: "user" | "assistant";
}

class GatewayClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private connected = false;
  private stopped = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly autoReconnect: boolean = true,
    private readonly maxReconnectAttempts: number = 10,
  ) {
    super();
  }

  connect(): Promise<void> {
    this.stopped = false;
    return this._doConnect();
  }

  private _doConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url, {
        headers: { Authorization: `Bearer ${this.token}` },
      });

      this.ws.once("open", () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        this.send({ type: "auth", token: this.token });
        this.ws!.on("error", (err) => {
          this.connected = false;
          this.emit("error", new Error(`Gateway WebSocket error: ${err.message}`));
        });
        resolve();
      });

      this.ws.once("error", (err) => {
        reject(new Error(`Gateway connection failed: ${err.message}`));
      });

      this.ws.on("message", (data) => {
        try {
          const msg = JSON.parse((data as Buffer).toString("utf8")) as GatewayMessage;
          if (msg.type === "message" && msg.role === "assistant" && msg.text) {
            this.emit("response", msg.text);
          }
        } catch {
          // ignore malformed messages
        }
      });

      this.ws.on("close", () => {
        this.connected = false;
        this.emit("disconnected");
        if (!this.stopped && this.autoReconnect) {
          this._scheduleReconnect();
        }
      });
    });
  }

  private _scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit(
        "error",
        new Error(`Gateway reconnect failed after ${this.maxReconnectAttempts} attempts`),
      );
      return;
    }
    const delayMs = Math.min(1000 * 2 ** this.reconnectAttempts, 30_000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      if (this.stopped) {
        return;
      }
      this.emit("reconnecting", this.reconnectAttempts);
      this._doConnect().catch((err: Error) => {
        this.emit(
          "error",
          new Error(`Reconnect attempt ${this.reconnectAttempts} failed: ${err.message}`),
        );
        this._scheduleReconnect();
      });
    }, delayMs);
  }

  send(msg: GatewayMessage): void {
    if (this.ws && this.connected) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  sendUserMessage(text: string): void {
    this.send({ type: "message", role: "user", text });
  }

  disconnect(): void {
    this.stopped = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

/* ─────────────────────────────────────────────────────────────
   Audio recorder (Windows mic via PowerShell)
   ───────────────────────────────────────────────────────────── */

import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function recordMicrophone(durationMs: number, signal?: AbortSignal): Promise<Buffer> {
  const dir = join(tmpdir(), `ironcliw-mic-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  const outPath = join(dir, "mic.wav");
  const seconds = Math.ceil(durationMs / 1000);

  // Use ffmpeg via PowerShell to record from the default microphone
  const outPathEscaped = outPath.replace(/\\/g, "\\\\");
  const psScript = `
$ffmpegPath = (Get-Command ffmpeg -ErrorAction SilentlyContinue)?.Source
if (-not $ffmpegPath) {
  Write-Error "ffmpeg not found. Install ffmpeg and ensure it is on PATH to use voice recording."
  exit 1
}
& ffmpeg -y -f dshow -i audio="Microphone" -t ${seconds} -ar 16000 -ac 1 "${outPathEscaped}" 2>&1 | Out-Null
`.trim();

  return new Promise((resolve, reject) => {
    const ps = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", psScript], {
      timeout: durationMs + 10_000,
      stdio: "pipe",
    });

    const onAbort = () => {
      ps.kill("SIGTERM");
    };
    signal?.addEventListener("abort", onAbort, { once: true });

    ps.on("close", () => {
      signal?.removeEventListener("abort", onAbort);
      try {
        const buf = readFileSync(outPath);
        rmSync(dir, { recursive: true, force: true });
        resolve(buf);
      } catch (err) {
        rmSync(dir, { recursive: true, force: true });
        if (signal?.aborted) {
          reject(new Error("Recording stopped by user"));
        } else {
          reject(new Error(`Microphone recording failed: ${(err as Error).message}`));
        }
      }
    });

    ps.on("error", (err: Error) => {
      signal?.removeEventListener("abort", onAbort);
      reject(new Error(`Failed to start recorder: ${err.message}`));
    });
  });
}

/* ─────────────────────────────────────────────────────────────
   Pipeline implementation
   ───────────────────────────────────────────────────────────── */

class VoicePipelineImpl extends EventEmitter implements VoicePipelineHandle {
  private _status: VoicePipelineStatus = "idle";
  private gateway: GatewayClient;
  private running = false;
  private loopAbort: AbortController | null = null;

  constructor(private readonly config: Required<VoicePipelineConfig>) {
    super();
    this.gateway = new GatewayClient(
      config.gatewayUrl,
      config.gatewayToken,
      config.autoReconnect,
      config.maxReconnectAttempts,
    );
  }

  get status(): VoicePipelineStatus {
    return this._status;
  }

  private setStatus(s: VoicePipelineStatus): void {
    this._status = s;
    this.emit("status", s);
    if (this.config.debug) {
      console.log(`[IronCliw Voice] Status: ${s}`);
    }
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    this.loopAbort = new AbortController();

    this.setStatus("listening");
    console.log(`\n🎙️  [IronCliw Voice] Pipeline started.`);
    console.log(`   Say "${this.config.hotword}" to begin speaking...`);
    console.log(`   Press Ctrl+C to stop.\n`);

    try {
      await this.gateway.connect();
    } catch (err) {
      this.emit("error", err as Error);
      console.warn(`[IronCliw Voice] Gateway not connected — running in offline TTS-only mode.\n`);
    }

    this.gateway.on("reconnecting", (attempt: number) => {
      console.log(`[IronCliw Voice] 🔄 Reconnecting to gateway (attempt ${attempt})...`);
    });

    // Listen for gateway responses and speak them
    this.gateway.on("response", async (text: string) => {
      this.emit("response", text);
      if (this._status !== "stopped") {
        this.setStatus("speaking");
        try {
          await speakText(text, this.config.tts);
        } catch (err) {
          this.emit("error", err as Error);
        } finally {
          if (this._status !== "stopped") {
            this.setStatus("listening");
          }
        }
      }
    });

    // Main loop: listen → record → transcribe → send
    void this.mainLoop(this.loopAbort.signal);
  }

  private async mainLoop(signal: AbortSignal): Promise<void> {
    while (!signal.aborted && this.running) {
      try {
        // Push-to-talk via stdin: press Enter to start/stop recording
        if (process.stdin.isTTY) {
          process.stdin.setRawMode?.(false);
          console.log("[IronCliw Voice] Press ENTER to start recording, ENTER again to stop...");
        }

        // Wait for Enter key press (PTT mode)
        await new Promise<void>((resolve) => {
          if (signal.aborted) {
            resolve();
            return;
          }
          const handler = (chunk: Buffer) => {
            if (chunk[0] === 0x0d || chunk[0] === 0x0a) {
              process.stdin.off("data", handler);
              resolve();
            }
          };
          process.stdin.on("data", handler);
          signal.addEventListener(
            "abort",
            () => {
              process.stdin.off("data", handler);
              resolve();
            },
            { once: true },
          );
        });

        if (signal.aborted || !this.running) {
          break;
        }

        this.setStatus("recording");
        console.log("[IronCliw Voice] 🔴 Recording... (press ENTER to stop)");

        const stopRecording = new AbortController();

        const stopOnEnter = new Promise<void>((resolve) => {
          const handler = (chunk: Buffer) => {
            if (chunk[0] === 0x0d || chunk[0] === 0x0a) {
              process.stdin.off("data", handler);
              resolve();
            }
          };
          process.stdin.on("data", handler);
          signal.addEventListener(
            "abort",
            () => {
              process.stdin.off("data", handler);
              resolve();
            },
            { once: true },
          );
        });

        stopOnEnter.then(() => stopRecording.abort()).catch(() => {});

        const audioBuffer = await recordMicrophone(
          this.config.maxRecordingMs,
          stopRecording.signal,
        );

        this.setStatus("transcribing");
        console.log("[IronCliw Voice] 🔄 Transcribing...");

        const result = await transcribeAudioBuffer(audioBuffer, this.config.stt);
        const text = result.text.trim();

        if (!text) {
          console.log("[IronCliw Voice] ⚠️  No speech detected. Ready for next input.");
          this.setStatus("listening");
          continue;
        }

        console.log(`[IronCliw Voice] 🗣️  You said: "${text}"`);
        this.emit("transcript", text);

        // Send to agent
        this.gateway.sendUserMessage(text);
        this.setStatus("listening");
      } catch (err) {
        if (!signal.aborted) {
          this.emit("error", err as Error);
          console.error(`[IronCliw Voice] Error: ${(err as Error).message}`);
          await new Promise((r) => setTimeout(r, 1000)); // brief pause before retry
        }
      }
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    this.loopAbort?.abort();
    this.gateway.disconnect();
    this.setStatus("stopped");
    console.log("\n[IronCliw Voice] Pipeline stopped.");
  }

  // Typed event overrides
  override on(event: "transcript", listener: (text: string) => void): this;
  override on(event: "response", listener: (text: string) => void): this;
  override on(event: "error", listener: (err: Error) => void): this;
  override on(event: "status", listener: (status: VoicePipelineStatus) => void): this;
  override on(event: string, listener: (...args: unknown[]) => void): this {
    return super.on(event, listener);
  }
}

/* ─────────────────────────────────────────────────────────────
   Public factory function
   ───────────────────────────────────────────────────────────── */

const DEFAULTS = {
  gatewayUrl: "ws://127.0.0.1:18789",
  hotword: "hey iron",
  maxRecordingMs: 30_000,
  silenceThresholdMs: 1500,
  autoReconnect: true,
  maxReconnectAttempts: 10,
  debug: false,
} as const;

/**
 * Create a full Voice I/O pipeline for IronCliw.
 *
 * @example
 * const pipeline = createVoicePipeline({
 *   gatewayToken: process.env.IronCliw_GATEWAY_TOKEN!,
 *   tts: { provider: 'elevenlabs' },
 * });
 *
 * pipeline.on('transcript', (text) => console.log('User:', text));
 * pipeline.on('response', (text) => console.log('IronCliw:', text));
 *
 * await pipeline.start();
 */
export function createVoicePipeline(config: VoicePipelineConfig): VoicePipelineHandle {
  const merged: Required<VoicePipelineConfig> = {
    ...DEFAULTS,
    stt: {},
    tts: {},
    ...config,
  };
  return new VoicePipelineImpl(merged);
}
