---
doc: project
updated: 2026-09-08
status: active
---

# Link-ingest card schema

Each inbox card is one markdown file with YAML frontmatter and a short `## Notes` body.

Pipeline stages and decision rules: [PIPELINE.md](PIPELINE.md).

## Frontmatter fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `doc` | string | yes | Always `project` for link cards in this pipeline |
| `updated` | date | yes | ISO date `YYYY-MM-DD` |
| `status` | string | yes | Card lifecycle: `draft` while in inbox; later `active` / `done` / `dropped` |
| `id` | string | yes | Stable id `li-YYYYMMDD-NNN` (zero-padded) |
| `title` | string | yes | Short human title |
| `url` | string | no | Canonical URL if known; empty if unknown |
| `source` | string | yes | Ingest source, e.g. `safari` |
| `batch` | string | yes | Batch folder name, e.g. `2026-09-08-safari` |
| `stage` | string | yes | Pipeline stage (see INDEX.md / PIPELINE.md) |
| `bucket` | enum | yes | `allternit` \| `website` \| `osint` \| `personal` \| `unclear` |
| `product_hint` | enum | yes | `Platform` \| `Desktop` \| `SDK` \| `Gizzi` \| `OS` \| `Surfaces/websites` \| `none` |
| `value_hypothesis` | string | yes | One line why Joe saved it |
| `next` | string | yes | Default `research` from inbox |

### Optional (set during research / decision)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `rq_id` | string | no | Cross-link to `Research/queue.json` id `rq-YYYYMMDD-NNN` |
| `decision` | enum | no | `fork_reskin` \| `reverse_engineer` \| `vendor_skill` \| `thin_adapter` \| `watch` \| `drop` |
| `constraints_ok` | bool | no | `false` if any hard veto remains on the chosen path (paid/signup/Docker/closed license) |
| `paid_or_signup` | bool | no | Core path needs paid API/SaaS or account signup |
| `docker_required` | bool | no | Build or run requires Docker/containers |
| `baseline_ref` | string | no | Path to `Research/baselines/<area>.md` |

Hard vetoes and prefer rules: [PIPELINE.md](PIPELINE.md) — never rely on paid/signup deps; no Docker dependencies.

## Body

```markdown
## Notes
- raw title from Safari list
- any mapping notes
- (after research) offer / license / deps summary
- (after decision) rationale for `decision`
```

## Buckets

- **allternit** — agent infra, memory, browser automation, local models, Slack/Teams connectors, Grok Bot ops, coding harnesses, feature ideas for Allternit products
- **website** — site upgrade patterns, UI skills, DesignCode, marketing/SEO skills, division site templates
- **osint** — recon, Instagram private graph, surveillance-ish research tools, hardware/infra intel gathering
- **personal** — personal tooling, voice studio, local AI toys Joe might use personally
- **unclear** — only if genuinely ambiguous

## File naming

`inbox/<batch>/<id>-<slug>.md` where `<slug>` is a short kebab-case title fragment.
