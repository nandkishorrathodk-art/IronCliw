/**
 * IronCliw Voice Output — Premium TTS with Windows Auto-Play
 *
 * Uses existing src/tts/ infrastructure for synthesis, then plays audio
 * directly on Windows with zero external dependencies (PowerShell Media API).
 *
 * Provider priority (auto-selected):
 *   1. ElevenLabs  (ELEVENLABS_API_KEY env)  — most natural, human-like
 *   2. OpenAI TTS  (OPENAI_API_KEY env)      — fast, high quality
 *   3. Edge TTS    (no API key needed)       — free, good quality, offline-capable
 *
 * Usage:
 *   await speakText("Hello! I am IronCliw.", config);
 */

import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type TTSProvider = "elevenlabs" | "openai-tts" | "edge-tts";

export interface VoiceOutputConfig {
  /** Override auto-detected provider. */
  provider?: TTSProvider;
  /** ElevenLabs voice ID. Defaults to a warm, natural voice. */
  elevenLabsVoiceId?: string;
  /** ElevenLabs model. Default: "eleven_turbo_v2_5" (lowest latency). */
  elevenLabsModel?: string;
  /** OpenAI TTS voice. Default: "nova" (clear & warm). */
  openaiVoice?: string;
  /** Edge TTS voice. Default: "en-US-JennyNeural" (natural female). */
  edgeVoice?: string;
  /** Speed multiplier 0.5–2.0. Default: 1.0. */
  speed?: number;
  /** Timeout in ms. Default: 30 000. */
  timeoutMs?: number;
  /** If false, skips audio playback (useful for testing). Default: true. */
  autoPlay?: boolean;
  /** Max characters per TTS chunk. Long texts are split at sentence boundaries. Default: 4000. */
  maxChunkChars?: number;
}

/* ─────────────────────────────────────────────────────────────
   Best-available provider detection
   ───────────────────────────────────────────────────────────── */

function detectTTSProvider(): TTSProvider {
  if (process.env.ELEVENLABS_API_KEY?.trim()) {return "elevenlabs";}
  if (process.env.OPENAI_API_KEY?.trim()) {return "openai-tts";}
  return "edge-tts"; // always available, no key needed
}

/* ─────────────────────────────────────────────────────────────
   Synthesis functions
   ───────────────────────────────────────────────────────────── */

async function synthesizeWithElevenLabs(text: string, config: VoiceOutputConfig): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY!.trim();
  // "Rachel" — warm, natural, professional voice
  const voiceId = config.elevenLabsVoiceId ?? "21m00Tcm4TlvDq8ikWAM";
  // eleven_turbo_v2_5 = lowest latency (~300ms), still high quality
  const modelId = config.elevenLabsModel ?? "eleven_turbo_v2_5";
  const speed = Math.min(2.0, Math.max(0.5, config.speed ?? 1.0));
  const timeoutMs = config.timeoutMs ?? 30_000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.85,
            style: 0.3,
            use_speaker_boost: true,
            speed,
          },
        }),
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      throw new Error(`ElevenLabs TTS error: ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

async function synthesizeWithOpenAI(text: string, config: VoiceOutputConfig): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY!.trim();
  const voice = config.openaiVoice ?? "nova"; // clear, warm, professional
  const speed = Math.min(4.0, Math.max(0.25, config.speed ?? 1.0));
  const timeoutMs = config.timeoutMs ?? 30_000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        input: text,
        voice,
        response_format: "mp3",
        speed,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`OpenAI TTS error: ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

async function synthesizeWithEdgeTTS(text: string, config: VoiceOutputConfig): Promise<Buffer> {
  const { EdgeTTS } = await import("node-edge-tts");
  const voice = config.edgeVoice ?? "en-US-JennyNeural";
  const rate = config.speed != null ? `${Math.round((config.speed - 1) * 100)}%` : "+0%";

  const dir = join(tmpdir(), `ironcliw-edge-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  const outPath = join(dir, "output.mp3");

  try {
    const tts = new EdgeTTS({ voice, rate, outputFormat: "audio-24khz-48kbitrate-mono-mp3" });
    await tts.ttsPromise(text, outPath);
    const { readFileSync } = await import("node:fs");
    return readFileSync(outPath);
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

/* ─────────────────────────────────────────────────────────────
   Windows audio playback (zero external dependency)
   ───────────────────────────────────────────────────────────── */

async function playAudioOnWindows(audioBuffer: Buffer, format: "mp3" | "wav" = "mp3"): Promise<void> {
  const dir = join(tmpdir(), `ironcliw-play-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  const audioPath = join(dir, `output.${format}`);
  writeFileSync(audioPath, audioBuffer);

  return new Promise((resolve, reject) => {
    // Use Windows Media.SoundPlayer (WAV) or wmplayer COM for mp3
    const psScript =
      format === "wav"
        ? `
          $player = New-Object System.Media.SoundPlayer('${audioPath.replace(/\\/g, "\\\\")}')
          $player.PlaySync()
          $player.Dispose()
          `
        : `
          Add-Type -AssemblyName PresentationCore
          $player = New-Object System.Windows.Media.MediaPlayer
          $player.Open([System.Uri]::new('${audioPath.replace(/\\/g, "\\\\")}'))
          $player.Play()
          Start-Sleep -Seconds ([Math]::Ceiling($player.NaturalDuration.TimeSpan.TotalSeconds + 1))
          $player.Close()
          `;

    const ps = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", psScript.trim()],
      { stdio: "pipe" },
    );

    ps.on("close", () => {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // ignore
      }
      resolve();
    });
    ps.on("error", (err) => {
      reject(new Error(`Audio playback failed: ${err.message}`));
    });
  });
}

