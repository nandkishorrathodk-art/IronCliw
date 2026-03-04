# 🦞 IronCliw — The Ultimate Personal AI Agent (Windows Port)

<p align="center">
  <img src="https://raw.githubusercontent.com/nandkishorrathodk-art/IronCliw/main/docs/assets/IronCliw-logo-text.png" alt="IronCliw Logo" width="600">
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

## 🚀 What is IronCliw?

**IronCliw** is a powerful, local-first personal AI assistant specifically optimized for the Windows ecosystem. Based on the original "Clawd" architecture, this port introduces a deep **C# Bridge** for native system control and a specialized **Bug Bounty Automation Engine** for security researchers.

Whether you're automating your workflow, hunting for bugs, or managing 20+ messaging channels, IronCliw is your always-on intelligent companion.

## ✨ Key Features

### 🪟 Native Windows Power
Unlike standard ports, IronCliw features a high-performance **C# Bridge** (`IronCliwDaemon.exe`). This allows the AI to:
- Directly interact with Windows System APIs.
- Handle notifications, file system operations, and process management natively.
- Provide a smooth, low-latency experience on Windows 10/11.

### 🛡️ Bug Bounty Automation Engine
Built for the modern hunter, IronCliw includes an advanced engine to:
- Orchestrate reconnaissance tools (Nuclei, Subfinder, etc.).
- Analyze scan results in real-time.
- Automate repetitive reporting tasks.
- Keep track of your findings in a structured local vault.

### 📱 Multi-Channel Mastery
Connect your AI to everywhere you talk:
- **Instant Messaging:** WhatsApp, Telegram, Signal, iMessage (via BlueBubbles).
- **Teamwork:** Slack, Discord, Microsoft Teams, Slack, Matrix.
- **Global:** LINE, Zalo, WeChat, and more.

### 🎨 Live Canvas & UI
Control the AI through a **Live Canvas** visual workspace. Render data, preview files, and interact with the agent's thoughts in real-time.

---

## 🛠️ Quick Start (Windows)

### Prerequisites
- **Node.js:** v22 or higher.
- **Git:** Installed and configured.
- **Build Tools:** Visual Studio Build Tools (for the C# Bridge).

### Installation
```powershell
# Clone the repository
git clone https://github.com/nandkishorrathodk-art/IronCliw.git
cd IronCliw

# Install dependencies
pnpm install

# Build the project (includes C# Bridge compilation)
pnpm build

# Start the onboarding wizard
pnpm IronCliw onboard
```

---

## 🏗️ Architecture

```text
  [ User Interfaces ] <---> [ IronCliw Gateway ] <---> [ C# System Bridge ]
          |                        |                        |
    (WhatsApp/Slack)         (Node.js Core)           (Windows Native)
          |                        |                        |
          └----------------> [ AI Models ] <----------------┘
                      (Claude / GPT / Ollama)
```

---

## 📄 License & Attribution

### MIT License
Copyright (c) 2026 **Nandkishor Rathod** (Windows Port)

This project is a Windows port of the original "Clawd" (Ironcliw) agent system.
Original architecture inspired by: **Claude (AI) / Peter Steinberger**.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files... (See [LICENSE](LICENSE) for full text).

### ATTRIBUTION NOTICE
This software is a derivative work based on the **"Clawd" (Ironcliw)** framework.
- **Original Creator:** Claude / Peter Steinberger.
- **Windows Port & IronCliw-AI Modifications:** Nandkishor Rathod

**Significant Modifications:**
- Native Windows Integration (C# Bridge)
- Advanced Bug Bounty Automation Engine
- IronCliw Branding & Core UI Overhaul

---
<p align="center">Developed with ❤️ by <a href="https://github.com/nandkishorrathodk-art">Nandkishor Rathod</a></p>
