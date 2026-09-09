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
| `allternit-series` | **series.allternit.com** | `Allternit Websites/projects/series.allternit.com/source/app` |
| `allternit-compute` | compute.allternit.com | `Allternit Websites/projects/compute.allternit.com/source/app` |
| `ai-allternit` | **ai.allternit.com** | `allternit-workspace/allternit/surfaces/ai.allternit.com/dist` (not Allternit Websites). Deploy: `pnpm exec wrangler pages deploy dist --project-name=ai-allternit --branch=main --commit-dirty=true` from that surface. MCP `cloudflare_deploy_pages` cwd is Allternit Websites, so it cannot see this dist. |
| `allternit-platform` | — | — |
| `allternit-docs` | — | — |
| `gizziio` | — | — |
| `gizzi-code-docs` | — | — |
| `install-allternit` | — | — |

`www.allternit.com` was dead (no DNS record) until 2026-07-20 — fixed by adding it as a custom domain on project `allternit` via API plus a proxied CNAME `www → allternit.pages.dev`. Confirmed live with a valid cert.

### Canonical public URLs (do not add aliases)

- **Gizzi Brawl** → `https://brawl.allternit.com` only.
- **Facility** → `https://3dfacility.allternit.com` only.
- **Series** → `https://series.allternit.com` only.
- `allternit-3dfacility.pages.dev` and `gizzi-brawl.pages.dev` are Cloudflare origins, not brand URLs.
- try.allternit.com does **not** host or redirect `/brawl` or `/kombat`. The old inlined copy was removed. try's CTA links to `https://brawl.allternit.com`.

### 2026-09-05 — Gizzi Brawl + Facility ship

- Created Pages project `allternit-3dfacility` (`wrangler pages project create`, production branch `main`). Origin: `https://allternit-3dfacility.pages.dev/`.
- Bound `3dfacility.allternit.com` via Pages API. CNAME added in the dashboard 2026-09-05; Pages domain is **active**, HTTPS 200, cert `CN=3dfacility.allternit.com` (Google Trust Services). Dropped the extra `facility.allternit.com` binding (that was URL drift).
- `gizzi-brawl` custom domain `brawl.allternit.com` is Pages-**active**; public DNS (1.1.1.1) already has proxied A records `104.21.45.19` / `172.67.207.205`. Live title is **Gizzi Brawl**.
- www nav: Facility → `https://3dfacility.allternit.com`, Gizzi Brawl → `https://brawl.allternit.com`. No path aliases on www.
- try: removed `public/brawl/` and the `/brawl` `/kombat` redirects. try CTA still points at `https://brawl.allternit.com`.
- GitHub Actions `deploy-pages.yml` now has a `3dfacility` pick + `deploy-3dfacility` job (`--project-name=allternit-3dfacility`).
- MCP `cloudflare_deploy_pages` enum still does **not** include `gizzi-brawl`, `try-allternit`, `allternit-3dfacility`, or `allternit-series` — deploy those with wrangler CLI.

### 2026-09-05 — Series ship

- Official source: `Allternit Websites/projects/series.allternit.com/source/app` (Vite SPA). Authoring leftover: `~/Downloads/Allternit Series/site` (vinext, local `:3000` — do not kill, do not deploy from there).
- Created Pages project `allternit-series` (`npx wrangler pages project create`, production branch `main`). Origin: `https://allternit-series.pages.dev/`.
- Bound `series.allternit.com` via Pages API. Dashboard CNAME `series` → `allternit-series.pages.dev` (proxied) added 2026-09-05; Pages domain is **active**, HTTPS 200, cert `CN=series.allternit.com` (Google Trust Services). Token/OAuth still lack `dns_records:edit`.
- Series CTAs use canonical Facility `https://3dfacility.allternit.com` plus `https://www.allternit.com` and `https://brawl.allternit.com`. www header/footer and Facility header/footer/directory link back to Series.
- GitHub Actions `deploy-pages.yml` has a `series` pick + `deploy-series` job (`--project-name=allternit-series`).
- **Production architecture matches the other Allternit sites:** Vite SPA → `wrangler pages deploy dist` → project `allternit-3dfacility`. Custom domain CNAME target is **`allternit-3dfacility.pages.dev`**. Do not point this hostname at Vercel.
- `~/Projects/basement-temp` is the Next.js authoring clone (Blender kits, walk camera). It is not the production host. Campus GLBs now live in `Allternit Websites/projects/3dfacility.allternit.com/source/app/public/3d/campus/` and render in the Vite Canvas. Interior walk/explore from the Next camera drivers is still to port. Do not use `next build` as a verification gate. Do not kill local `:3000`.
- 2026-09-05 evening: interactive campus (walk, sliding doors, sims, creator) is live on `https://3dfacility.allternit.com` via `wrangler pages deploy dist --project-name=allternit-3dfacility --branch=main`. Film MP4s are on Pages; GitHub SSH dropped a 50MB MP4 pack so those clips stay untracked locally.

