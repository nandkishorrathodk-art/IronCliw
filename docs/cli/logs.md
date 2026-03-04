---
summary: "CLI reference for `Ironcliw logs` (tail gateway logs via RPC)"
read_when:
  - You need to tail Gateway logs remotely (without SSH)
  - You want JSON log lines for tooling
title: "logs"
---

# `Ironcliw logs`

Tail Gateway file logs over RPC (works in remote mode).

Related:

- Logging overview: [Logging](/logging)

## Examples

```bash
Ironcliw logs
Ironcliw logs --follow
Ironcliw logs --json
Ironcliw logs --limit 500
Ironcliw logs --local-time
Ironcliw logs --follow --local-time
```

Use `--local-time` to render timestamps in your local timezone.

