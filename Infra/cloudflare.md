---
doc: infra/cloudflare
updated: 2026-07-21
status: live, wrangler auth good as of 2026-07-20
---

# Cloudflare — Allternit

## Account

- Account `7cd19487307235aedc039d3a64ad7039` (`allternitpbc@gmail.com`).
- Zone id for allternit.com: `5ebf34ee08d574ea107bbeb83395723a`.
- wrangler 4.x is OAuth-authed on this Mac (token in `~/Library/Preferences/.wrangler/config/default.toml`). Scopes include `pages:write` + `zone:read` but **not** `dns_records:edit` — DNS changes need the dashboard or a separately scoped API token.
- Cloudflare Email Routing enabled on the zone 2026-07-21 (safe — `allternit.com` had zero prior MX records); destination `allternitpbc@gmail.com` auto-verified since it's the account's own login email. Used by the Stripe booking-webhook Worker (see `stripe.md`) to notify on new bookings.

## Pages projects (real names — the checked-in deploy script had stale ones until fixed 2026-07-20)

| Project | Domain | Source |
|---|---|---|
| `allternit` | allternit.com, www.allternit.com | `Allternit Websites/Projects/www.allternit.com/source/app` |
| `allternit-learning-labs` | labs.allternit.com | `Allternit Websites/Projects/labs.allternit.com/source` |
| `allternit-services` | services.allternit.com | `Allternit Websites/Projects/services.allternit.com/source` |
| `ai-allternit` | — | — |
| `allternit-platform` | — | — |
| `allternit-docs` | — | — |
| `gizziio` | — | — |
| `gizzi-code-docs` | — | — |
| `install-allternit` | — | — |

`www.allternit.com` was dead (no DNS record) until 2026-07-20 — fixed by adding it as a custom domain on project `allternit` via API plus a proxied CNAME `www → allternit.pages.dev`. Confirmed live with a valid cert.

## Deploy

- `Allternit Websites/Projects/deploy-labs-and-main.sh` deploys `labs.allternit.com`, `www.allternit.com`, and `services.allternit.com` in one run. The script was fixed 2026-07-22 to use an absolute `SCRIPT_DIR` so the second and third `cd` commands don't break after the first `cd`.
- All three sites were deployed 2026-07-22:
  - `labs.allternit.com` → project `allternit-learning-labs`
  - `www.allternit.com` → project `allternit`
  - `services.allternit.com` → project `allternit-services`
- `services.allternit.com` is plain HTML/CSS/vanilla JS with no build step — deploys directly from `source/`.
- The Electron desktop app's platform surface is a **static export** copied by `scripts/prepare-platform-static.cjs` from `surfaces/ai.allternit.com` in the main workspace repo (`../allternit-workspace/allternit`) — see `deploy-runbook.md`.

Related: [[stripe.md]], [[deploy-runbook.md]].
