---
summary: "Uninstall Ironcliw completely (CLI, service, state, workspace)"
read_when:
  - You want to remove Ironcliw from a machine
  - The gateway service is still running after uninstall
title: "Uninstall"
---

# Uninstall

Two paths:

- **Easy path** if `Ironcliw` is still installed.
- **Manual service removal** if the CLI is gone but the service is still running.

## Easy path (CLI still installed)

Recommended: use the built-in uninstaller:

```bash
Ironcliw uninstall
```

Non-interactive (automation / npx):

```bash
Ironcliw uninstall --all --yes --non-interactive
npx -y Ironcliw uninstall --all --yes --non-interactive
```

Manual steps (same result):

1. Stop the gateway service:

```bash
Ironcliw gateway stop
```

2. Uninstall the gateway service (launchd/systemd/schtasks):

```bash
Ironcliw gateway uninstall
```

3. Delete state + config:

```bash
rm -rf "${IRONCLIW_STATE_DIR:-$HOME/.Ironcliw}"
```

If you set `IRONCLIW_CONFIG_PATH` to a custom location outside the state dir, delete that file too.

4. Delete your workspace (optional, removes agent files):

```bash
rm -rf ~/.Ironcliw/workspace
```

5. Remove the CLI install (pick the one you used):

```bash
npm rm -g Ironcliw
pnpm remove -g Ironcliw
bun remove -g Ironcliw
```

6. If you installed the macOS app:

```bash
rm -rf /Applications/Ironcliw.app
```

Notes:

- If you used profiles (`--profile` / `IRONCLIW_PROFILE`), repeat step 3 for each state dir (defaults are `~/.Ironcliw-<profile>`).
- In remote mode, the state dir lives on the **gateway host**, so run steps 1-4 there too.

## Manual service removal (CLI not installed)

Use this if the gateway service keeps running but `Ironcliw` is missing.

### macOS (launchd)

Default label is `ai.Ironcliw.gateway` (or `ai.Ironcliw.<profile>`; legacy `com.Ironcliw.*` may still exist):

```bash
launchctl bootout gui/$UID/ai.Ironcliw.gateway
rm -f ~/Library/LaunchAgents/ai.Ironcliw.gateway.plist
```

If you used a profile, replace the label and plist name with `ai.Ironcliw.<profile>`. Remove any legacy `com.Ironcliw.*` plists if present.

### Linux (systemd user unit)

Default unit name is `Ironcliw-gateway.service` (or `Ironcliw-gateway-<profile>.service`):

```bash
systemctl --user disable --now Ironcliw-gateway.service
rm -f ~/.config/systemd/user/Ironcliw-gateway.service
systemctl --user daemon-reload
```

### Windows (Scheduled Task)

Default task name is `Ironcliw Gateway` (or `Ironcliw Gateway (<profile>)`).
The task script lives under your state dir.

```powershell
schtasks /Delete /F /TN "Ironcliw Gateway"
Remove-Item -Force "$env:USERPROFILE\.Ironcliw\gateway.cmd"
```

If you used a profile, delete the matching task name and `~\.Ironcliw-<profile>\gateway.cmd`.

## Normal install vs source checkout

### Normal install (install.sh / npm / pnpm / bun)

If you used `https://Ironcliw.ai/install.sh` or `install.ps1`, the CLI was installed with `npm install -g Ironcliw@latest`.
Remove it with `npm rm -g Ironcliw` (or `pnpm remove -g` / `bun remove -g` if you installed that way).

### Source checkout (git clone)

If you run from a repo checkout (`git clone` + `Ironcliw ...` / `bun run Ironcliw ...`):

1. Uninstall the gateway service **before** deleting the repo (use the easy path above or manual service removal).
2. Delete the repo directory.
3. Remove state + workspace as shown above.

