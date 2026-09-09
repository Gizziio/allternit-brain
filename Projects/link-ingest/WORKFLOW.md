---
doc: project
updated: 2026-09-08
status: active
---

# Link → feature workflow (operator runbook)

Canonical stage contract: [PIPELINE.md](PIPELINE.md). Card schema: [SCHEMA.md](SCHEMA.md). This runbook answers **which skill to run when**.

```
ingest → baseline → link research → integrate decision → spec
       → dual review (preferred) → human gate → execute → land
```

## Slash commands / skills

| When | Skill / command | Notes |
|------|-----------------|-------|
| End-to-end sweep (pre-gate) | `/research-pipeline` | Orchestrates stages 1–7 prep; **always stops at human gate** unless something is already `approved` |
| Safari dump / URL list | `link-ingest` | Cards → `inbox/`; optional export → `.incoming/links.md` → `ingest-research.js` |
| Before deep research on an area | `baseline-capability` | `Research/baselines/<area>.md`; deltas after |
| After research, choose approach | `integrate-decision` | Decision tree + hard vetoes |
| Dual Grok + Kimi specs | `dual-draft-cherry` | `--grok` / `--kimi` → `--CHERRY` → one `specs/<slug>.md` |
| Write approval-ready spec | `spec-to-goal` | Embeds `/goal` + `model_route`; sets `spec_ready`; stops |
| After PR merge | `repo-ritual-land` | Ritual + draft brain fold (no `confirm:true`) + `landed` |
| Execute after approval | `agent-orchestrator` | Do not reimplement; `/goal` handoff via ao |

Weekday **mechanical** launchd sweep: export/ingest/integrity/dashboard only. Agent pre-gate (stages 1–7 prep → `spec_ready` gate report) needs interactive `/research-pipeline` or `AGENT_SWEEP=1` (multi-harness). Never spawn an executor without named-slug approval.

## Typical operator paths

### A. New Safari batch

1. `link-ingest` — write `inbox/YYYY-MM-DD-safari/` cards + `_BATCH.md`.
2. Export allternit|website URLs:
   ```
   node "/Users/joe/Desktop/Allternit/Allternit Brain/Ops/scripts/export-link-ingest-to-research.js"
   node "/Users/joe/Desktop/Allternit/Allternit Brain/Ops/scripts/ingest-research.js"
   node "/Users/joe/Desktop/Allternit/Allternit Brain/Ops/scripts/research-dashboard.js"
   ```
3. Per high-leverage `rq-*` / card: `baseline-capability` → link research → `integrate-decision`.
4. Prefer `dual-draft-cherry` then `spec-to-goal` (or `spec-to-goal` alone).
5. Stop. Tell Joe: `spec ready for approval: Research/specs/<slug>.md`.

### B. Single URL drop

1. Append to `Research/.incoming/links.md` (or MCP `research_ingest`).
2. Run `ingest-research.js` + dashboard.
3. Continue from baseline → … → gate as above.

### C. Daily / weekday pre-gate sweep

**Mechanical (automatic on Desktop weekdays):** launchd job `com.allternit.research-pipeline-sweep` runs `Ops/scripts/research-pipeline-sweep.sh` Mon–Fri at **09:05** local. It only does export → ingest → integrity → dashboard + `Research/sweeps/YYYY-MM-DD.md`. It does **not** advance baseline/research/decision/spec and does **not** spawn executors.

**Agent stages (manual or opt-in):**

1. Interactive `/research-pipeline` (preferred), **or** one-shot with `AGENT_SWEEP=1` / `AGENT_SWEEP_HARNESS=dual` on the sweep script.
2. Advance `inbox` / `researched` items that lack baseline/research/decision/spec (stages 1–7 prep).
3. End with gate report — list of `spec_ready` slugs. No execute without named-slug approval.

#### Desktop cron (launchd)

