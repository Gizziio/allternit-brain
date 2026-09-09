---
doc: project
updated: 2026-09-08
status: draft
---

# herdr-v090-adapter

## Goal

Allternit can run its executor agents on herdr 0.9.0 as an optional transport layer under the existing ao orchestrator — without ao losing its role as the orchestration brain. Concretely: `ao-spawn` gains a `--transport herdr` path that launches an executor in a herdr workspace/pane, `ao-status`/`ao-watch` read herdr's native agent states (working / blocked / idle) instead of scripted idle-detection, and the default tmux path is untouched. Multi-machine SSH management (`herdr machine`) is evaluated in a later phase, not this one.

## Source link(s)

- https://github.com/herdrdev/herdr/releases/tag/v0.9.0
- https://github.com/herdrdev/herdr (README, Apache-2.0, one Rust binary, brew/curl/mise install)

## Affected repo / surface

- `~/.claude/skills/agent-orchestrator/scripts/` (ao-spawn, ao-status, ao-watch, ao-doctor)
- `~/.agent-orchestrator/ORCHESTRATOR.md` (agent-agnostic mirror — keep in sync)
- Local install of `herdr` via `brew install herdr` (Apache-2.0, no account, no Docker)
- `Research/baselines/agent-orchestration.md`, `Research/INDEX.md` (knowledge updates)

## Division / owner

- [Platform / Surfaces](../../Divisions/INDEX.md)

## Integrate decision

- Approach: `thin_adapter`
- constraints_ok: true
- paid_or_signup: false (local binary; plugins marketplace and enterprise contact not on the core path)
- docker_required: false
- baseline_ref: `Research/baselines/agent-orchestration.md`
- Rationale: Herdr 0.9.0's shape (general-purpose branded TUI with marketplace) doesn't fit fork_reskin, and rebuilding it (reverse_engineer) would throw away a clean Apache-2.0 local runtime. Prior Lantern verdict (rq-20260908-005) rejected adopting Herdr as a *second orchestrator* — this adapter keeps ao as the only orchestration brain; herdr is a swappable pane/session transport, exactly the thin_adapter case. What we reject: replacing ao, reskinning herdr, any paid/account surface.

## Phased scope

- Phase 1 (the handoff): Install herdr locally (brew). Add `--transport herdr` to `ao-spawn` (herdr workspace per slug, executor launched in pane, transcript logging preserved one way or another — herdr pane reads or retained logs). Extend `ao-status`/`ao-watch` to read herdr's socket API / CLI for working / blocked / idle per pane, falling back to current scripted detection under tmux. `ao-doctor` probes `herdr` version + socket presence. Default transport stays tmux; herdr is opt-in per spawn. Update `ORCHESTRATOR.md` mirror + baseline delta. Stop at human gate.
- Phase 2+ (out of scope until named-slug approval): multi-machine pilot via `herdr machine` (saved SSH host), cross-machine `ao-status` aggregation, session persistence across detach, Lantern-style status overlay fed by herdr state (revisits the Lantern watch verdict with real runtime).

## Gate checklist

- [ ] Client-facing copy? → no client-facing surface; any docs copy stays internal
- [ ] Money-adjacent? → no
- [ ] Deploy involved? → no (local tooling only)
- [ ] Tier C? → no regulated data; local runtime audit done (Apache-2.0, no signup/Docker)

## Acceptance criteria

- [ ] `herdr` installed and `herdr --version` reports 0.9.0+; `ao-doctor` shows the herdr probe green
- [ ] `ao-spawn --transport herdr <slug>` launches the named executor in a herdr workspace and `tmux attach -t ao-<slug>` is unchanged for default spawns
- [ ] `ao-status` reports herdr-native working / blocked / idle for herdr-transport sessions and old behavior for tmux sessions
- [ ] Transcripts/logs for herdr sessions are readable after session end (pane read or log file)
- [ ] `ORCHESTRATOR.md` mirror and `Research/baselines/agent-orchestration.md` delta updated; no second orchestrator surface created
- [ ] Default transport remains tmux; herdr path is opt-in

## Executor model tier

- Task class: client_coding_work
- Model tier: A://C
- Concrete backend: claude-sonnet-5

## /goal

Outcome: ao (agent-orchestrator) supports herdr 0.9.0 as an opt-in transport layer: `ao-spawn --transport herdr` launches executors in herdr workspaces, `ao-status`/`ao-watch` read herdr's native agent states, `ao-doctor` verifies the herdr install, default tmux transport is untouched, and all docs/mirrors/baselines reflect the new path.

Constraints:
- Hard vetoes: no paid API/SaaS, no account signup, no Docker on the core path (herdr is Apache-2.0, brew-installed, local)
- ao remains the single orchestration brain — herdr is a pane/session transport only; no herdr-native orchestration features (multi-machine, plugins) in this phase
- Do not change default tmux behavior; herdr is opt-in per spawn
- No confirm:true brain applies; drafts only

Acceptance:
- `herdr --version` ≥ 0.9.0 and `ao-doctor` herdr probe green
- `ao-spawn --transport herdr <slug>` works end-to-end for at least one real executor CLI (kimi or claude)
- `ao-status` shows herdr-native working/blocked/idle on herdr sessions; tmux sessions behave as before
- Session transcripts readable after the session ends
- `~/.agent-orchestrator/ORCHESTRATOR.md` and `Research/baselines/agent-orchestration.md` updated
- Default transport stays tmux

Non-goals:
- Multi-machine / `herdr machine` SSH management (Phase 2)
- Lantern plugin or any plugin marketplace adoption
- Replacing or reskinning herdr; replacing ao
- Spawning ao executors for this spec without named-slug human approval (herdr-v090-adapter)

## Open questions

- Does herdr's socket API expose stable per-pane state readable by a shell script, or does `ao-status` need to shell out to `herdr` CLI? (executor verifies against 0.9.0 docs)
- Transcript strategy: herdr pane-read API vs retaining tmux-style log files
- Where does the adapter code live long-term — ao scripts dir vs a small repo? (Phase 1: keep in existing scripts dir)

## Source of truth

- Workspace: `~/.agent-orchestrator/` + `~/.claude/skills/agent-orchestrator/`
- Surface: local agent orchestration transport
- Tracking PR: n/a (local tooling; land = scripts updated + mirrors in sync)
- Queue: `Research/queue.json` → `rq-20260908-028`
