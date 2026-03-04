---
summary: "CLI reference for `IronCliw agent` (send one agent turn via the Gateway)"
read_when:
  - You want to run one agent turn from scripts (optionally deliver reply)
title: "agent"
---

# `IronCliw agent`

Run an agent turn via the Gateway (use `--local` for embedded).
Use `--agent <id>` to target a configured agent directly.

Related:

- Agent send tool: [Agent send](/tools/agent-send)

## Examples

```bash
IronCliw agent --to +15555550123 --message "status update" --deliver
IronCliw agent --agent ops --message "Summarize logs"
IronCliw agent --session-id 1234 --message "Summarize inbox" --thinking medium
IronCliw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
```

