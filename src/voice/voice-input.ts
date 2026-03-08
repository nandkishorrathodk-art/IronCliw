/**
 * IronCliw Voice Input — Speech-to-Text Engine
 *
 * Providers (in priority order):
 *   1. Deepgram Nova-2  (DEEPGRAM_API_KEY env)
 *   2. OpenAI Whisper   (OPENAI_API_KEY env)
 *   3. Windows SAPI     (zero-dependency PowerShell fallback — offline)
 *
 * Usage:
 *   const text = await transcribeAudioBuffer(wavBuffer, { lang: 'en' });
 */

import { execSync, spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type VoiceInputProvider = "deepgram" | "openai-whisper" | "windows-sapi";

export interface TranscribeOptions {
  /** BCP-47 language code, e.g. "en-US". Defaults to "en". */
  lang?: string;
  /** Force a specific provider instead of auto-detecting. */
  provider?: VoiceInputProvider;
  /** Timeout in milliseconds. Default: 30 000 ms. */
  timeoutMs?: number;
}

export interface TranscribeResult {
  text: string;
  provider: VoiceInputProvider;
  durationMs: number;
  confidence?: number;
}

/* ─────────────────────────────────────────────────────────────
   Internal helpers
   ───────────────────────────────────────────────────────────── */

function getDeepgramKey(): string | undefined {
  return process.env.DEEPGRAM_API_KEY?.trim() || undefined;
}

function getOpenAIKey(): string | undefined {
  return process.env.OPENAI_API_KEY?.trim() || undefined;
}

/** Write buffer to a temp WAV and return the path. Caller is responsible for cleanup. */
function writeTempWav(buffer: Buffer): string {
  const dir = join(tmpdir(), `IronCliw-voice-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "input.wav");
  writeFileSync(path, buffer);
  return path;
}

/* ─────────────────────────────────────────────────────────────
   Provider 1 — Deepgram Nova-2
   ───────────────────────────────────────────────────────────── */

async function transcribeWithDeepgram(
  buffer: Buffer,
  opts: TranscribeOptions,
): Promise<TranscribeResult> {
  const apiKey = getDeepgramKey()!;
  const lang = opts.lang ?? "en";
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const t0 = Date.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = new URL("https://api.deepgram.com/v1/listen");
    url.searchParams.set("model", "nova-2");
    url.searchParams.set("language", lang);
    url.searchParams.set("punctuate", "true");
    url.searchParams.set("smart_format", "true");

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "audio/wav",
      },
      body: buffer,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Deepgram API error: ${response.status} ${response.statusText}`);
    }

    const json = (await response.json()) as {
      results?: {
        channels?: Array<{
          alternatives?: Array<{ transcript?: string; confidence?: number }>;
        }>;
      };
    };

    const alt = json.results?.channels?.[0]?.alternatives?.[0];
    const text = alt?.transcript?.trim() ?? "";
    if (!text) {
      throw new Error("Deepgram returned empty transcript");
    }

    return {
      text,
      provider: "deepgram",
      durationMs: Date.now() - t0,
      confidence: alt?.confidence,
    };
  } finally {
    clearTimeout(timer);
  }
}

/* ─────────────────────────────────────────────────────────────
   Provider 2 — OpenAI Whisper
   ───────────────────────────────────────────────────────────── */

