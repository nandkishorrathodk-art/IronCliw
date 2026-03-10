---
summary: "CLI reference for `ironcliw reset` (reset local state/config)"
read_when:
  - You want to wipe local state while keeping the CLI installed
  - You want a dry-run of what would be removed
title: "reset"
---

# `ironcliw reset`

Reset local config/state (keeps the CLI installed).

```bash
ironcliw backup create
ironcliw reset
ironcliw reset --dry-run
ironcliw reset --scope config+creds+sessions --yes --non-interactive
```

Run `ironcliw backup create` first if you want a restorable snapshot before removing local state.
