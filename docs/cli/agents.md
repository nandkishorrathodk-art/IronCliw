---
summary: "CLI reference for `IronCliw agents` (list/add/delete/bindings/bind/unbind/set identity)"
read_when:
  - You want multiple isolated agents (workspaces + routing + auth)
title: "agents"
---

# `IronCliw agents`

Manage isolated agents (workspaces + auth + routing).

Related:

- Multi-agent routing: [Multi-Agent Routing](/concepts/multi-agent)
- Agent workspace: [Agent workspace](/concepts/agent-workspace)

## Examples

```bash
IronCliw agents list
IronCliw agents add work --workspace ~/.IronCliw/workspace-work
IronCliw agents bindings
IronCliw agents bind --agent work --bind telegram:ops
IronCliw agents unbind --agent work --bind telegram:ops
IronCliw agents set-identity --workspace ~/.IronCliw/workspace --from-identity
IronCliw agents set-identity --agent main --avatar avatars/IronCliw.png
IronCliw agents delete work
```

## Routing bindings

Use routing bindings to pin inbound channel traffic to a specific agent.

List bindings:

```bash
IronCliw agents bindings
IronCliw agents bindings --agent work
IronCliw agents bindings --json
```

Add bindings:

```bash
IronCliw agents bind --agent work --bind telegram:ops --bind discord:guild-a
```

If you omit `accountId` (`--bind <channel>`), IronCliw resolves it from channel defaults and plugin setup hooks when available.

### Binding scope behavior

- A binding without `accountId` matches the channel default account only.
- `accountId: "*"` is the channel-wide fallback (all accounts) and is less specific than an explicit account binding.
- If the same agent already has a matching channel binding without `accountId`, and you later bind with an explicit or resolved `accountId`, IronCliw upgrades that existing binding in place instead of adding a duplicate.

Example:

```bash
# initial channel-only binding
IronCliw agents bind --agent work --bind telegram

# later upgrade to account-scoped binding
IronCliw agents bind --agent work --bind telegram:ops
```

After the upgrade, routing for that binding is scoped to `telegram:ops`. If you also want default-account routing, add it explicitly (for example `--bind telegram:default`).

Remove bindings:

```bash
IronCliw agents unbind --agent work --bind telegram:ops
IronCliw agents unbind --agent work --all
```

## Identity files

Each agent workspace can include an `IDENTITY.md` at the workspace root:

- Example path: `~/.IronCliw/workspace/IDENTITY.md`
- `set-identity --from-identity` reads from the workspace root (or an explicit `--identity-file`)

Avatar paths resolve relative to the workspace root.

## Set identity

`set-identity` writes fields into `agents.list[].identity`:

- `name`
- `theme`
- `emoji`
- `avatar` (workspace-relative path, http(s) URL, or data URI)

Load from `IDENTITY.md`:

```bash
IronCliw agents set-identity --workspace ~/.IronCliw/workspace --from-identity
```

Override fields explicitly:

```bash
IronCliw agents set-identity --agent main --name "IronCliw" --emoji "🦾" --avatar avatars/IronCliw.png
```

Config sample:

```json5
{
  agents: {
    list: [
      {
        id: "main",
        identity: {
          name: "IronCliw",
          theme: "iron grip",
          emoji: "🦾",
          avatar: "avatars/IronCliw.png",
        },
      },
    ],
  },
}
```
