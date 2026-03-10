# 🦾 IronCliw — Security Policy

> **IronCliw is a fork of [OpenClaw](https://github.com/openclaw/openclaw).**
> Security architecture, trust model, and threat boundaries are inherited from OpenClaw.
> Full credit to the OpenClaw security team.

**Maintained by:** Nandkishor Rathod
**Contact:** Open a [GitHub Security Advisory](https://github.com/nandkishorrathodk-art/IronCliw/security/advisories/new) (preferred) or email via GitHub profile.

---

## Reporting a Vulnerability

If you believe you've found a security issue in IronCliw, **please report it privately** — do not open a public issue.

**Preferred:** [GitHub Security Advisory](https://github.com/nandkishorrathodk-art/IronCliw/security/advisories/new)

### What to Include

1. **Title** — short description
2. **Severity Assessment** — Critical / High / Medium / Low
3. **Impact** — what can an attacker do?
4. **Affected Component** — file, function, line range, version/commit SHA
5. **Reproduction Steps** — step-by-step PoC against latest `main`
6. **Demonstrated Impact** — evidence tied to IronCliw's trust boundaries
7. **Environment** — OS, Node version, IronCliw version
8. **Remediation Advice** — suggested fix if you have one

Reports without reproduction steps and demonstrated impact will be deprioritized.

---

## Operator Trust Model

IronCliw is a **personal assistant** — one trusted operator, one gateway. It does **not** model a single gateway as a multi-tenant, adversarial-user boundary.

- Authenticated Gateway callers are treated as **trusted operators** for that gateway instance.
- Session identifiers (`sessionKey`, session IDs) are **routing controls**, not per-user authorization boundaries.
- If multiple people share one gateway, they share its delegated tool authority.

**Recommended setup:** one user per machine/host, one gateway per user.

For multi-user setups: use **separate OS users + separate gateways** per trust boundary.

---

## Security Defaults

```bash
ironcliw security audit --deep   # scan for risky config
ironcliw security audit --fix    # auto-fix safe issues
ironcliw doctor                  # general health check
```

### DM Pairing (Default)

Unknown senders receive a pairing code — the bot does **not** process their message until approved:

```bash
ironcliw pairing approve <channel> <code>
```

### Gateway Binding (Default: Loopback)

The gateway binds to `127.0.0.1` by default. Do **not** expose it directly to the public internet.

For remote access: use **SSH tunnel** or **Tailscale Serve/Funnel** instead.

---

## Out of Scope

The following are **not treated as security vulnerabilities** in IronCliw's trust model:

- Prompt-injection-only attacks (no policy/auth/sandbox boundary bypass)
- Reports requiring write access to trusted local state (`~/.ironcliw`, `MEMORY.md`)
- Operator-intended local features presented as remote injection (e.g. TUI `!` shell)
- Explicit trusted-operator control surfaces (e.g. `canvas.eval`, `node.invoke`) used as intended
- Authorized user-triggered local actions without auth/sandbox bypass
- Trusted-installed plugin executing with gateway privileges (documented behavior)
- Multi-user data access on a shared single gateway (not a supported configuration)
- Reports that only show heuristic/parity drift in command-risk detection
- Scanner-only claims without a working reproduction
- Missing HSTS on default local/loopback deployments
- Public internet exposure warnings when gateway is correctly loopback-only

---

## Trust Boundaries

### Gateway

- Authenticated Gateway callers → **trusted operators**
- Exec approvals (allowlist/ask UI) → **operator guardrails**, not multi-tenant auth
- Session identifiers → **routing controls**, not per-user authorization

### Nodes (macOS / iOS / Android)

- Pairing a node grants operator-level remote capability on that node
- Node is an execution extension of the Gateway — same trust boundary

### Plugins / Extensions

- Plugins load **in-process** with the Gateway
- Installing a plugin grants it the same trust level as local code on that host
- Only install plugins you trust; use `plugins.allow` to pin trusted plugin IDs
- Reports must show a boundary bypass, not just malicious behavior from a trusted-installed plugin

### Workspace Memory (`MEMORY.md`, `memory/*.md`)

- Treated as trusted local operator state
- If someone can edit workspace memory, they already crossed the operator boundary
- This is out of scope unless an untrusted boundary bypass is demonstrated

---

## Runtime Requirements

**Node.js ≥ 22.12.0** (LTS) is required.

```bash
node --version  # must be v22.12.0 or later
```

---

## Hardening Checklist

### Filesystem

```jsonc
// ironcliw.json
{
  "tools": {
    "exec": {
      "applyPatch": { "workspaceOnly": true }  // recommended
    },
    "fs": {
      "workspaceOnly": true  // optional: restrict read/write to workspace
    }
  }
}
```

### Sub-agent Delegation

- Keep `sessions_spawn` denied unless explicitly needed
- Keep `agents.list[].subagents.allowAgents` narrow
- Use `sandbox: "require"` when delegation must stay sandboxed

### Docker

```bash
docker run --read-only --cap-drop=ALL \
  -v ironcliw-data:/app/data \
  ironcliw/ironcliw:latest
```

---

## Secret Scanning

This project uses `detect-secrets` for automated secret detection in CI/CD.

```bash
pip install detect-secrets==1.5.0
detect-secrets scan --baseline .secrets.baseline
```

---

## Bug Bounties

IronCliw is a personal open-source project. There is no bug bounty program.
The best way to contribute is to send a PR with a fix.

---

## Credits

Security architecture and trust model inherited from **[OpenClaw](https://github.com/openclaw/openclaw)**.
Full credit to the OpenClaw security team and contributors.
