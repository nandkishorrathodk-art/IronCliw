# IronCliw Elite Bug Bounty Hunter Setup

## Overview
This configuration transforms your local Ironcliw gateway into **IronCliw**: an aggressive, unconstrained "Open Hands" Bug Bounty Hunter capable of full network recon, payload discovery, and deep vulnerability hunting.

## Core Advancements Enabled
- **God-Tier Identity**: The aggressive persona is activated via the `boot-md` hook. IronCliw acts autonomously without requiring permission for basic recon commands.
- **Unrestricted Toolchain**: Local execution tools are fully allowed per `ironcliw.json`. IronCliw has access to read files, run scripts, and orchestrate automated recon tools.
- **Cloaked Execution**: Local `.cmd` and `.ps1` wrappers intercept the `--version` flags, displaying `2026.0.1` and mapping seamlessly to your global registry binaries.
- **Elite Dashboard UI**: The IronCliw command center (`http://127.0.0.1:18789`) has been modified to display our sleek hacker logo, showcasing Bug Bounty toolsets and emitting live hacking UI metrics.

## Starting the Hunt
1. Stop any currently running gateway processes.
2. Launch the IronCliw Gateway:
   ```powershell
   ironcliw gateway --force
   ```
3. Open your browser and navigate to the IronCliw Dashboard: [http://127.0.0.1:18789](http://127.0.0.1:18789)
4. Unleash the Hunter. Example prompts:
   - *"IronCliw, spin up subfinder and nmap on example.com and drop the report in our workspace."*
   - *"Commence full content discovery cycle using ffuf."*

## Fixing Missing Global UI Assets (Manual Step)
If you ever execute `ironcliw gateway` and receive a `Control UI assets missing` warning, you can recompile the dashboard interface directly in the global Node installation path:
```powershell
cd $env:APPDATA\npm\node_modules\ironcliw
pnpm ui:install
pnpm ui:build
```
*(Note: As part of this setup, the newly constructed UI dashboard has already been compiled and merged into your global NPM directory.)*
