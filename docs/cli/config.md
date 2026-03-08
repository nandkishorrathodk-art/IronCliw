---
summary: "CLI reference for `IronCliw config` (get/set/unset/file/validate)"
read_when:
  - You want to read or edit config non-interactively
title: "config"
---

# `IronCliw config`

Config helpers: get/set/unset/validate values by path and print the active
config file. Run without a subcommand to open
the configure wizard (same as `IronCliw configure`).

## Examples

```bash
IronCliw config file
IronCliw config get browser.executablePath
IronCliw config set browser.executablePath "/usr/bin/google-chrome"
IronCliw config set agents.defaults.heartbeat.every "2h"
IronCliw config set agents.list[0].tools.exec.node "node-id-or-name"
IronCliw config unset tools.web.search.apiKey
IronCliw config validate
IronCliw config validate --json
```

## Paths

Paths use dot or bracket notation:

```bash
IronCliw config get agents.defaults.workspace
IronCliw config get agents.list[0].id
```

Use the agent list index to target a specific agent:

```bash
IronCliw config get agents.list
IronCliw config set agents.list[1].tools.exec.node "node-id-or-name"
```

## Values

Values are parsed as JSON5 when possible; otherwise they are treated as strings.
Use `--strict-json` to require JSON5 parsing. `--json` remains supported as a legacy alias.

```bash
IronCliw config set agents.defaults.heartbeat.every "0m"
IronCliw config set gateway.port 19001 --strict-json
IronCliw config set channels.whatsapp.groups '["*"]' --strict-json
```

## Subcommands

- `config file`: Print the active config file path (resolved from `IronCliw_CONFIG_PATH` or default location).

Restart the gateway after edits.

## Validate

Validate the current config against the active schema without starting the
gateway.

```bash
IronCliw config validate
IronCliw config validate --json
```
