---
summary: "CLI reference for `ironcliw config` (get/set/unset/file/validate)"
read_when:
  - You want to read or edit config non-interactively
title: "config"
---

# `ironcliw config`

Config helpers: get/set/unset/validate values by path and print the active
config file. Run without a subcommand to open
the configure wizard (same as `ironcliw configure`).

## Examples

```bash
ironcliw config file
ironcliw config get browser.executablePath
ironcliw config set browser.executablePath "/usr/bin/google-chrome"
ironcliw config set agents.defaults.heartbeat.every "2h"
ironcliw config set agents.list[0].tools.exec.node "node-id-or-name"
ironcliw config unset tools.web.search.apiKey
ironcliw config validate
ironcliw config validate --json
```

## Paths

Paths use dot or bracket notation:

```bash
ironcliw config get agents.defaults.workspace
ironcliw config get agents.list[0].id
```

Use the agent list index to target a specific agent:

```bash
ironcliw config get agents.list
ironcliw config set agents.list[1].tools.exec.node "node-id-or-name"
```

## Values

Values are parsed as JSON5 when possible; otherwise they are treated as strings.
Use `--strict-json` to require JSON5 parsing. `--json` remains supported as a legacy alias.

```bash
ironcliw config set agents.defaults.heartbeat.every "0m"
ironcliw config set gateway.port 19001 --strict-json
ironcliw config set channels.whatsapp.groups '["*"]' --strict-json
```

## Subcommands

- `config file`: Print the active config file path (resolved from `IRONCLIW_CONFIG_PATH` or default location).

Restart the gateway after edits.

## Validate

Validate the current config against the active schema without starting the
gateway.

```bash
ironcliw config validate
ironcliw config validate --json
```