async function transcribeWithWhisper(
  buffer: Buffer,
  opts: TranscribeOptions,
): Promise<TranscribeResult> {
  const apiKey = getOpenAIKey()!;
  const lang = (opts.lang ?? "en").split("-")[0]; // Whisper uses 2-char code
  const timeoutMs = opts.timeoutMs ?? 60_000;
  const t0 = Date.now();

  const tmpPath = writeTempWav(buffer);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Build multipart form data
    const { Blob } = await import("node:buffer");
    const wavBlob = new Blob([buffer], { type: "audio/wav" });

    const formData = new FormData();
    formData.append("file", wavBlob as Blob, "audio.wav");
    formData.append("model", "whisper-1");
    formData.append("language", lang);
    formData.append("response_format", "verbose_json");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Whisper API error: ${response.status} ${response.statusText}`);
    }

    const json = (await response.json()) as { text?: string };
    const text = json.text?.trim() ?? "";
    if (!text) {
      throw new Error("Whisper returned empty transcript");
    }

    return {
      text,
      provider: "openai-whisper",
      durationMs: Date.now() - t0,
    };
  } finally {
    clearTimeout(timer);
    try {
      rmSync(tmpPath, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}

/* ─────────────────────────────────────────────────────────────
   Provider 3 — Windows SAPI (offline, zero-dependency)
   ───────────────────────────────────────────────────────────── */

async function transcribeWithWindowsSAPI(
  buffer: Buffer,
  opts: TranscribeOptions,
): Promise<TranscribeResult> {
  const tmpPath = writeTempWav(buffer);
  const t0 = Date.now();

  // PowerShell script that uses Windows Speech Recognition COM API
  const psScript = `
Add-Type -AssemblyName System.Speech
$recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine
$recognizer.LoadGrammar((New-Object System.Speech.Recognition.DictationGrammar))
$recognizer.SetInputToWaveFile('${tmpPath.replace(/\\/g, "\\\\")}')
try {
  $result = $recognizer.Recognize()
  if ($result) { Write-Output $result.Text } else { Write-Output "" }
} catch {
  Write-Output ""
} finally {
  $recognizer.Dispose()
}
`.trim();

  return new Promise((resolve, reject) => {
    const ps = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", psScript], {
      timeout: opts.timeoutMs ?? 30_000,
    });

    let output = "";
    let errorOutput = "";

    ps.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    ps.stderr.on("data", (chunk: Buffer) => {
      errorOutput += chunk.toString();
    });

    ps.on("close", (code) => {
      try {
        rmSync(tmpPath, { recursive: true, force: true });
      } catch {
        // ignore
      }

      const text = output.trim();
      if (code !== 0 || (!text && errorOutput)) {
        reject(new Error(`Windows SAPI error: ${errorOutput.trim() || `exit code ${code}`}`));
        return;
      }

      resolve({
        text,
        provider: "windows-sapi",
        durationMs: Date.now() - t0,
      });
    });

    ps.on("error", (err) => {
      reject(new Error(`Failed to launch PowerShell for SAPI: ${err.message}`));
    });
  });
}

/* ─────────────────────────────────────────────────────────────
   Auto-detect best available provider (cached after first call)
   ───────────────────────────────────────────────────────────── */

let _cachedProvider: VoiceInputProvider | null = null;

function detectBestProvider(): VoiceInputProvider {
  if (_cachedProvider) {return _cachedProvider;}

  if (getDeepgramKey()) {
    _cachedProvider = "deepgram";
    return _cachedProvider;
  }
  if (getOpenAIKey()) {
    _cachedProvider = "openai-whisper";
    return _cachedProvider;
  }
  if (process.platform === "win32") {
    try {
      execSync("powershell.exe -Command \"[System.Speech.Recognition.SpeechRecognitionEngine]\"", {
        timeout: 3000,
        stdio: "pipe",
      });
      _cachedProvider = "windows-sapi";
      return _cachedProvider;
    } catch {
      // SAPI not available
    }
  }
  throw new Error(
    "No STT provider available. Set DEEPGRAM_API_KEY or OPENAI_API_KEY in your .env file.",
  );
}

/** Clear the cached provider (useful when API keys change at runtime). */
export function clearProviderCache(): void {
  _cachedProvider = null;
}

/* ─────────────────────────────────────────────────────────────
   Public API
   ───────────────────────────────────────────────────────────── */

/**
 * Transcribe an audio buffer (WAV format) to text.
 *
 * Provider selection order: Deepgram → Whisper → Windows SAPI
 *
 * @example
 * const result = await transcribeAudioBuffer(wavBuffer, { lang: 'en-US' });
 * console.log(result.text); // "Hey Iron, what's the weather today?"
 */
export async function transcribeAudioBuffer(
  buffer: Buffer,
  opts: TranscribeOptions = {},
): Promise<TranscribeResult> {
  const provider = opts.provider ?? detectBestProvider();

  switch (provider) {
    case "deepgram":
      return transcribeWithDeepgram(buffer, opts);
    case "openai-whisper":
      return transcribeWithWhisper(buffer, opts);
    case "windows-sapi":
      return transcribeWithWindowsSAPI(buffer, opts);
    default:
      throw new Error(`Unknown STT provider: ${String(provider)}`);
  }
}

/**
 * Returns which STT provider will be used given current environment.
 */
export function getAvailableSTTProvider(): VoiceInputProvider | null {
  try {
    return detectBestProvider();
  } catch {
    return null;
  }
}
