---
summary: "CLI reference for `ironcliw logs` (tail gateway logs via RPC)"
read_when:
  - You need to tail Gateway logs remotely (without SSH)
  - You want JSON log lines for tooling
title: "logs"
---

# `ironcliw logs`

Tail Gateway file logs over RPC (works in remote mode).

Related:

- Logging overview: [Logging](/logging)

## Examples

```bash
ironcliw logs
ironcliw logs --follow
ironcliw logs --json
ironcliw logs --limit 500
ironcliw logs --local-time
ironcliw logs --follow --local-time
```

Use `--local-time` to render timestamps in your local timezone.
