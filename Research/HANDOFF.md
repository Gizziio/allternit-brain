---
doc: project
updated: 2026-09-09
status: active
---

# HANDOFF — Research Pipeline build (for the next agent)

Read this before touching the pipeline. It records what was built, the current state, the rules that must not be re-litigated, and the known loose ends. Canonical design: [`../Projects/link-ingest/PIPELINE.md`](../Projects/link-ingest/PIPELINE.md). Skill: `research-pipeline` (canonical at `~/Desktop/Allternit/.claude/skills/research-pipeline/`, fanned out by `Ops/harness-sync.js`).

## What this is

A production loop that turns saved links into landed PRs:

```
ingest → baseline → research → decision → spec → dual drafts (opt) → HUMAN GATE
→ execute (orchestrated CLI agent in a worktree) → independent review → land
```

Built 2026-09-08/09 by multiple agents (orchestrated from a kimi session; two coder subagents built the layers). Commits: brain repo `7684eb2` (pipeline v1), `db5d96e` (production autonomy), `b810b97` (ai-sdlc adoptions); harness repo `290e612` (skill + CLAUDE.md).

## Current state (2026-09-09)

- **Mode: `shadow`** in `Ops/config/research-pipeline.json` — the cycle runs every 30 min but only reports; it never spawns executors or calls an LLM. Zero token usage in shadow. Flipping `autonomy.mode` to `"active"` is the go-live switch and is Eoj's call.
- **Scheduler: launchd only.** The old 22:37 cron is deleted. Loaded jobs: `com.allternit.research-pipeline-sweep` (weekdays 09:05, mechanical), `com.allternit.research-pipeline-agent-sweep` (daily 21:37, pre-gate agent stages — skipped in shadow), `com.allternit.research-pipeline-cycle` (every 30 min, 07:00–22:00), `com.allternit.brain-audit` (nightly). Install/idempotent reload: `bash Ops/scripts/launchd/install.sh`.
- **Queue:** `Research/queue.json` — ~28 items; 5 specs at the human gate (`spec_ready`): division-sites-dayring, vendor-refactoring-ui-skill, vendor-ffmpeg-skill, app-store-connect-cli, agent-browser-eval. Gate view: `Research/Dashboard.md` (regenerated, do not hand-edit).
- **Another session may be actively executing** `rq-20260908-028` (allternit-runtime-fork) via agent-orchestrator — check `Research/queue.json` before assuming idle state. Other sessions also work in this vault concurrently; check `git status` and recent commits before editing shared files.

## Rules that must not be re-litigated

