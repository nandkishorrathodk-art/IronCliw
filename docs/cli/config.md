---
summary: "CLI reference for `Ironcliw config` (get/set/unset/file/validate)"
read_when:
  - You want to read or edit config non-interactively
title: "config"
---

# `Ironcliw config`

Config helpers: get/set/unset/validate values by path and print the active
config file. Run without a subcommand to open
the configure wizard (same as `Ironcliw configure`).

## Examples

```bash
Ironcliw config file
Ironcliw config get browser.executablePath
Ironcliw config set browser.executablePath "/usr/bin/google-chrome"
Ironcliw config set agents.defaults.heartbeat.every "2h"
Ironcliw config set agents.list[0].tools.exec.node "node-id-or-name"
Ironcliw config unset tools.web.search.apiKey
Ironcliw config validate
Ironcliw config validate --json
```

## Paths

Paths use dot or bracket notation:

```bash
Ironcliw config get agents.defaults.workspace
Ironcliw config get agents.list[0].id
```

Use the agent list index to target a specific agent:

```bash
Ironcliw config get agents.list
Ironcliw config set agents.list[1].tools.exec.node "node-id-or-name"
```

## Values

Values are parsed as JSON5 when possible; otherwise they are treated as strings.
Use `--strict-json` to require JSON5 parsing. `--json` remains supported as a legacy alias.

```bash
Ironcliw config set agents.defaults.heartbeat.every "0m"
Ironcliw config set gateway.port 19001 --strict-json
Ironcliw config set channels.whatsapp.groups '["*"]' --strict-json
```

## Subcommands

- `config file`: Print the active config file path (resolved from `IRONCLIW_CONFIG_PATH` or default location).

Restart the gateway after edits.

## Validate

Validate the current config against the active schema without starting the
gateway.

```bash
Ironcliw config validate
Ironcliw config validate --json
```

