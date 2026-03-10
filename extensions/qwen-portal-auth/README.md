# Qwen OAuth (IronCliw plugin)

OAuth provider plugin for **Qwen** (free-tier OAuth).

## Enable

Bundled plugins are disabled by default. Enable this one:

```bash
ironcliw plugins enable qwen-portal-auth
```

Restart the Gateway after enabling.

## Authenticate

```bash
ironcliw models auth login --provider qwen-portal --set-default
```

## Notes

- Qwen OAuth uses a device-code login flow.
- Tokens auto-refresh; re-run login if refresh fails or access is revoked.