## Deploy

- `Allternit Websites/Projects/deploy-labs-and-main.sh` deploys `labs.allternit.com`, `www.allternit.com`, and `services.allternit.com` in one run. The script was fixed 2026-07-22 to use an absolute `SCRIPT_DIR` so the second and third `cd` commands don't break after the first `cd`.
- All three sites were deployed 2026-07-22:
  - `labs.allternit.com` → project `allternit-learning-labs`
  - `www.allternit.com` → project `allternit`
  - `services.allternit.com` → project `allternit-services`
- `services.allternit.com` is plain HTML/CSS/vanilla JS with no build step — deploys directly from `source/`.
- The Electron desktop app's platform surface is a **static export** copied by `scripts/prepare-platform-static.cjs` from `surfaces/ai.allternit.com` in the main workspace repo (`../allternit-workspace/allternit`) — see `deploy-runbook.md`.

Related: [[stripe.md]], [[deploy-runbook.md]].

### 2026-09-06 — Fabric Session web UI

- Public URL: **https://ai.allternit.com/fabric-session/** (also `/fabric-session` and `/fabric-session.html`, both 308 to the trailing-slash directory).
- PWA lives at `dist/fabric-session/index.html` (copied from `fabric-session.html` on Vite `closeBundle`). Do **not** 200-rewrite `/fabric-session` → `/fabric-session.html`: Pages pretty-URLs 308 `.html` to the extensionless path and that loops.
- Hosted client signs in same-origin at `/sign-in?redirect_url=…` (Clerk via `ai.allternit.com/__clerk`), lists paired runtimes from `https://api.allternit.com/api/v1/runtime-devices`, and drives a node through `POST /api/v1/runtime-devices/:id/proxy`. The Desktop or other app is the node and must stay signed in / paired.
- Last verified live 2026-09-06: title **Allternit Fabric Session**, bundle `fabric-session-BhkX0vQo.js`. Deployment `https://f0821165.ai-allternit.pages.dev`.

### 2026-09-06 — Fabric Session standalone PWA

- **Canonical scan URL:** `https://fabrictransport.allternit.com/` (QR + Desktop “Open on the web”). Pages custom domain is bound on `allternit-remote-control` (initializing). CNAME still needs the dashboard: `fabrictransport` → `allternit-remote-control.pages.dev` (proxied). Until that record exists, the same PWA is live at `https://remotecontrol.allternit.com/`.
- Desktop Fabric Transport shows a QR for that URL (with `?runtime=` when the node is paired).
- Pages custom domains on `allternit-remote-control`: `fabrictransport.allternit.com` (active). `remotecontrol.allternit.com` unbound 2026-09-06. `fabric-session.allternit.com` still pending (no CNAME). Token/OAuth still lack `dns_records:edit`. Clerk allowed_subdomains: `ai`, `platform`, `fabrictransport` — `remotecontrol` removed.
- Do not 200-rewrite `/fabric-session` → `/fabric-session.html` on `ai-allternit`; Pages pretty-URLs loop. Directory index remains the alias on `ai.allternit.com/fabric-session/`.
- Push worker `allternit-remote-control-push` custom domains: `push.fabrictransport.allternit.com` (new, Worker DNS/cert may lag) and `push.remotecontrol.allternit.com` (active). Do **not** turn the push hostname into a Pages CNAME — it is Type **Worker**, target `allternit-remote-control-push`. App fallbacks now use `https://push.fabrictransport.allternit.com`.

- 2026-09-01: added Email Routing custom address `info@allternit.com` → forwards to `allternitpbc@gmail.com` (rule id `a0200761170946ae9a79ba382b3c001a`, created via API). Note: wrangler 4.x now stores its OAuth config in `~/.wrangler/config/default.toml` (not `~/Library/Preferences/.wrangler/...`); refreshed 2026-09-01 and its scopes include `email_routing:write`, so Email Routing changes can be done via API.
