---
doc: project
updated: 2026-09-08
status: active
---

# Research pipeline (Box Brain)

**Canonical design lives at:** [`../Projects/link-ingest/PIPELINE.md`](../Projects/link-ingest/PIPELINE.md)

This folder holds research **knowledge** and the execution **state** store for the link→feature pipeline.

## State vs knowledge

| Path | Role |
|------|------|
| [`queue.json`](queue.json) | **State** — `rq-*` items, status, history, spec/worktree pointers. Create/sync from Mac Brain if missing on Box. |
| [`Dashboard.md`](Dashboard.md) | Regenerated gate view from queue (do not hand-edit). |
| [`INDEX.md`](INDEX.md) | Watchlist knowledge (categories, one-liners). |
| [`baselines/`](baselines/) | First-touch capability maps + delta log. See [baselines/README.md](baselines/README.md). |
| [`drafts/`](drafts/) | Dual-agent drafts (`<slug>--grok.md`, `<slug>--kimi.md`) + `<slug>--CHERRY.md`. |
| [`specs/`](specs/) | Merged feature specs advancing to the human gate. |
| [`.incoming/links.md`](.incoming/links.md) | URL drop file → `Ops/scripts/ingest-research.js`. |

## Operational skill

Skills pack on the Mac SoT (`.claude/skills/research-pipeline` + satellites: `link-ingest`, `baseline-capability`, `integrate-decision`, `dual-draft-cherry`, `spec-to-goal`, `repo-ritual-land`) implements sweeps. See `Projects/link-ingest/WORKFLOW.md`. Human gate before any executor spend is unchanged.


## Mechanical sweep vs agent stages

| Path | What runs |
|------|-----------|
| launchd `com.allternit.research-pipeline-sweep` (weekdays 09:05) | `research-pipeline-sweep.sh`: export → ingest → integrity → dashboard + `sweeps/YYYY-MM-DD.md`. No paid executors. |
| Interactive `/research-pipeline` | Agent stages through human gate prep (`spec_ready`). |
| `AGENT_SWEEP=1` + `AGENT_SWEEP_HARNESS=auto|grok|kimi|claude|dual` | Optional multi-harness agent advancement (default **off** for launchd). Compat: `CLAUDE_CODE_SWEEP=1`. |

## Hard constraints (reminder)

Never integrate a core path that requires **paid APIs/SaaS**, **account signup**, or **Docker**. Prefer MIT/Apache/BSD self-hostable, local runtime, Allternit-owned code (fork+reskin or reverse-engineer). Details in the canonical PIPELINE.md.

## Queue note

Box may not always have a live `queue.json` (Mac Brain is often the active state store). Parent sync should copy `queue.json` / Dashboard / INDEX when agents need them here. Design and baselines can advance on Box without the full queue present.
