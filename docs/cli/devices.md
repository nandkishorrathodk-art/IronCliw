---
summary: "CLI reference for `IronCliw devices` (device pairing + token rotation/revocation)"
read_when:
  - You are approving device pairing requests
  - You need to rotate or revoke device tokens
title: "devices"
---

# `IronCliw devices`

Manage device pairing requests and device-scoped tokens.

## Commands

### `IronCliw devices list`

List pending pairing requests and paired devices.

```
IronCliw devices list
IronCliw devices list --json
```

### `IronCliw devices remove <deviceId>`

Remove one paired device entry.

```
IronCliw devices remove <deviceId>
IronCliw devices remove <deviceId> --json
```

### `IronCliw devices clear --yes [--pending]`

Clear paired devices in bulk.

```
IronCliw devices clear --yes
IronCliw devices clear --yes --pending
IronCliw devices clear --yes --pending --json
```

### `IronCliw devices approve [requestId] [--latest]`

Approve a pending device pairing request. If `requestId` is omitted, IronCliw
automatically approves the most recent pending request.

```
IronCliw devices approve
IronCliw devices approve <requestId>
IronCliw devices approve --latest
```

### `IronCliw devices reject <requestId>`

Reject a pending device pairing request.

```
IronCliw devices reject <requestId>
```

### `IronCliw devices rotate --device <id> --role <role> [--scope <scope...>]`

Rotate a device token for a specific role (optionally updating scopes).

```
IronCliw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

### `IronCliw devices revoke --device <id> --role <role>`

Revoke a device token for a specific role.

```
IronCliw devices revoke --device <deviceId> --role node
```

## Common options

- `--url <url>`: Gateway WebSocket URL (defaults to `gateway.remote.url` when configured).
- `--token <token>`: Gateway token (if required).
- `--password <password>`: Gateway password (password auth).
- `--timeout <ms>`: RPC timeout.
- `--json`: JSON output (recommended for scripting).

Note: when you set `--url`, the CLI does not fall back to config or environment credentials.
Pass `--token` or `--password` explicitly. Missing explicit credentials is an error.

## Notes

- Token rotation returns a new token (sensitive). Treat it like a secret.
- These commands require `operator.pairing` (or `operator.admin`) scope.
- `devices clear` is intentionally gated by `--yes`.
- If pairing scope is unavailable on local loopback (and no explicit `--url` is passed), list/approve can use a local pairing fallback.

