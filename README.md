<p align="center">
  <img src="docs/assets/IronCliw-logo-text-dark.png" alt="IronCliw Logo" width="600">
</p>

<p align="center">
  <strong>Native Windows Integration | Bug Bounty Automation | Multi-Channel AI</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT License"></a>
  <a href="https://github.com/nandkishorrathodk-art/IronCliw/releases"><img src="https://img.shields.io/github/v/release/nandkishorrathodk-art/IronCliw?style=for-the-badge&color=orange" alt="Release"></a>
  <img src="https://img.shields.io/badge/Platform-Windows-blue?style=for-the-badge&logo=windows" alt="Platform Windows">
</p>

---

<div align="center">

# 🛡️ IronCliw

### **Elite AI Agent Gateway — Windows Native Port**

---

[![License: MIT](https://img.shields.io/badge/License-MIT-00f5ff.svg)](./LICENSE)
[![Node ≥22](https://img.shields.io/badge/Node-%E2%89%A522-00ff88.svg)](https://nodejs.org)
[![Windows](https://img.shields.io/badge/Platform-Windows%2011%2F10-7c3aed.svg)](https://www.microsoft.com/windows)
[![WSL2](https://img.shields.io/badge/WSL2-Supported-a855f7.svg)](https://learn.microsoft.com/en-us/windows/wsl/)
[![Version](https://img.shields.io/badge/Version-2026.0.2-00d9ff.svg)](./CHANGELOG.md)
[![Built in India](https://img.shields.io/badge/Made%20with%20%E2%9A%A1-India%20%F0%9F%87%AE%F0%9F%87%B3-ff6b35.svg)](#)

</div>

---

## 🔄 Origin & Evolution

IronCliw is a specialized derivative work that builds upon the foundation of an industry-leading AI gateway.

- **Original Project:** [IronCliw](https://github.com/IronCliw/IronCliw) — A cross-platform AI agent system created by [Peter Steinberger](https://steipete.me).
- **Modified Version:** **IronCliw** — A dedicated Windows-native port and heavy modification by [Nandkishor Rathod](https://github.com/nandkishorrathodk-art), engineered for security researchers and power users.

---

## ⚡ What is IronCliw?

**IronCliw** is a **Windows-native port and heavy modification** of the IronCliw AI agent gateway. While the original was designed to be cross-platform and casual-user friendly, IronCliw is built as a **precision weapon** — tuned exclusively for:

- 🪟 **Native Windows 11/10** environments (with WSL2 + PowerShell integration)
- ☠️ **Bug Bounty hunters** who need an autonomous AI recon co-pilot
- 🤖 **Power users** who want JARVIS-class local AI automation
- 🔒 **Security researchers** who need multi-channel AI with real shell access

> _"Not for everyone. Built for one."_ — Nandkishor Rathod

---

## 🆚 IronCliw vs IronCliw

| Feature                | Original (IronCliw) | **Modified (IronCliw)** 🛡️          |
| ---------------------- | ------------------- | ----------------------------------- |
| Bug Bounty Protocol    | ✗ None              | ✅ Built-In (6-phase)               |
| PowerShell Integration | ✗ Basic cmd.exe     | ✅ Native `-ExecutionPolicy Bypass` |
| Context Window         | 8K tokens           | ✅ 128K tokens                      |
| Max Output Tokens      | 4K                  | ✅ 16,384                           |
| Parallel Subagents     | 4                   | ✅ 16 agents                        |
| Session Memory TTL     | 1h                  | ✅ 4h TTL                           |
| Agent Personality      | Generic             | ✅ Elite Specialist                 |
| Auto Recon             | ✗                   | ✅ Autonomous                       |
| Windows Native Daemon  | ✗                   | ✅ IronCliwDaemon (C#)              |
| Custom Branding        | ✗                   | ✅ Full IronCliw                    |

---

## 🏗️ Architecture

IronCliw operates on a **3-Tier Architecture** designed for maximum Windows performance:

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
└──────────────────────────┬──────────────────────────────────────┘
                           │  spawn / PATH
┌──────────────────────────▼──────────────────────────────────────┐
│                   TIER 3 — THE ARSENAL                          │
│         C:\Users\nandk\Aether_Arsenal  (Hacking Binaries)       │
│    subfinder · nmap · httpx · nuclei · ffuf · sqlmap · dalfox   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start (Windows)

**Runtime: Node ≥ 22 | Windows 10/11 | PowerShell 7+**

```powershell
# Install globally
npm install -g IronCliw

# Run the onboarding wizard
IronCliw onboard

# Start your gateway
IronCliw gateway start
```

> Gateway will be live at → `http://127.0.0.1:18789`

---

## 📦 Install from Source

```powershell
# Clone the repository
git clone https://github.com/nandkishorrathodk-art/IronCliw.git
cd IronCliw

# Install dependencies
pnpm install

# Build UI + core
pnpm ui:build
pnpm build

# Onboard
pnpm IronCliw onboard --install-daemon

# Dev loop (hot-reload on TypeScript changes)
pnpm gateway:watch
```

---

## ☠️ Bug Bounty Mode

IronCliw has a **built-in 6-phase Bug Bounty Protocol**. Trigger a full recon with a single command:

```
IronCliw, footprint target.com
```

This automatically chains:

| Phase | Tool        | Action                                         |
| ----- | ----------- | ---------------------------------------------- |
| 01    | `subfinder` | Subdomain enumeration                          |
| 02    | `httpx`     | Alive host checking                            |
| 03    | `nmap`      | Port & service scanning                        |
| 04    | `nuclei`    | Low-hanging CVE detection                      |
| 05    | `ffuf`      | Directory & param fuzzing                      |
| 06    | AI Engine   | Auto-generates HackerOne-ready HTML/PDF report |

---

## 🔋 Power Features

### ⚡ PowerShell Integration

All shell commands run through a persistent PowerShell runspace with `-NoProfile -NonInteractive -ExecutionPolicy Bypass`, retaining state between commands.

### 🧠 Self-Healing Code (Auto-Fixer)

If a script fails, IronCliw reads the `stderr`, pipes it back to the LLM, auto-fixes the syntax, and retries — without asking you.

### 🪟 IronCliwDaemon (C# Native Layer)

A background C# `.NET` service that gives IronCliw god-level Windows access:

- **Window Control** — Native system interaction
- **Clipboard Master** — Instant read/write access
- **Input Simulation** — Automated keyboard/mouse control
- **System Stats** — Real-time resource monitoring

---

## 🛡️ Security

IronCliw runs with real shell access on your machine. A built-in `CommandFilter` guards against dangerous commands:

```
🚨 BLOCKED: Remove-Item C:\Windows
🚨 BLOCKED: format C:
🚨 BLOCKED: rm -rf /
```

Dangerous commands trigger a **RED WARNING** in the dashboard and require `[Y/N]` approval before execution.

---

## ⚖️ License

```
MIT License

Copyright (c) 2026 Nandkishor Rathod (Windows Port & IronCliw Modifications)

This project is a heavily modified Windows port and extension of IronCliw
(https://github.com/IronCliw/IronCliw), originally created by Peter Steinberger.

Modifications by Nandkishor Rathod include:
  1. Native Windows API Integration via C# Interop (IronCliwDaemon)
  2. Advanced Bug Bounty Automation Workflow Engine (6-Phase Protocol)
  3. PowerShell-first Execution Engine with God Mode
  4. Custom UI/UX Dashboard for Cybersecurity Recon

Original IronCliw is MIT Licensed. This derivative work is also MIT Licensed.
Full license text: ./LICENSE
```

---

## 🙏 Attribution

This project stands on the shoulders of giants:

- **[Peter Steinberger](https://steipete.me)** — Creator of IronCliw (Original Architecture)
- **The IronCliw Community** — Original framework development
- **[Mario Zechner](https://github.com/badlogic)** — pi-mono support

---

<div align="center">

**Built with ⚡ by [Nandkishor Rathod](https://github.com/nandkishorrathodk-art) in India 🇮🇳**

_"The Iron Grip of AI Automation."_

[🌐 Website](https://IronCliw.ai) · [📖 Docs](./docs) · [☠️ Bug Bounty Guide](./BUGBOUNTY_SETUP.md) · [🔒 Security](./SECURITY.md)

</div>
