---
summary: "CLI reference for `Ironcliw reset` (reset local state/config)"
read_when:
  - You want to wipe local state while keeping the CLI installed
  - You want a dry-run of what would be removed
title: "reset"
---

# `Ironcliw reset`

Reset local config/state (keeps the CLI installed).

```bash
Ironcliw reset
Ironcliw reset --dry-run
Ironcliw reset --scope config+creds+sessions --yes --non-interactive
```