- **Human gate:** no executor is spawned without explicit approval of the named spec slug. Approval paths: `research_approve` MCP tool · `node Ops/scripts/research-approve.js <slug>` · drop `Research/gate/approvals/<slug>.approve`. Slug-level, validated, idempotent.
- **Park boundary:** specs whose gate checklist touches money/Stripe, client comms, or deploy-confirm get those steps parked (`status: parked`) with a notification — never auto-executed. Standing harness gates (see `~/Desktop/Allternit/CLAUDE.md`) are never overridden.
- **Kill switch:** `Research/gate/HALT` — the cycle no-ops while it exists.
- **Hard vetoes** on integration paths (from the canonical PIPELINE): paid API/SaaS required, account signup required, Docker required, closed license. Vetoed items can only be `watch`/`drop` (or docs/vendor-skill paths).
- **Caps:** `execute_max_per_day: 3`, `execute_max_concurrent: 1`, `tier_ceiling: "A://C"` (unattended executions never above the model-routing A://C tier).
- **Reviewer independence:** the review pass must run on a different harness than the implementer (`autonomy.reviewer_preference`, default codex → claude → grok). Same-harness degrade is allowed only with the loud warning it currently prints.
- **Terminal failures → `quarantined`** (not blocked, in the execution path): worktree + tmux session preserved, evidence in `Research/sweeps/<date>.md`, recovery is manual (`ao-send` back or `ao-kill --rm-worktree`).
- **Brain updates from executors** are folded as `.incoming/` drafts only — never auto-`confirm:true`.

## Key files

| Path | Role |
|---|---|
| `Ops/config/research-pipeline.json` | Single source of truth: mode, caps, tier ceiling, reviewer preference, resume_max, schedule |
| `Ops/scripts/lib/pipeline-config.js` | Config reader (deep-merge defaults; CJS via scoped `lib/package.json`) |
| `Ops/scripts/lib/research-approve-lib.js` | Approval validation + transition (shared by CLI and MCP) |
| `Ops/scripts/research-approve.js` | Approve CLI (`--list`, `--consume-all`, `--queue` for fixtures) |
| `Ops/scripts/research-pipeline-cycle.sh` | The autonomy loop (shadow/active; flock + HALT + quiet hours; park/quarantine) |
| `Ops/scripts/research-pipeline-sweep.sh` | Mechanical + config-driven agent sweep (`AGENT_SWEEP*` env = overrides) |
| `Ops/scripts/research-dashboard.js` | Dashboard generator incl. Approvals + Decisions-needed sections |
| `Ops/scripts/research-queue-integrity.js` / `research-cycle-queue.js` | Queue integrity + ops helpers |
| `Ops/scripts/notify.sh` | macOS banner + `Research/gate/notifications.log` + rails mail share (always exit 0) |
| `Ops/index.js` | MCP tools `research_ingest`, `research_approve` |
| `Ops/deploy/vps/systemd/` | VPS mirror units — shipped, **not activated** |
| `Research/gate/` | HALT, approvals/, notifications.log |
| `Templates/spec.md` | Feature-spec template (gate checklist + model_route fill-in) |

## Operating commands

```bash
B="/Users/joe/Desktop/Allternit/Allternit Brain"
node "$B/Ops/scripts/ingest-research.js"          # drain .incoming → queue
node "$B/Ops/scripts/research-dashboard.js"       # regen gate view
node "$B/Ops/scripts/research-approve.js --list"  # what's at the gate
bash "$B/Ops/scripts/research-pipeline-cycle.sh"  # manual cycle run (respects shadow/HALT)
bash "$B/Ops/scripts/launchd/install.sh"          # (re)install all four plists
node "$B/Ops/scripts/audit-brain.js"              # vault hygiene
node "$B/Ops/scripts/validate-links.js"           # link check
```

Verify executors before ever flipping active: `~/.local/bin/ao-doctor` (expect exit 0).

## Known loose ends

1. **`ao-spawn` stderr leak** — it prints git worktree chatter to stderr ahead of its `<session> <workdir> <logfile>` line; the cycle now greps around it, but the one-line `2>/dev/null` fix belongs to the agent-orchestrator skill's copy (`~/.claude/skills/agent-orchestrator/scripts/ao-spawn`).
2. **Broken relative links** in other sessions' in-flight specs (`Research/specs/allternit-runtime-fork.md`, `ao-engine-parity.md` → `../Products/AgentOrchestratorRuntime.md`, which doesn't exist yet). Theirs to fix when that work lands.
3. **Broken symlink** `~/.local/bin/ao-consult` (no counterpart in the current agent-orchestrator scripts dir).
4. **VPS leg** — units shipped at `Ops/deploy/vps/systemd/`; activation needs the brain repo cloned on the VPS, node + harness CLIs, and a decision about whether execution moves or stays Mac-bound (default: stay Mac-bound; VPS runs pre-gate only).
5. **Grok Bot approval path** — interim: Eoj tells Grok Bot to run `research-approve.js <slug>` in a terminal. A proper bot bridge (Slack/Discord via `sandbox-quantum/switch`, already in the research queue as `watch`) is future work.
6. **ai-sdlc** (https://github.com/ai-sdlc-framework/ai-sdlc) is queued as `watch`; the three adopted ideas shipped in `b810b97`. A possible pilot inside `allternit-platform` for repo-native tasks was noted but **deferred by Eoj 2026-09-09** — revisit when a repo-native engineering task shows up.
7. **Instagram-private-graph** and the **DesignCode course** were deliberately excluded from the vault (personal, not Allternit).

## If you pick this up

1. Read `Projects/link-ingest/PIPELINE.md` (canonical) and the `research-pipeline` skill.
2. Check `git -C "$B" log --oneline -5` and `git status` — other sessions move fast in this vault.
3. Run the operating commands above; confirm the cycle's latest section in today's `Research/sweeps/<date>.md` is sane.
4. Don't flip `active`, don't `launchctl` anything, don't commit other sessions' dirty files without checking ownership.
