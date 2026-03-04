---
summary: "CLI reference for `IronCliw daemon` (legacy alias for gateway service management)"
read_when:
  - You still use `IronCliw daemon ...` in scripts
  - You need service lifecycle commands (install/start/stop/restart/status)
title: "daemon"
---

# `IronCliw daemon`

Legacy alias for Gateway service management commands.

`IronCliw daemon ...` maps to the same service control surface as `IronCliw gateway ...` service commands.

## Usage

```bash
IronCliw daemon status
IronCliw daemon install
IronCliw daemon start
IronCliw daemon stop
IronCliw daemon restart
IronCliw daemon uninstall
```

## Subcommands

- `status`: show service install state and probe Gateway health
- `install`: install service (`launchd`/`systemd`/`schtasks`)
- `uninstall`: remove service
- `start`: start service
- `stop`: stop service
- `restart`: restart service

## Common options

- `status`: `--url`, `--token`, `--password`, `--timeout`, `--no-probe`, `--deep`, `--json`
- `install`: `--port`, `--runtime <node|bun>`, `--token`, `--force`, `--json`
- lifecycle (`uninstall|start|stop|restart`): `--json`

## Prefer

Use [`IronCliw gateway`](/cli/gateway) for current docs and examples.

