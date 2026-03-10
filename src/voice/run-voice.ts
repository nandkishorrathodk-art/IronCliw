#!/usr/bin/env node
/**
 * IronCliw Voice Runner — Standalone voice pipeline launcher
 *
 * Run this to start the full Voice I/O experience:
 *   node --import tsx src/voice/run-voice.ts
 *
 * Or after build:
 *   node dist/voice/run-voice.js
 *
 * Required env vars:
 *   IronCliw_GATEWAY_TOKEN  — your gateway auth token
 *
 * Optional env vars (improves quality):
 *   DEEPGRAM_API_KEY        — best STT (Deepgram Nova-2)
 *   ELEVENLABS_API_KEY      — best TTS (ElevenLabs Turbo)
 *   OPENAI_API_KEY          — fallback for both STT and TTS
 */

import process from "node:process";
import { getAvailableSTTProvider } from "./voice-input.js";
import { getAvailableTTSProvider, RECOMMENDED_VOICES } from "./voice-output.js";
import { createVoicePipeline } from "./voice-pipeline.js";

/* ─────────────────────────────────────────────────────────────
   Banner
   ───────────────────────────────────────────────────────────── */

const BANNER = `
╔══════════════════════════════════════════════════════════════╗
║    🦾  I R O N C L I W  —  V O I C E  M O D E              ║
║    The Iron Grip of AI Automation — Now with Voice          ║
╚══════════════════════════════════════════════════════════════╝
`;

/* ─────────────────────────────────────────────────────────────
   Environment validation
   ───────────────────────────────────────────────────────────── */

function validateEnv(): { token: string } {
  const token = process.env.IronCliw_GATEWAY_TOKEN?.trim();
  if (!token) {
    console.error(`
❌  Missing: IronCliw_GATEWAY_TOKEN

Set it in your .env file:
  IronCliw_GATEWAY_TOKEN=your-gateway-token

Then run: node --import tsx src/voice/run-voice.ts
`);
    process.exit(1);
  }
  return { token };
}

/* ─────────────────────────────────────────────────────────────
   Provider info display
   ───────────────────────────────────────────────────────────── */

function printProviderInfo(): void {
  const stt = getAvailableSTTProvider();
  const tts = getAvailableTTSProvider();

  const sttLabel: Record<string, string> = {
    deepgram: "Deepgram Nova-2  ⚡ (real-time, ~300ms)",
    "openai-whisper": "OpenAI Whisper   🤖 (~1-2s)",
    "windows-sapi": "Windows SAPI     🪟 (offline, free)",
  };

  const ttsLabel: Record<string, string> = {
    elevenlabs: "ElevenLabs Turbo ⭐ (most natural)",
    "openai-tts": "OpenAI TTS       🤖 (fast, clear)",
    "edge-tts": "Edge TTS         🆓 (free, good quality)",
  };

  console.log(`\n📡 Providers:`);
  console.log(`   STT (Speech → Text): ${sttLabel[stt ?? ""] ?? stt ?? "none — check API keys!"}`);
  console.log(`   TTS (Text → Speech): ${ttsLabel[tts] ?? tts}`);

  if (tts === "elevenlabs") {
    console.log(`\n🎤 Available ElevenLabs voices:`);
    for (const v of RECOMMENDED_VOICES.elevenlabs) {
      console.log(`   • ${v.name}`);
    }
    console.log(`   Set IronCliw_VOICE_ID=<voice-id> to choose a voice.\n`);
  }
}

/* ─────────────────────────────────────────────────────────────
   Main entry
   ───────────────────────────────────────────────────────────── */

async function main(): Promise<void> {
  console.log(BANNER);
  const { token } = validateEnv();
  printProviderInfo();

  const pipeline = createVoicePipeline({
    gatewayToken: token,
    gatewayUrl: process.env.IronCliw_GATEWAY_URL ?? "ws://127.0.0.1:18789",
    hotword: process.env.IronCliw_VOICE_HOTWORD ?? "hey iron",
    debug: process.env.IronCliw_VOICE_DEBUG === "1",
    tts: {
      elevenLabsVoiceId: process.env.IronCliw_VOICE_ID,
      speed: process.env.IronCliw_VOICE_SPEED ? Number(process.env.IronCliw_VOICE_SPEED) : 1.0,
    },
    stt: {
      lang: process.env.IronCliw_VOICE_LANG ?? "en-US",
    },
  });

  // Event handlers
  pipeline.on("transcript", (text) => {
    console.log(`\n🗣️  You: "${text}"`);
  });

  pipeline.on("response", (text) => {
    console.log(`\n🤖 IronCliw: "${text.slice(0, 120)}${text.length > 120 ? "..." : ""}"`);
  });

  pipeline.on("error", (err) => {
    console.error(`\n⚠️  Error: ${err.message}`);
  });

  pipeline.on("status", (status) => {
    const statusIcon: Record<string, string> = {
      listening: "👂",
      recording: "🔴",
      transcribing: "🔄",
      speaking: "🔊",
      idle: "⏸️",
      stopped: "⏹️",
    };
    process.stdout.write(`\r${statusIcon[status] ?? "•"} ${status.padEnd(15)}`);
  });

  // Graceful shutdown
  const cleanup = async () => {
    console.log("\n\n👋 Stopping voice pipeline...");
    await pipeline.stop();
    process.exit(0);
  };

  process.on("SIGINT", () => void cleanup());
  process.on("SIGTERM", () => void cleanup());

  // Start!
  await pipeline.start();
}

main().catch((err: unknown) => {
  console.error("[IronCliw Voice] Fatal error:", (err as Error).message);
  process.exit(1);
});
