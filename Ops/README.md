# Allternit Brain — Ops Gateway

MCP gateway for Allternit LLC business operations. Lives inside `Allternit Brain/Ops/` so agents can read brain knowledge and act on it through one system. Stdio MCP server — every business-ops skill, delegated CLI agent (kimi/codex/agy), and future autonomous agent should go through this instead of touching Stripe keys, wrangler, or the brain directly.

## Tools

| Tool | Effect | Safety |
|---|---|---|
| `stripe_charges_enabled` | Read-only account status check | none needed |
| `stripe_list_recent_invoices` | Read-only invoice list | none needed |
| `stripe_send_invoice` | Wraps `send_invoice.py` | defaults to `--dry-run`; needs `confirm: true` to actually finalize/send |
| `cloudflare_list_pages_projects` | Read-only `wrangler pages project list` | none needed |
| `cloudflare_deploy_pages` | Deploys a directory to a Pages project | prints the command only unless `confirm: true`; `project` restricted to a known-projects enum |
| `brain_search` | Grep over `Allternit Brain/**/*.md` | read-only |
| `brain_read` | Read one brain doc | read-only, path-traversal-guarded to the brain root |
| `model_route` | Look up which model tier/backend to use for a task class (`model-routing.json`) | read-only; only meaningful when spawning a subagent or autonomous agent — an interactive session stays on its own model |
| `client_new_folder_skeleton` | Creates `Allternit LLC/06 Client Ops And Contracts/<Client>/` and copies business-ops-kit templates in, named per the kickoff playbook's convention | local file writes only — never touches Stripe or sends anything; those steps stay manual per the playbook |

## Setup

```bash
cd ~/Desktop/Allternit/Allternit Brain/Ops
npm install
```

Requires: `python3` (for `stripe_send_invoice`), the Stripe key in the macOS Keychain (`security find-generic-password -s stripe-allternit -w`, fallback env var `STRIPE_KEY`), and network access to `api.stripe.com`. Cloudflare tools shell out to `npx wrangler`, which resolves an already-OAuth-authed `wrangler` — no separate credential needed on this Mac.

## Register with Claude Code

Add to Claude Code's MCP config (`claude mcp add` or the relevant `.mcp.json`/settings entry):

```json
{
  "mcpServers": {
    "allternit-ops": {
      "command": "node",
      "args": ["/Users/joe/Desktop/Allternit/Allternit Brain/Ops/index.js"]
    }
  }
}
```

## Known gap (2026-07-21)

`stripe_charges_enabled` fails with a permission error on the current `claude-setup` restricted key — it lacks the `accounts_kyc_basic_read` scope needed for `GET /v1/account`. Add that scope via the Stripe dashboard (link is in the error message) if this tool needs to work; everything else (invoices, customers) already has write access per `Allternit Brain/infra/stripe.md`.

## Design notes

- Money- and deploy-affecting tools mirror `send_invoice.py`'s own `--dry-run`-by-default pattern: nothing irreversible happens without an explicit `confirm: true`.
- `cloudflare_deploy_pages` only accepts project names from a fixed list (sourced from `Allternit Brain/infra/cloudflare.md`) so a typo can't push to the wrong project.
- This is intentionally a separate package from the platform's own `mcp/servers` (which turned out to be an unrelated MCP-Apps/interactive-capsules protocol library, not a tool-server scaffold) — company-ops tooling stays out of the product repo.
