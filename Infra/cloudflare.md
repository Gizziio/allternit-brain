---
doc: infra/cloudflare
updated: 2026-09-05
status: active
---

# Cloudflare — Allternit

**Status note:** Live account; wrangler OAuth good as of 2026-09-05. Pages deploys work. DNS writes do **not**.

## Account

- Account `7cd19487307235aedc039d3a64ad7039` (`allternitpbc@gmail.com`).
- Zone id for allternit.com: `5ebf34ee08d574ea107bbeb83395723a`.
- wrangler 4.x OAuth is in `~/.wrangler/config/default.toml` (not `~/Library/Preferences/.wrangler/...`). Scopes include `pages:write` + `zone:read` + `email_routing:write` but **not** `dns_records:edit` — DNS changes need the dashboard or a separately scoped API token.
- `Allternit Websites/.cloudflare-env` token can call the Pages REST API (project create, deploy via wrangler, custom domains bind) and **cannot** call `dns_records`. Adding a Pages custom domain with this token binds the hostname on the project but does **not** create the zone CNAME.
- Cloudflare Email Routing enabled on the zone 2026-07-21 (safe — `allternit.com` had zero prior MX records); destination `allternitpbc@gmail.com` auto-verified since it's the account's own login email. Used by the Stripe booking-webhook Worker (see `stripe.md`) to notify on new bookings.

## Pages projects (real names — the checked-in deploy script had stale ones until fixed 2026-07-20)

| Project | Domain | Source |
|---|---|---|
| `allternit` | allternit.com, www.allternit.com | `Allternit Websites/projects/www.allternit.com/source/app` |
| `allternit-learning-labs` | labs.allternit.com | `Allternit Websites/projects/labs.allternit.com/source` |
| `allternit-services` | services.allternit.com | `Allternit Websites/projects/services.allternit.com/source` |
| `try-allternit` | try.allternit.com | `Allternit Websites/projects/try.allternit.com/source` |
| `gizzi-brawl` | **brawl.allternit.com** (canonical, Pages domain **active**) | Cloudflare Pages project `gizzi-brawl` |
| `allternit-3dfacility` | **3dfacility.allternit.com** (canonical, Pages domain **active**) | `Allternit Websites/projects/3dfacility.allternit.com/source/app` |
| `allternit-compute` | compute.allternit.com | `Allternit Websites/projects/compute.allternit.com/source/app` |
| `ai-allternit` | — | — |
| `allternit-platform` | — | — |
| `allternit-docs` | — | — |
| `gizziio` | — | — |
| `gizzi-code-docs` | — | — |
| `install-allternit` | — | — |

`www.allternit.com` was dead (no DNS record) until 2026-07-20 — fixed by adding it as a custom domain on project `allternit` via API plus a proxied CNAME `www → allternit.pages.dev`. Confirmed live with a valid cert.

### Canonical public URLs (do not add aliases)

- **Gizzi Brawl** → `https://brawl.allternit.com` only.
- **Facility** → `https://3dfacility.allternit.com` only.
- `allternit-3dfacility.pages.dev` and `gizzi-brawl.pages.dev` are Cloudflare origins, not brand URLs.
- try.allternit.com does **not** host or redirect `/brawl` or `/kombat`. The old inlined copy was removed. try's CTA links to `https://brawl.allternit.com`.

### 2026-09-05 — Gizzi Brawl + Facility ship

- Created Pages project `allternit-3dfacility` (`wrangler pages project create`, production branch `main`). Origin: `https://allternit-3dfacility.pages.dev/`.
- Bound `3dfacility.allternit.com` via Pages API. CNAME added in the dashboard 2026-09-05; Pages domain is **active**, HTTPS 200, cert `CN=3dfacility.allternit.com` (Google Trust Services). Dropped the extra `facility.allternit.com` binding (that was URL drift).
- `gizzi-brawl` custom domain `brawl.allternit.com` is Pages-**active**; public DNS (1.1.1.1) already has proxied A records `104.21.45.19` / `172.67.207.205`. Live title is **Gizzi Brawl**.
- www nav: Facility → `https://3dfacility.allternit.com`, Gizzi Brawl → `https://brawl.allternit.com`. No path aliases on www.
- try: removed `public/brawl/` and the `/brawl` `/kombat` redirects. try CTA still points at `https://brawl.allternit.com`.
- GitHub Actions `deploy-pages.yml` now has a `3dfacility` pick + `deploy-3dfacility` job (`--project-name=allternit-3dfacility`).
- MCP `cloudflare_deploy_pages` enum still does **not** include `gizzi-brawl`, `try-allternit`, or `allternit-3dfacility` — deploy those with wrangler CLI.
- The walkable Next.js / R3F campus still lives in `~/Projects/basement-temp` (`SITE_URL=https://3dfacility.allternit.com`). It is **not** on Cloudflare. Next 16 + `cacheComponents` is not a Pages static export; putting that campus on `3dfacility.allternit.com` needs OpenNext or Vercel + CNAME. The Vite facility in the websites repo is the live CF surface until then. Do not use `next build` as a verification gate. Do not kill local `:3000`.

## Deploy

- `Allternit Websites/Projects/deploy-labs-and-main.sh` deploys `labs.allternit.com`, `www.allternit.com`, and `services.allternit.com` in one run. The script was fixed 2026-07-22 to use an absolute `SCRIPT_DIR` so the second and third `cd` commands don't break after the first `cd`.
- All three sites were deployed 2026-07-22:
  - `labs.allternit.com` → project `allternit-learning-labs`
  - `www.allternit.com` → project `allternit`
  - `services.allternit.com` → project `allternit-services`
- `services.allternit.com` is plain HTML/CSS/vanilla JS with no build step — deploys directly from `source/`.
- The Electron desktop app's platform surface is a **static export** copied by `scripts/prepare-platform-static.cjs` from `surfaces/ai.allternit.com` in the main workspace repo (`../allternit-workspace/allternit`) — see `deploy-runbook.md`.

Related: [[stripe.md]], [[deploy-runbook.md]].

- 2026-09-01: added Email Routing custom address `info@allternit.com` → forwards to `allternitpbc@gmail.com` (rule id `a0200761170946ae9a79ba382b3c001a`, created via API). Note: wrangler 4.x now stores its OAuth config in `~/.wrangler/config/default.toml` (not `~/Library/Preferences/.wrangler/...`); refreshed 2026-09-01 and its scopes include `email_routing:write`, so Email Routing changes can be done via API.
