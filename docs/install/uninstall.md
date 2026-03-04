---
summary: "Uninstall IronCliw completely (CLI, service, state, workspace)"
read_when:
  - You want to remove IronCliw from a machine
  - The gateway service is still running after uninstall
title: "Uninstall"
---

# Uninstall

Two paths:

- **Easy path** if `IronCliw` is still installed.
- **Manual service removal** if the CLI is gone but the service is still running.

## Easy path (CLI still installed)

Recommended: use the built-in uninstaller:

```bash
IronCliw uninstall
```

Non-interactive (automation / npx):

```bash
IronCliw uninstall --all --yes --non-interactive
npx -y IronCliw uninstall --all --yes --non-interactive
```

Manual steps (same result):

1. Stop the gateway service:

```bash
IronCliw gateway stop
```

2. Uninstall the gateway service (launchd/systemd/schtasks):

```bash
IronCliw gateway uninstall
```

3. Delete state + config:

```bash
rm -rf "${IronCliw_STATE_DIR:-$HOME/.IronCliw}"
```

If you set `IronCliw_CONFIG_PATH` to a custom location outside the state dir, delete that file too.

4. Delete your workspace (optional, removes agent files):

```bash
rm -rf ~/.IronCliw/workspace
```

5. Remove the CLI install (pick the one you used):

```bash
npm rm -g IronCliw
pnpm remove -g IronCliw
bun remove -g IronCliw
```

6. If you installed the macOS app:

```bash
rm -rf /Applications/IronCliw.app
```

Notes:

- If you used profiles (`--profile` / `IronCliw_PROFILE`), repeat step 3 for each state dir (defaults are `~/.IronCliw-<profile>`).
- In remote mode, the state dir lives on the **gateway host**, so run steps 1-4 there too.

## Manual service removal (CLI not installed)

Use this if the gateway service keeps running but `IronCliw` is missing.

### macOS (launchd)

Default label is `ai.IronCliw.gateway` (or `ai.IronCliw.<profile>`; legacy `com.IronCliw.*` may still exist):

```bash
launchctl bootout gui/$UID/ai.IronCliw.gateway
rm -f ~/Library/LaunchAgents/ai.IronCliw.gateway.plist
```

If you used a profile, replace the label and plist name with `ai.IronCliw.<profile>`. Remove any legacy `com.IronCliw.*` plists if present.

### Linux (systemd user unit)

Default unit name is `IronCliw-gateway.service` (or `IronCliw-gateway-<profile>.service`):

```bash
systemctl --user disable --now IronCliw-gateway.service
rm -f ~/.config/systemd/user/IronCliw-gateway.service
systemctl --user daemon-reload
```

### Windows (Scheduled Task)

Default task name is `IronCliw Gateway` (or `IronCliw Gateway (<profile>)`).
The task script lives under your state dir.

```powershell
schtasks /Delete /F /TN "IronCliw Gateway"
Remove-Item -Force "$env:USERPROFILE\.IronCliw\gateway.cmd"
```

If you used a profile, delete the matching task name and `~\.IronCliw-<profile>\gateway.cmd`.

## Normal install vs source checkout

### Normal install (install.sh / npm / pnpm / bun)

If you used `https://IronCliw.ai/install.sh` or `install.ps1`, the CLI was installed with `npm install -g IronCliw@latest`.
Remove it with `npm rm -g IronCliw` (or `pnpm remove -g` / `bun remove -g` if you installed that way).

### Source checkout (git clone)

If you run from a repo checkout (`git clone` + `IronCliw ...` / `bun run IronCliw ...`):

1. Uninstall the gateway service **before** deleting the repo (use the easy path above or manual service removal).
2. Delete the repo directory.
3. Remove state + workspace as shown above.