/* ─────────────────────────────────────────────────────────────
   Text chunking — split long text at sentence boundaries
   ───────────────────────────────────────────────────────────── */

function splitTextIntoChunks(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) {return [text];}

  const chunks: string[] = [];
  const sentenceEnds = /(?<=[.!?])\s+/g;
  const sentences = text.split(sentenceEnds);

  let current = "";
  for (const sentence of sentences) {
    if (current.length + sentence.length + 1 > maxChars) {
      if (current) {
        chunks.push(current.trim());
        current = "";
      }
      if (sentence.length > maxChars) {
        for (let i = 0; i < sentence.length; i += maxChars) {
          chunks.push(sentence.slice(i, i + maxChars).trim());
        }
      } else {
        current = sentence;
      }
    } else {
      current += (current ? " " : "") + sentence;
    }
  }
  if (current.trim()) {chunks.push(current.trim());}
  return chunks;
}

/* ─────────────────────────────────────────────────────────────
   Public API
   ───────────────────────────────────────────────────────────── */

export interface SpeakResult {
  provider: TTSProvider;
  durationMs: number;
  bytesGenerated: number;
  chunks: number;
}

/**
 * Synthesize `text` to speech and play it on Windows speakers.
 * Long texts are automatically chunked at sentence boundaries.
 *
 * @example
 * await speakText("Task complete! Found 3 vulnerabilities.", {});
 * await speakText("Hello, I am IronCliw.", { provider: 'elevenlabs', speed: 1.1 });
 */
export async function speakText(text: string, config: VoiceOutputConfig = {}): Promise<SpeakResult> {
  if (!text.trim()) {
    return { provider: "edge-tts", durationMs: 0, bytesGenerated: 0, chunks: 0 };
  }

  const provider = config.provider ?? detectTTSProvider();
  const maxChunkChars = config.maxChunkChars ?? 4000;
  const textChunks = splitTextIntoChunks(text.trim(), maxChunkChars);
  const t0 = Date.now();
  let totalBytes = 0;

  for (const chunk of textChunks) {
    let audioBuffer: Buffer;

    switch (provider) {
      case "elevenlabs":
        audioBuffer = await synthesizeWithElevenLabs(chunk, config);
        break;
      case "openai-tts":
        audioBuffer = await synthesizeWithOpenAI(chunk, config);
        break;
      case "edge-tts":
        audioBuffer = await synthesizeWithEdgeTTS(chunk, config);
        break;
      default:
        throw new Error(`Unknown TTS provider: ${String(provider)}`);
    }

    totalBytes += audioBuffer.byteLength;

    if (config.autoPlay !== false && process.platform === "win32") {
      await playAudioOnWindows(audioBuffer, "mp3");
    }
  }

  return {
    provider,
    durationMs: Date.now() - t0,
    bytesGenerated: totalBytes,
    chunks: textChunks.length,
  };
}

/**
 * Returns which TTS provider will be used given current environment.
 */
export function getAvailableTTSProvider(): TTSProvider {
  return detectTTSProvider();
}

/**
 * List of beautiful voices by provider for the user to choose from.
 */
export const RECOMMENDED_VOICES = {
  elevenlabs: [
    { name: "Rachel (Warm, Professional)", id: "21m00Tcm4TlvDq8ikWAM" },
    { name: "Adam (Deep, Authoritative)", id: "pNInz6obpgDQGcFmaJgB" },
    { name: "Domi (Strong, Clear)", id: "AZnzlk1XvdvUeBnXmlld" },
    { name: "Elli (Soft, Friendly)", id: "MF3mGyEYCl7XYWbV9V6O" },
    { name: "Josh (Natural, Casual)", id: "TxGEqnHWrfWFTfGW9XjX" },
  ],
  openai: ["nova", "alloy", "echo", "fable", "onyx", "shimmer", "sage", "coral"],
  edge: [
    "en-US-JennyNeural",
    "en-US-GuyNeural",
    "en-US-AriaNeural",
    "en-GB-SoniaNeural",
    "en-IN-NeerjaNeural",
  ],
} as const;
