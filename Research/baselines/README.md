---
doc: project
updated: 2026-09-08
status: active
---

# Research baselines

Convention for the **baseline** stage of the link→feature pipeline ([PIPELINE.md](../../Projects/link-ingest/PIPELINE.md)).

## Why

Before researching an external link in depth, map what Allternit **already has** for that capability (Brain + MCP/codebase shape). First pass writes a short area map; later items only append **deltas**. Avoids full-repo research every time.

## Layout

```
Research/baselines/
  README.md          # this file
  <area>.md          # one file per capability area
```

`<area>` is kebab-case, e.g. `agent-memory`, `browser-automation`, `ui-skills`, `lead-intake`, `local-model-serving`, `division-sites`.

## File shape

```markdown
---
doc: project
updated: YYYY-MM-DD
status: active
---

# Baseline: <area>

## What we already have
- Product / path / skill — one line each

## Gaps
- Missing capability the pipeline might fill

## Related products / paths
- Brain docs, repos, MCP surfaces

## Delta log
- YYYY-MM-DD — <slug or rq-id / li-id>: what changed or what the new link adds
```

## Rules

1. **First touch** of an area → create `<area>.md` (short is fine).
2. **Later items** → append to Delta log; update “What we already have” / Gaps only when the map changes.
3. Cards and queue items set `baseline_ref: Research/baselines/<area>.md`.
4. Link research after baseline is incremental vs this map — not a greenfield survey.
