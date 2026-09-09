---
doc: project
updated: 2026-09-08
status: active
---

# Link ingest pipeline

Durable pipeline that turns saved links (Safari dumps, etc.) into Allternit feature work.

**Canonical design:** [PIPELINE.md](PIPELINE.md) — full stage contract (ingest → baseline → link research → integrate decision → spec → dual review → human gate → execute → land), hard constraints, decision tree, `li-*`↔`rq-*` bridge, and dual-agent cherry-pick.

**Operator runbook:** [WORKFLOW.md](WORKFLOW.md) — which skill to run when, slash commands, dual-agent cherry protocol, how to approve a slug, harness-sync.

**Skills pack (SoT `.claude/skills/`):** `research-pipeline` (orchestrator) + `link-ingest`, `baseline-capability`, `integrate-decision`, `dual-draft-cherry`, `spec-to-goal`, `repo-ritual-land`. See PIPELINE.md § Skills pack.

**Execution state store:** [`Research/queue.json`](../../Research/queue.json) — JSON for state; brain markdown for knowledge. Do not track pipeline status only in md.

## Ownership

| Stage (PIPELINE.md) | Owner |
|---------------------|-------|
| ingest (cards) | **Link ingestion bot** — parse dumps, categorize, write cards + batch index |
| ingest (queue) | `ingest-research.js` / `research_ingest` / research-pipeline sweep |
| baseline → link research → integrate decision → spec | Research/spec agent(s); optional dual drafts (Grok + Kimi) → CHERRY |
| human gate | Joe — explicit approval of named spec slug (money gate) |
| execute → land | Coding agent — `/goal` through PR + repo ritual; brain fold on land |

## Stages (aligned with PIPELINE.md)

```
ingest → baseline → link research → integrate decision → spec
       → dual review (preferred) → human gate → execute → land
```

Card `stage` field (legacy short names still valid on cards; map to canonical):

| Card `stage` | Canonical |
|--------------|-----------|
| `inbox` | ingest |
| `claimed` | baseline / link research in progress |
| `researched` | link research done (+ decision fields) |
| `spec` | spec / dual review / awaiting gate |
| `coding` | execute |
| `shipped` | land |

Dropped items stay in the batch folder with `status: dropped` and a one-line reason in Notes (do not delete history).

Queue statuses (`rq-*`): `inbox` → `researched` \| `watch` → `spec_ready` → `approved` → `executing` → `pr_open` → `landed` (see PIPELINE.md / Claude `research-pipeline` skill).

## Layout

```
Projects/link-ingest/
  INDEX.md          # this file
  PIPELINE.md       # canonical pipeline design
  WORKFLOW.md       # operator runbook (skills, gate, harness-sync)
  SCHEMA.md         # card frontmatter + body contract
  inbox/
    <batch>/
      _BATCH.md     # batch index + counts
      li-*.md       # one card per link

Research/                 # sibling knowledge + state
  queue.json              # execution state (rq-*)
  PIPELINE.md             # pointer to this design
  baselines/              # capability maps
  drafts/                 # dual-agent drafts + CHERRY
  specs/                  # feature specs
  .incoming/links.md      # URL drop → ingest-research.js
```

## How to ingest a batch

1. Create `inbox/YYYY-MM-DD-<source>/`.
2. Write one card per link per [SCHEMA.md](SCHEMA.md) with stable ids `li-YYYYMMDD-NNN`.
3. Write `_BATCH.md` summarizing counts and high-leverage picks.
4. Leave cards at `stage: inbox` / `next: research`.
5. To enter the execution queue: run `Ops/scripts/export-link-ingest-to-research.js` (or append URLs manually), then `ingest-research.js` (see PIPELINE.md bridge / WORKFLOW.md).

## First batch

- [2026-09-08 Safari](inbox/2026-09-08-safari/_BATCH.md) — initial Safari dump ingestion (51 cards).
