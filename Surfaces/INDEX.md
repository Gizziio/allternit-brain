---
doc: surface
updated: 2026-08-27
status: active
---

# Surfaces

Public-facing and internal surfaces for Allternit: websites, apps, docs, and any other place a user interacts with the brand or product.

## Current surfaces

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

