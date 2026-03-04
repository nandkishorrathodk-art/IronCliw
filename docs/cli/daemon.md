---
summary: "CLI reference for `Ironcliw daemon` (legacy alias for gateway service management)"
read_when:
  - You still use `Ironcliw daemon ...` in scripts
  - You need service lifecycle commands (install/start/stop/restart/status)
title: "daemon"
---

# `Ironcliw daemon`

Legacy alias for Gateway service management commands.

`Ironcliw daemon ...` maps to the same service control surface as `Ironcliw gateway ...` service commands.

## Usage

```bash
Ironcliw daemon status
Ironcliw daemon install
Ironcliw daemon start
Ironcliw daemon stop
Ironcliw daemon restart
Ironcliw daemon uninstall
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

Use [`Ironcliw gateway`](/cli/gateway) for current docs and examples.

