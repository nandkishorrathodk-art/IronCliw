---
summary: "Uninstall IronCliw completely (CLI, service, state, workspace)"
read_when:
  - You want to remove IronCliw from a machine
  - The gateway service is still running after uninstall
title: "Uninstall"
---

# Uninstall

Two paths:

- **Easy path** if `ironcliw` is still installed.
- **Manual service removal** if the CLI is gone but the service is still running.

## Easy path (CLI still installed)

Recommended: use the built-in uninstaller:

```bash
ironcliw uninstall
```

Non-interactive (automation / npx):

```bash
ironcliw uninstall --all --yes --non-interactive
npx -y ironcliw uninstall --all --yes --non-interactive
```

Manual steps (same result):

1. Stop the gateway service:

```bash
ironcliw gateway stop
```

2. Uninstall the gateway service (launchd/systemd/schtasks):

```bash
ironcliw gateway uninstall
```

3. Delete state + config:

```bash
rm -rf "${IRONCLIW_STATE_DIR:-$HOME/.ironcliw}"
```

If you set `IRONCLIW_CONFIG_PATH` to a custom location outside the state dir, delete that file too.

4. Delete your workspace (optional, removes agent files):

```bash
rm -rf ~/.ironcliw/workspace
```

5. Remove the CLI install (pick the one you used):

```bash
npm rm -g ironcliw
pnpm remove -g ironcliw
bun remove -g ironcliw
```

6. If you installed the macOS app:

```bash
rm -rf /Applications/IronCliw.app
```

Notes:

- If you used profiles (`--profile` / `IRONCLIW_PROFILE`), repeat step 3 for each state dir (defaults are `~/.ironcliw-<profile>`).
- In remote mode, the state dir lives on the **gateway host**, so run steps 1-4 there too.

## Manual service removal (CLI not installed)

Use this if the gateway service keeps running but `ironcliw` is missing.

### macOS (launchd)

Default label is `ai.ironcliw.gateway` (or `ai.ironcliw.<profile>`; legacy `com.ironcliw.*` may still exist):

```bash
launchctl bootout gui/$UID/ai.ironcliw.gateway
rm -f ~/Library/LaunchAgents/ai.ironcliw.gateway.plist
```

If you used a profile, replace the label and plist name with `ai.ironcliw.<profile>`. Remove any legacy `com.ironcliw.*` plists if present.

### Linux (systemd user unit)

Default unit name is `ironcliw-gateway.service` (or `ironcliw-gateway-<profile>.service`):

```bash
systemctl --user disable --now ironcliw-gateway.service
rm -f ~/.config/systemd/user/ironcliw-gateway.service
systemctl --user daemon-reload
```

### Windows (Scheduled Task)

Default task name is `IronCliw Gateway` (or `IronCliw Gateway (<profile>)`).
The task script lives under your state dir.

```powershell
schtasks /Delete /F /TN "IronCliw Gateway"
Remove-Item -Force "$env:USERPROFILE\.ironcliw\gateway.cmd"
```

If you used a profile, delete the matching task name and `~\.ironcliw-<profile>\gateway.cmd`.

## Normal install vs source checkout

### Normal install (install.sh / npm / pnpm / bun)

If you used `https://ironcliw.ai/install.sh` or `install.ps1`, the CLI was installed with `npm install -g ironcliw@latest`.
Remove it with `npm rm -g ironcliw` (or `pnpm remove -g` / `bun remove -g` if you installed that way).

### Source checkout (git clone)

If you run from a repo checkout (`git clone` + `ironcliw ...` / `bun run ironcliw ...`):

1. Uninstall the gateway service **before** deleting the repo (use the easy path above or manual service removal).
2. Delete the repo directory.
3. Remove state + workspace as shown above.
