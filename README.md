<p align="center">
  <img src="docs/assets/IronCliw-logo-text-dark.png" alt="IronCliw Logo" width="600">
</p>

<p align="center">
  <strong>Windows-Native AI Automation · Voice I/O · Multi-Channel · Security Research</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/Version-2026.0.3-00e5ff?style=for-the-badge" alt="Version">
  <img src="https://img.shields.io/badge/Platform-Windows%2010%2F11-546e7a?style=for-the-badge&logo=windows" alt="Windows">
  <img src="https://img.shields.io/badge/Node-%E2%89%A522-00e676?style=for-the-badge" alt="Node">
  <img src="https://img.shields.io/badge/Made%20in-India%20%F0%9F%87%AE%F0%9F%87%B3-ff1744?style=for-the-badge" alt="India">
</p>

---

<div align="center">

# 🦾 IronCliw

### **The Iron Grip of AI Automation**

[![License: MIT](https://img.shields.io/badge/License-MIT-00e5ff.svg)](./LICENSE)
[![Node ≥22](https://img.shields.io/badge/Node-%E2%89%A522-00e676.svg)](https://nodejs.org)
[![Windows](https://img.shields.io/badge/Platform-Windows%2011%2F10-546e7a.svg)](https://www.microsoft.com/windows)
[![Version](https://img.shields.io/badge/Version-2026.0.3-5aeeff.svg)](./CHANGELOG.md)
[![Built in India](https://img.shields.io/badge/Made%20with%20%E2%9A%A1-India%20%F0%9F%87%AE%F0%9F%87%B3-ff1744.svg)](#)

</div>

---

## ⚡ What is IronCliw?

**IronCliw** is a precision-engineered AI agent gateway built for the Windows ecosystem. It transforms your local machine into an autonomous workstation capable of executing complex tasks through simple natural language — with voice, vision, and multi-channel control.

- 🎙️ **Voice I/O** — Talk to IronCliw. It listens (Deepgram Nova-2), responds (ElevenLabs / Edge TTS), and executes.
- 🪟 **Windows Native** — Deep OS integration via C# Daemon for registry, services, clipboard, and input control.
- 🧠 **128K Context** — Parallel sub-agent orchestration with up to 16 simultaneous agents.
- 🖥️ **Visual Intelligence** — Uses Fireworks Kimi 2.x Computer Vision to operate any desktop application.
- 📱 **Multi-Channel** — Control your PC from WhatsApp, Telegram, Discord, Signal, or iMessage.
- ⚡ **HyperTask Engine** — 8-worker parallel task queue for 5× faster multi-step operations.
- 🛡️ **Health Monitor** — Real-time CPU, RAM, Disk watchdog with auto-alerts when resources hit critical thresholds.
- 🕵️ **Browser Stealth** — Anti-bot-detection engine with UA rotation, viewport randomization, and mouse jitter.
- 🔍 **ProScan AI Scanner** — Built-in autonomous security scanner (Burp Suite alternative): crawl, passive analysis, active injection (XSS/SQLi/SSTI/IDOR), JS endpoint extraction, auth bypass detection, and auto bug-bounty report generation.

> _"The Iron Grip of AI Automation."_

---

## 🔄 Built On The Shoulders of Giants

IronCliw is a specialized derivative work that builds upon the foundation of **OpenClaw** — an open-source AI gateway project.

| | |
|---|---|
| **Original Project** | [OpenClaw](https://github.com/openclaw/openclaw) — Cross-platform AI agent system by [Peter Steinberger](https://steipete.me) |
| **IronCliw** | A dedicated **Windows-native port** and heavy modification by [Nandkishor Rathod](https://github.com/nandkishorrathodk-art), engineered for high-performance automation, voice I/O, and advanced system control |

Huge respect and thanks to the OpenClaw team for their open-source work. 🙏

---

## 🆚 IronCliw vs OpenClaw

| Feature                | Original (OpenClaw) | **IronCliw** 🦾                     |
| ---------------------- | ------------------- | ----------------------------------- |
| Primary OS Focus       | Cross-Platform      | ✅ Windows Native Optimized         |
| Shell Integration      | Basic cmd.exe       | ✅ Native PowerShell 7+             |
| Voice I/O              | ✗ None              | ✅ Deepgram STT + ElevenLabs TTS    |
| UI Automation          | ✗ Browser only      | ✅ Full Desktop GUI Control         |
| Visual Learning        | ✗ None              | ✅ Vision-Aided (Kimi 2.x)          |
| Context Window         | 8K tokens           | ✅ 128K tokens                      |
| Parallel Subagents     | 4                   | ✅ 16 agents                        |
| Windows Native Daemon  | ✗                   | ✅ IronCliwDaemon (C#)              |
| Parallel Task Engine   | ✗                   | ✅ HyperTask (8-worker queue)       |
| System Health Monitor  | ✗                   | ✅ CPU/RAM/Disk watchdog             |
| Security Scanner       | ✗                   | ✅ ProScan (XSS/SQLi/IDOR/SSTI/CSRF) |
| Bug Bounty Reports     | ✗                   | ✅ Auto Bugcrowd/HackerOne reports   |

---

## 🏗️ Architecture

IronCliw operates on a **3-Tier Industrial Architecture**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    TIER 1 — THE BRAIN                           │
│           Node.js / TypeScript Core  (LLM Logic)                │
│    Claude · OpenAI · Fireworks · Gemini · Ollama · Groq         │
│         WebSocket Gateway → ws://127.0.0.1:18789                │
└──────────────────────────┬──────────────────────────────────────┘
                           │  IPC (WebSocket / gRPC)
┌──────────────────────────▼──────────────────────────────────────┐
│                   TIER 2 — THE MUSCLE                           │
│              IronCliwDaemon.exe  (C# .NET Native)               │
│  Window Control · Clipboard · Input Simulation · System Stats   │
└──────────────────────────▼──────────────────────────────────────┘
                           │  Native API / Vision Engine
┌──────────────────────────▼──────────────────────────────────────┐
│                   TIER 3 — THE TOOLS                            │
│         Desktop Applications · CLI Tools · Cloud APIs           │
│    Playwright · Burp Suite · Docker · Git · Python · Node       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start (Windows)

**Requirements: Node ≥ 22 · Windows 10/11 · PowerShell 7+**

```powershell
# Clone and build
git clone https://github.com/nandkishorrathodk-art/IronCliw.git
cd IronCliw
pnpm install
pnpm build

# Install globally so IronCliw command works anywhere
npm install -g .

# Initialize (first run)
IronCliw onboard

# Start the gateway
IronCliw gateway start
```

Open your browser at `http://localhost:18789` and start chatting.

---

## 📦 Build from Source

```powershell
git clone https://github.com/nandkishorrathodk-art/IronCliw.git
cd IronCliw
pnpm install
pnpm build
node IronCliw.mjs onboard
```

---

## 🎙️ Voice Mode Setup

IronCliw supports full **talk-to-agent** voice interaction.

```powershell
# Add to your .env file:
DEEPGRAM_API_KEY=your_deepgram_key       # Speech-to-Text (Nova-2, ~300ms latency)
ELEVENLABS_API_KEY=your_elevenlabs_key   # Text-to-Speech (human-quality voice)
```

Restart the gateway — the 🎙️ mic button appears in the chat UI automatically.

| Role | Primary | Fallback |
|------|---------|---------|
| STT (Speech → Text) | Deepgram Nova-2 | OpenAI Whisper |
| TTS (Text → Speech) | ElevenLabs | Edge TTS (free, no key needed) |

---

## 🔋 Power Features

### ⚡ HyperTask Parallel Engine
Runs up to 8 tasks simultaneously — 5× faster than sequential execution.

### �️ Browser Stealth Mode
Bypasses bot detection: hides `navigator.webdriver`, randomizes UA and viewport, adds human-like mouse timing.

### 🛡️ Health Watchdog
Monitors CPU, RAM, Disk every 30 seconds. Auto-alerts at 90% CPU, 85% RAM, 90% Disk.

### 🧩 Smart Context Cache
Reduces LLM token usage by caching tool results (60s), deduplicating calls, and compressing output.

---

## 🔍 ProScan — AI Security Scanner

IronCliw ships with **ProScan**, a fully autonomous security scanner that replaces Burp Suite for bug bounty hunting:

```powershell
# Quick passive scan (headers, SSL, info disclosure)
IronCliw scan quick https://target.com

# Full autonomous scan (crawl → passive → active injection → API)
IronCliw scan scope --add target.com
IronCliw scan target https://target.com --depth 3 --pages 30

# Bug bounty mode — scan all program targets + auto-generate report
IronCliw scan bounty --program "Fireblocks" --scope "sb-console-api.fireblocks.io,sandbox-api.fireblocks.io" --platform bugcrowd --researcher yourhandle

# Generate Bugcrowd/HackerOne formatted report from findings
IronCliw scan report findings.json --platform bugcrowd --out report.md
```

| Capability | Burp Suite Free | **IronCliw ProScan** |
|---|---|---|
| Passive analysis | ✅ | ✅ |
| Form injection (XSS/SQLi/SSTI) | ✅ | ✅ |
| JS endpoint extraction | ✅ | ✅ |
| Authenticated scan | ✅ | ✅ |
| IDOR / API fuzzing | ✅ | ✅ |
| Auth bypass header testing | ✅ | ✅ |
| Auto bug-bounty report | ✗ | ✅ |
| Burp Pro required | ✅ | **Free — built in** |

---

## 🔒 Security Guardrails

IronCliw includes built-in **authorized-targets scope management**:
- Define which domains/IPs are in-scope
- All sensitive actions require explicit user authorization
- Rate limiter + circuit breaker prevents runaway automation

---

## ⚖️ License

```
MIT License
Copyright (c) 2026 Nandkishor Rathod

IronCliw is a heavily modified Windows port and extension built upon
the open-source OpenClaw project (https://github.com/openclaw/openclaw).

Major modifications include:
  1. Native Windows API Integration via C# Interop (IronCliwDaemon)
  2. Voice I/O Pipeline (Deepgram STT + ElevenLabs TTS)
  3. Industrial 'Iron' UI/UX and cyber terminal theming
  4. Vision-aided GUI automation engine (Fireworks Kimi 2.x)
  5. HyperTask parallel execution engine (8-worker queue)
  6. System Health Watchdog (CPU / RAM / Disk)
```

---

<div align="center">

**Built with ⚡ by [Nandkishor Rathod](https://github.com/nandkishorrathodk-art) in India 🇮🇳**

_"The Iron Grip of AI Automation."_

[📖 Docs](./docs) · [🔒 Security](./SECURITY.md) · [📋 Changelog](./CHANGELOG.md)

</div>
