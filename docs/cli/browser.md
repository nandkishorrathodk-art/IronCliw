---
summary: "CLI reference for `Ironcliw browser` (profiles, tabs, actions, extension relay)"
read_when:
  - You use `Ironcliw browser` and want examples for common tasks
  - You want to control a browser running on another machine via a node host
  - You want to use the Chrome extension relay (attach/detach via toolbar button)
title: "browser"
---

# `Ironcliw browser`

Manage Ironcliw’s browser control server and run browser actions (tabs, snapshots, screenshots, navigation, clicks, typing).

Related:

- Browser tool + API: [Browser tool](/tools/browser)
- Chrome extension relay: [Chrome extension](/tools/chrome-extension)

## Common flags

- `--url <gatewayWsUrl>`: Gateway WebSocket URL (defaults to config).
- `--token <token>`: Gateway token (if required).
- `--timeout <ms>`: request timeout (ms).
- `--browser-profile <name>`: choose a browser profile (default from config).
- `--json`: machine-readable output (where supported).

## Quick start (local)

```bash
Ironcliw browser --browser-profile chrome tabs
Ironcliw browser --browser-profile Ironcliw start
Ironcliw browser --browser-profile Ironcliw open https://example.com
Ironcliw browser --browser-profile Ironcliw snapshot
```

## Profiles

Profiles are named browser routing configs. In practice:

- `Ironcliw`: launches/attaches to a dedicated Ironcliw-managed Chrome instance (isolated user data dir).
- `chrome`: controls your existing Chrome tab(s) via the Chrome extension relay.

```bash
Ironcliw browser profiles
Ironcliw browser create-profile --name work --color "#FF5A36"
Ironcliw browser delete-profile --name work
```

Use a specific profile:

```bash
Ironcliw browser --browser-profile work tabs
```

## Tabs

```bash
Ironcliw browser tabs
Ironcliw browser open https://docs.Ironcliw.ai
Ironcliw browser focus <targetId>
Ironcliw browser close <targetId>
```

## Snapshot / screenshot / actions

Snapshot:

```bash
Ironcliw browser snapshot
```

Screenshot:

```bash
Ironcliw browser screenshot
```

Navigate/click/type (ref-based UI automation):

```bash
Ironcliw browser navigate https://example.com
Ironcliw browser click <ref>
Ironcliw browser type <ref> "hello"
```

## Chrome extension relay (attach via toolbar button)

This mode lets the agent control an existing Chrome tab that you attach manually (it does not auto-attach).

Install the unpacked extension to a stable path:

```bash
Ironcliw browser extension install
Ironcliw browser extension path
```

Then Chrome → `chrome://extensions` → enable “Developer mode” → “Load unpacked” → select the printed folder.

Full guide: [Chrome extension](/tools/chrome-extension)

## Remote browser control (node host proxy)

If the Gateway runs on a different machine than the browser, run a **node host** on the machine that has Chrome/Brave/Edge/Chromium. The Gateway will proxy browser actions to that node (no separate browser control server required).

Use `gateway.nodes.browser.mode` to control auto-routing and `gateway.nodes.browser.node` to pin a specific node if multiple are connected.

Security + remote setup: [Browser tool](/tools/browser), [Remote access](/gateway/remote), [Tailscale](/gateway/tailscale), [Security](/gateway/security)

