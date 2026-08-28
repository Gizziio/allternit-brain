---
doc: surface
updated: 2026-08-28
status: active
---

# Surfaces

Public-facing and internal surfaces for Allternit: websites, apps, docs, installers, and any other place a user interacts with the brand or product. The authoritative source for website projects is `Allternit Websites/Projects/`; images and generated media prompts should live with each site's source, not scattered across `additional/` folders. See `Allternit Websites/README.md` for the deploy mapping.

## Current surfaces

- **try.allternit.com** — source: `Allternit Websites/Projects/try.allternit.com`
- **www.allternit.com** — source: `Allternit Websites/Projects/www.allternit.com`
- **spaces.allternit.com** — source: `Allternit Websites/Projects/spaces.allternit.com`
- **services.allternit.com** — source: `Allternit Websites/Projects/services.allternit.com`
- **robotics.allternit.com** — source: `Allternit Websites/Projects/robotics.allternit.com`
- **platform.allternit.com** — source: `Allternit Websites/Projects/platform.allternit.com`
- **manufacturing.allternit.com** — source: `Allternit Websites/Projects/manufacturing.allternit.com`
- **labs.allternit.com** — source: `Allternit Websites/Projects/labs.allternit.com`
- **install.gizziio.com** — source: `Allternit Websites/Projects/install.gizziio.com`
- **install.allternit.com** — source: `Allternit Websites/Projects/install.allternit.com`
- **docs.gizziio.com** — source: `Allternit Websites/Projects/docs.gizziio.com`
- **docs.allternit.com** — source: `Allternit Websites/Projects/docs.allternit.com`
- **compute.allternit.com** — source: `Allternit Websites/Projects/compute.allternit.com`

## Image and media pipeline

Source of truth for prompts and outputs: `Marketing/Production/Website Assets/`. Front-and-center tracker: `Marketing/Production/Website Assets/tracker.md`.

| Site | Prompt sections | Images on disk | Status |
|---|---|---|---|
| compute.allternit.com | 19 | 248 | assets staged, sparse source refs |
| manufacturing.allternit.com | 56 | 170 | assets staged, sparse source refs |
| robotics.allternit.com | 17 | 198 | assets staged, sparse source refs |
| spaces.allternit.com | 21 | 255 | assets staged, sparse source refs |
| labs.allternit.com | 4 | 41 | in progress |
| platform.allternit.com | 3+ | 62 | needs generation |
| www.allternit.com | — | 116 | discovery feed live |
| services.allternit.com | — | 64 | live booking site |

### Workflow

1. **Generate** — use prompts in `Marketing/Production/Website Assets/image-prompts/` and `video-prompts/`.
2. **Approve** — move outputs from `outputs/pending/` to `outputs/approved/<site>/`.
3. **Sync** — run `node Marketing/Production/Website Assets/scripts/sync-to-sites.js` to copy approved outputs into `Allternit Websites/Projects/<site>/source/`. Agents can also trigger this through `allternit-ops` `media_sync` (dry-run by default; pass `confirm:true` to copy).
4. **Audit** — run `node Allternit Websites/Scripts/audit-media.js` or use `allternit-ops` `media_audit` to see what each site has on disk vs. what it references.
5. **Reference** — update the site's HTML/JS/CSS to use the new asset.
6. **Deploy** — use `allternit-ops` `cloudflare_deploy_pages` or the GitHub Actions workflow.

Research assets that pre-date the pipeline live in `Allternit Assets/Research/visual-assets/`; match them to prompts and copy them through the approved outputs step instead of dropping them randomly into site folders.

## Brand assets and design tokens

Canonical brand assets live in `Allternit Assets/` (now its own tracked repo). Agents should read the inventory before generating new marketing or website assets:

- `Allternit Assets/Brand/README.md` — full brand inventory, status table, and generation briefs for missing wordmarks, favicons, social cards, and app icons.
- `Allternit Assets/Docs/design-tokens.md` — canonical color, spacing, and typography tokens.
- `Allternit Assets/Index/AGENT_RULES.md` — hard rules for handling typography and prototype fonts.

When a new brand asset is approved, copy it into `Allternit Assets/Brand/` first, then flow it through the media pipeline above.

## Related brain docs

- [Divisions](../Divisions/INDEX.md)
- [Products](../Products/INDEX.md)
- [infra/cloudflare.md](../infra/cloudflare.md)