| | |
|--|--|
| Label | `com.allternit.research-pipeline-sweep` |
| Schedule | Weekdays Mon–Fri **09:05** local (America/Chicago on Joe's Mac) |
| Program | `/bin/bash` + `Ops/scripts/research-pipeline-sweep.sh` |
| Logs | `~/.allternit/logs/research-pipeline-sweep.log` (+ `.error.log`) |
| Install | `Ops/scripts/launchd/install.sh` (also installs brain-audit) |
| Automatic | Export link-ingest → ingest → `research-queue-integrity.js` → dashboard + sweep report |
| Needs human/agent | `/research-pipeline` (or `AGENT_SWEEP=1`, harness auto|grok|kimi|claude|dual) for baseline→research→decision→spec_ready |

Also: nightly `com.allternit.brain-audit` at 06:17 (separate job).

## Dual-agent cherry protocol

1. Same slug, same researched inputs + decision fields.
2. Grok writes `Research/drafts/<slug>--grok.md`; Kimi writes `Research/drafts/<slug>--kimi.md` (independent).
3. Either agent (or Joe) runs cherry-pick → `Research/drafts/<slug>--CHERRY.md` (winners per section).
4. Promote **one** merged doc to `Research/specs/<slug>.md`.
5. Never put two competing specs in front of the human gate.

## How to approve a slug (human gate)

Execute spends money. Approval is **explicit and named**:

- In conversation, Joe says something unambiguous like: **approve `<slug>`** / **approve `Research/specs/<slug>.md`** / **approve `rq-YYYYMMDD-NNN` for execute**.
- Agent sets that queue item only → `approved`, then hands `/goal` to `agent-orchestrator`.
- Vague “just do it” / “keep going” does **not** pass the gate.
- Harness gates inside the spec (voice, dry-run, preview-before-deploy) still apply after approval.

## Hard vetoes (never miss)

No paid/signup deps on the core path; no Docker; no closed license. Prefer MIT/Apache/BSD, local runtime, Allternit-owned (`fork_reskin` / `reverse_engineer`). See PIPELINE.md.

## Harness sync (distribute skills)

Skills SoT: `/Users/joe/Desktop/Allternit/.claude/skills/`.

After editing skills:

```
cd "/Users/joe/Desktop/Allternit/Allternit Brain/Ops"
node harness-sync.js sync --dry-run
node harness-sync.js sync
node harness-sync.js status
```

`harness-sync` copies SoT skills into Claude / Grok / Kimi / Cursor / Codex / Gizzi skill dirs per `harness.json`. Confirm `research-pipeline` and satellites appear on at least claude + grok + kimi.

## Paths cheat sheet

| Path | Role |
|------|------|
| `Projects/link-ingest/inbox/**` | `li-*` cards |
| `Research/queue.json` | `rq-*` execution state |
| `Research/baselines/` | Capability maps |
| `Research/drafts/` | Dual drafts + CHERRY |
| `Research/.incoming/links.md` | URL drop file |
| `Ops/scripts/ingest-research.js` | Drop → queue |
| `Ops/scripts/export-link-ingest-to-research.js` | Cards → drop file |
| `Ops/scripts/research-dashboard.js` | Regenerate Dashboard.md |
| `Ops/scripts/research-queue-integrity.js` | Fail/report dangling `spec` paths / status↔spec mismatch |
| `Ops/scripts/research-pipeline-sweep.sh` | Weekday mechanical sweep (+ optional multi-harness `AGENT_SWEEP=1`) |
| `Research/sweeps/YYYY-MM-DD.md` | Sweep summary from launchd / manual run |
| `Research/specs/` | Gate-bound specs (must exist on disk when `spec` is set) |

## Related

- [INDEX.md](INDEX.md) — project index
- [PIPELINE.md](PIPELINE.md) — stage contract
- [SCHEMA.md](SCHEMA.md) — card frontmatter
- `Research/PIPELINE.md` — pointer from Research folder
