---
doc: surface
updated: 2026-08-27
status: active
---

# Surfaces

Public-facing and internal surfaces for Allternit: websites, apps, docs, and any other place a user interacts with the brand or product.

## Current surfaces

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
- `Allternit Websites/` — root repo for public division sites.
  - Images and generated media prompts should live with each site's source, not scattered across `additional/` folders.
  - See `Allternit Websites/README.md` for the deploy mapping.

## Image and media pipeline

1. Generated images go into the relevant site's `public/` or `src/assets/` folder.
2. Video / motion prompts for those images are stored next to the images they reference (`<image-name>.prompt.md` or in a `prompts/` folder).
3. Ops can deploy a site via the `allternit-ops` MCP tool `cloudflare_deploy_pages`.

## Related brain docs

- [](../Products/INDEX.md)
- [](../infra/cloudflare.md)

