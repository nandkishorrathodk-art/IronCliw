# 🦾 IronCliw — Personal AI Automation Gateway

<p align="center">
  <img src="https://img.shields.io/badge/IronCliw-v2026.0.4-cyan?style=for-the-badge&logo=robot" alt="IronCliw">
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-blue?style=for-the-badge" alt="Platform">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/Node-%E2%89%A522-brightgreen?style=for-the-badge&logo=node.js" alt="Node 22+">
</p>

<p align="center">
  <strong>The Iron Grip of AI Automation.</strong><br/>
  A Windows-native, performance-optimized personal AI assistant gateway.
</p>

---

## Credits & Acknowledgements

> **IronCliw is a fork of [OpenClaw](https://github.com/openclaw/openclaw) — full credit goes to the OpenClaw team and contributors.**
>
> OpenClaw is an open-source personal AI assistant gateway that powers the core architecture of IronCliw. We stand on the shoulders of giants.
>
> [![OpenClaw](https://img.shields.io/badge/Upstream-OpenClaw-orange?style=flat-square)](https://github.com/openclaw/openclaw)
> [![Original Authors](https://img.shields.io/badge/Original%20Work-OpenClaw%20Contributors-red?style=flat-square)](https://github.com/openclaw/openclaw/graphs/contributors)

IronCliw builds on top of OpenClaw with:
- **Windows-native** optimizations and WSL2 guidance
- **2x performance upgrades** across the gateway infrastructure
- **87+ bug fixes** across all subsystems
- Full **rebranding** and UI overhaul (🦾 mascot, iron/cyan palette)
- **Advanced features** — HyperTask, SmartContextCache, ContextCache, parallel executor

---

## What is IronCliw?

**IronCliw** is a _personal AI assistant_ you run on your own devices. It answers you on the channels you already use:

> WhatsApp · Telegram · Slack · Discord · Google Chat · Signal · iMessage · BlueBubbles · IRC · Microsoft Teams · Matrix · Feishu · LINE · Mattermost · Nextcloud Talk · Nostr · Synology Chat · Tlon · Twitch · Zalo · WebChat

It can speak and listen on macOS/iOS/Android, and can render a live Canvas you control. The Gateway is just the control plane — **the product is the assistant.**

---

## Install

**Runtime: Node ≥22**

```bash
npm install -g ironcliw@latest
# or: pnpm add -g ironcliw@latest

ironcliw onboard --install-daemon
```

The wizard installs the Gateway daemon (launchd/systemd/Windows Task Scheduler) so it stays running.

---

## Quick Start

```bash
# Run the onboarding wizard
ironcliw onboard

# Start the gateway
ironcliw gateway

# Send a message
ironcliw message send --to +1234567890 --message "Hello from IronCliw"

# Talk to the agent
ironcliw agent --message "What can you do?" --thinking high
```

---

## What IronCliw Adds Over OpenClaw

### Performance Improvements (2x Speed Upgrades)

| Area | Before | After | Gain |
|------|--------|-------|------|
| Connection Pool | `setInterval(50ms)` polling | Promise-based waiter queue | 0–50ms latency eliminated |
| Broadcast | N × UTF-8 encode per client | 1 × encode → shared `Buffer` | N× reduction for N clients |
| Nested Lane Concurrency | `maxConcurrent: 1` (serialized) | `maxConcurrent: 8` (parallel) | 8× nested tool throughput |
| Delta Streaming | 150ms throttle | 50ms throttle | 3× faster streaming |
| Regex matching | O(N²) | O(N) | 2x+ on large sessions |

### Bug Fixes (87+ Fixes)

- Voice pipeline race conditions
- WhatsApp reply chain memory leaks
- Slack channel type cache key mismatch
- `seqByRun` memory leak on long sessions
- `deltaLastBroadcastLen` abort memory leak
- `verboseLevelCache` premature "off" caching
- `toPayloadJSON` falsy guard missing
- Post-shutdown reconnect race in connection pool
- Implicit Nested lane serialization (was silently blocking tool concurrency)
- Dedupe loop early termination bug
- Session write lock held too long
- `nodeSendToSession` silent throttle

### Windows-Native Features

- Windows Task Scheduler integration (daemon install without WSL)
- Windows path normalization throughout
- Native Windows build pipeline (no Bash dependency for core build)
- Detailed Windows setup guidance in onboarding

---

## Architecture

```
WhatsApp / Telegram / Slack / Discord / ... / WebChat
               │
               ▼
┌───────────────────────────────┐
│           IronCliw             │
│        Gateway (v2026.0.4)    │
│      ws://127.0.0.1:18789     │
└──────────────┬────────────────┘
               │
               ├─ Pi agent (RPC, streaming)
               ├─ CLI (ironcliw …)
               ├─ Control UI (WebChat)
               ├─ macOS / iOS app
               └─ Android node
```

### Core Subsystems

- **[Gateway WebSocket control plane](https://docs.ironcliw.ai/gateway)** — sessions, presence, config, cron, webhooks, and Canvas host.
- **[Connection Pool](src/gateway/connection-pool.ts)** — promise-based waiter queue, zero-latency handoff, shutdown-safe reconnect.
- **[Broadcast Engine](src/gateway/server-broadcast.ts)** — pre-computed `Buffer` sent to all N clients per tick.
- **[Command Lane Scheduler](src/gateway/server-lanes.ts)** — `Main(4)` · `Subagent(8)` · `Nested(8)` · `Cron(1)` concurrent lanes.
- **[Multi-channel Inbox](https://docs.ironcliw.ai/channels)** — 22+ messaging channels with unified session model.
- **[Voice Pipeline](https://docs.ironcliw.ai/nodes/talk)** — wake words, Talk Mode, ElevenLabs + system TTS fallback.
- **[Browser Control](https://docs.ironcliw.ai/tools/browser)** — Chromium with CDP, snapshots, uploads, profiles.
- **[Canvas + A2UI](https://docs.ironcliw.ai/platforms/mac/canvas)** — agent-driven visual workspace.

---

## Highlights

- **Local-first Gateway** — single control plane for sessions, channels, tools, and events.
- **Multi-channel inbox** — 22+ messaging channels out of the box.
- **Multi-agent routing** — route channels/accounts/peers to isolated agents.
- **Voice Wake + Talk Mode** — wake words on macOS/iOS, continuous voice on Android.
- **Live Canvas** — agent-driven visual workspace with A2UI.
- **First-class tools** — browser, canvas, nodes, cron, sessions, and platform actions.
- **Companion apps** — macOS menu bar + iOS/Android nodes.
- **Windows-native** — runs on Windows directly (WSL2 optional, not required).

---

## Security Defaults

IronCliw connects to real messaging surfaces. Treat inbound DMs as **untrusted input**.

Default behavior: **DM pairing** — unknown senders receive a short pairing code. The bot does not process messages from unknown senders until approved.

```bash
ironcliw pairing approve <channel> <code>
ironcliw doctor          # surface risky/misconfigured DM policies
ironcliw security audit --deep
ironcliw security audit --fix
```

Full security guide: [Security](https://docs.ironcliw.ai/gateway/security)

---

## Chat Commands

Send these in WhatsApp / Telegram / Slack / Discord / WebChat:

| Command | Action |
|---------|--------|
| `/status` | Session status (model, tokens, cost) |
| `/new` or `/reset` | Reset the session |
| `/compact` | Compact session context (summary) |
| `/think <level>` | `off\|minimal\|low\|medium\|high\|xhigh` |
| `/verbose on\|off` | Toggle verbose mode |
| `/usage off\|tokens\|full` | Per-response usage footer |
| `/restart` | Restart the gateway (owner only) |

---

## Development (From Source)

```bash
git clone https://github.com/nandkishorrathodk-art/IronCliw.git
cd IronCliw

pnpm install
pnpm ui:build
pnpm build

# Run the gateway
ironcliw gateway

# Dev loop (auto-reload on TS changes)
pnpm gateway:watch
```

**Lint:**
```bash
pnpm lint   # oxlint — should report 0 warnings, 0 errors
```

---

## Development Channels

| Channel | Tag | npm dist-tag |
|---------|-----|--------------|
| stable | `vYYYY.M.D` | `latest` |
| beta | `vYYYY.M.D-beta.N` | `beta` |
| dev | moving `main` head | `dev` |

```bash
ironcliw update --channel stable|beta|dev
```

---

## Upstream / License

IronCliw is built on **[OpenClaw](https://github.com/openclaw/openclaw)**, used under the MIT License.

**Original project:** [github.com/openclaw/openclaw](https://github.com/openclaw/openclaw)  
**OpenClaw License:** [MIT](https://github.com/openclaw/openclaw/blob/main/LICENSE)  
**IronCliw License:** [MIT](LICENSE)

All original copyright notices from OpenClaw are preserved.

---

<p align="center">
  Built with 🦾 by <strong>Nandkishor Rathod</strong> on top of <a href="https://github.com/openclaw/openclaw">OpenClaw</a>
</p>
