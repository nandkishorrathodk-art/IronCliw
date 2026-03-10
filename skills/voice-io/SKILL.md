---
name: voice-io
description: "🎙️ Full Voice I/O — Speak to IronCliw, hear its responses. Uses Deepgram/Whisper for STT and ElevenLabs/Edge TTS for premium voice output on Windows."
---

# 🎙️ Voice I/O Skill — IronCliw

This skill enables full **Voice Input + Voice Output** for IronCliw on Windows.

## What it does

- **Voice Input (STT):** Listens to your microphone, transcribes speech to text using Deepgram Nova-2, OpenAI Whisper, or the offline Windows SAPI engine.
- **Voice Output (TTS):** Speaks IronCliw's responses aloud using ElevenLabs (most natural), OpenAI TTS, or Edge TTS (free, no API key needed).
- **Auto-play on Windows:** Audio plays directly through your speakers — no extra software needed.

## Setup

### 1. Set your API keys in `.env`

```env
# For best STT quality (real-time, ~300ms latency):
DEEPGRAM_API_KEY=your-deepgram-key

# For best TTS quality (most natural voice):
ELEVENLABS_API_KEY=your-elevenlabs-key

# Both fall back to OpenAI if not set:
OPENAI_API_KEY=sk-...
```

### 2. Start the Voice Pipeline

Run the voice pipeline as a standalone script:

```powershell
cd c:\Users\nandk\fresh-IronCliw
node --import tsx src/voice/run-voice.ts
```

Or from within a running IronCliw session, trigger it via:

```
/voice-io start
```

### 3. Speak!

- Press **Enter** → start recording
- Speak your command
- Press **Enter** again → stop recording
- IronCliw will respond verbally

## Configuration Options

| Option               | Default                | Description                              |
| -------------------- | ---------------------- | ---------------------------------------- |
| `STT Provider`       | auto                   | deepgram → openai-whisper → windows-sapi |
| `TTS Provider`       | auto                   | elevenlabs → openai-tts → edge-tts       |
| `Gateway URL`        | `ws://127.0.0.1:18789` | IronCliw gateway endpoint                |
| `Max Recording`      | 30 seconds             | Maximum mic recording duration           |
| `Voice (ElevenLabs)` | Rachel                 | Warm, natural, professional voice        |
| `Voice (OpenAI)`     | nova                   | Clear, warm tone                         |
| `Voice (Edge TTS)`   | en-US-JennyNeural      | Natural Windows voice                    |

## Voice Quality Comparison

| Provider               | Quality    | Latency | Cost          |
| ---------------------- | ---------- | ------- | ------------- |
| ElevenLabs Turbo v2.5  | ⭐⭐⭐⭐⭐ | ~300ms  | Paid          |
| OpenAI gpt-4o-mini-tts | ⭐⭐⭐⭐   | ~400ms  | Paid          |
| Edge TTS (JennyNeural) | ⭐⭐⭐     | ~800ms  | Free          |
| Windows SAPI           | ⭐⭐       | ~200ms  | Free, offline |

## Recommended ElevenLabs Voices

| Name   | Style               | Voice ID               |
| ------ | ------------------- | ---------------------- |
| Rachel | Warm, Professional  | `21m00Tcm4TlvDq8ikWAM` |
| Adam   | Deep, Authoritative | `pNInz6obpgDQGcFmaJgB` |
| Josh   | Natural, Casual     | `TxGEqnHWrfWFTfGW9XjX` |
| Elli   | Soft, Friendly      | `MF3mGyEYCl7XYWbV9V6O` |
