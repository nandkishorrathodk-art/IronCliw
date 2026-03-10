---
summary: "CLI reference for `ironcliw uninstall` (remove gateway service + local data)"
read_when:
  - You want to remove the gateway service and/or local state
  - You want a dry-run first
title: "uninstall"
---

# `ironcliw uninstall`

Uninstall the gateway service + local data (CLI remains).

```bash
ironcliw backup create
ironcliw uninstall
ironcliw uninstall --all --yes
ironcliw uninstall --dry-run
```

Run `ironcliw backup create` first if you want a restorable snapshot before removing state or workspaces.
