---
doc: project
updated: 2026-09-08
status: draft
---

# ao-engine-parity (P1)

## Goal

The `ao` binary (built on the P0-vendored herdr engine) implements `ao spawn|send|watch|status|kill|doctor` with byte-level contract parity to the existing bash scripts — same arguments, exit codes, stdout formats, and semantics — proven by a golden side-by-side test. The tmux script path remains untouched as fallback. This is P1 of the ao v3 plan (`Products/AgentOrchestratorRuntime.md`); P0 (engine fork) must land first.

## Source link(s)

- Plan: `Products/AgentOrchestratorRuntime.md` §5 P1
- Grounding memo: `Research/drafts/prep-p1-socket-parity.md` (all RPC mappings below cite herdr v0.9.0 source)
- ao contract source: `~/.claude/skills/agent-orchestrator/scripts/`
- Engine: `infrastructure/executor/ao-engine/` (vendored herdr v0.9.0, P0 output)

## Affected repo / surface

- `allternit-workspace/allternit` → new `ao-core` module/crate + additive engine patch (transcript tee); workspace members
- `~/.agent-orchestrator/logs/` (transcript naming preserved)
- `~/.claude/skills/agent-orchestrator/` + `~/.agent-orchestrator/ORCHESTRATOR.md` (deprecation note only after parity passes)

## Division / owner

- [Platform / Surfaces](../../Divisions/INDEX.md)

## Integrate decision

- Approach: `fork_reskin` (P1 sub-phase of `rq-20260908-028`)
- constraints_ok: true
- paid_or_signup: false · docker_required: false
- baseline_ref: `Research/baselines/agent-orchestration.md`
- Rationale: the engine (P0) exposes ~90% of the contract over its socket API; the remaining gaps (transcript file, dead-pane liveness, dup guard, bracketed paste) are ao-core logic or a small additive engine patch — rebuilding ao semantics from scratch would throw away a verified contract.

## Design decisions (from the parity memo — binding unless the spike disproves)

1. **Spawn = pattern (A):** `workspace.create {label:"ao-<slug>", cwd, focus:false}` + `layout.apply {root:{type:"pane", command:[argv…]}}` (direct argv exec, no shell quoting). NOT pattern (B) send-to-shell.
2. **Slug discipline lives in ao-core:** duplicate-label refusal (`workspace.list` pre-check, exit 1), `$HOME` git-root guard, `-ao-<slug>` suffix guard before `worktree.remove`. The engine enforces none of these.
3. **Worktrees:** `worktree.create {branch:"ao/<slug>", path:"<parent>/<repo>-ao-<slug>"}` / `worktree.remove {force:true}` — branch retained, matching the script.
4. **ao-send:** `pane.send_input {text}` (server wraps bracketed paste — never `pane.send_text` raw); key namespace is crossterm-style — translate `C-u → ctrl+u`, `Enter → enter`; marker algorithm verbatim from `ao-send`: last-40-alnum marker, `pane.read {source:"recent", lines:80, strip_ansi:true}`, two consecutive captures within 5 s, Enter only after verified landing. Do NOT substitute `pane.wait_for_output` (single-sighting is weaker than the contract).
5. **ao-watch:** sentinel file-existence poll unchanged (exit 0/3/4); pane death via `events.wait {match_event:{event:"pane_exited", pane_id}}` inside the poll loop + a `pane.get`/`pane.process_info` liveness probe to close the no-replay race (subscriptions start at current sequence).
6. **ao-status:** `workspace.list` filtered `ao-*` + `pane.list`; DEAD derived from liveness probe (no engine dead flag — GAP); with slug, `pane.read` tail + same header format.
7. **Transcripts: additive engine patch.** A small PTY-tee in the vendored crate (additive module, plan §7 policy) writes `~/.agent-orchestrator/logs/ao-<slug>-<YYYYMMDD-HHMMSS>.log` from byte 0. The `pane.read` revision-polling fallback loses bytes under output bursts — do not accept it. This is the one intentional engine diff beyond the P0 gut list; keep it isolated and documented.
8. **Engine runs as named session `ao`** (`--session ao`, socket `<config>/sessions/ao/herdr.sock`) so it never collides with a user-run herdr.
9. **Instant-exit detection:** held `events.subscribe` across spawn (close the no-replay race) + ~0.5 s grace + `pane.read` tail dump to stderr, exit 1 — matching `ao-spawn`.
10. **ao-doctor:** socket reachability + `ping` (surface `Pong.protocol` so a stale fork is visible), then the unchanged per-executor `--help`/`--version` probes; keep the tmux probe while the bash fallback exists.
11. **PTY sizing:** set sane `headless_cols/headless_rows` for TUI executors (kimi/claude need a real size).
12. **Parity tolerance:** byte-identical stdout required for spawn/send/status/kill/doctor; `PANE-DEAD` timing tolerance = poll granularity (≤2 s) documented in the test, not ad hoc.

## Mandatory spike findings (first task block, before implementation)

- Post-exit behavior of `pane.get` / `pane.read` / `pane.process_info` on an exited pane (error vs stale vs normal) — settles DEAD semantics for watch/status/kill.
- Placeholder shell tab side effects in spawn pattern (A) (cwd resolution, session-save churn).
- Confirm `pane.read` still returns content after exit (transcript tail on dead panes).

## Gate checklist

- [ ] Client-facing copy? → no (CLI parity; internal)
- [ ] Money-adjacent? → no
- [ ] Deploy involved? → no
- [ ] Tier C? → no

## Acceptance criteria

- [ ] Spike findings recorded in the NOTES (post-exit pane behavior settled one way or the other, with evidence)
- [ ] All six subcommands implemented; `ao --help` documents them; legacy `ao-*` script behavior unchanged (scripts untouched)
- [ ] Golden side-by-side test passes: for a scripted spawn→send→watch→status→kill scenario, `ao` binary and bash scripts produce byte-identical specified outputs (with documented PANE-DEAD timing tolerance); test committed and rerunnable
- [ ] Transcript files byte-0 complete for a burst-output executor run (tee verified under load, not just idle)
- [ ] Duplicate slug, `$HOME` root, missing-session, and `--rm-worktree` guard cases all behave per contract (exit codes verified)
- [ ] Engine diff beyond P0 gut list = the documented transcript tee only
- [ ] Repo ritual: worktree, steering checkpoints, PR, ledger attestation

## Executor model tier

- Task class: client_coding_work
- Model tier: A://C
- Concrete backend: claude-sonnet-5 (per `model_route`)

## /goal (paste-ready)

Outcome: on top of the P0-vendored herdr engine in infrastructure/executor/ao-engine, implement ao-core with `ao spawn|send|watch|status|kill|doctor` matching the existing bash-script contract exactly (arguments, exit codes, stdout formats), plus one additive engine patch: a PTY-tee writing byte-0-complete transcripts to `~/.agent-orchestrator/logs/ao-<slug>-<timestamp>.log`. A committed golden side-by-side test proves parity against the bash scripts. Bash scripts remain the fallback, untouched.

Constraints:
- Follow the parity memo `Research/drafts/prep-p1-socket-parity.md` — its 12 design decisions are binding; spike its 3 verification items first and record findings before implementing
- Marker protocol verbatim (last-40-alnum, two consecutive captures, 5 s); never `pane.send_text`; `C-u → ctrl+u` translation
- Engine diff beyond the P0 gut list = transcript tee only, isolated and documented
- Engine runs as named session `ao`; no collision with user herdr
- Repo ritual: session worktree, `.steering/checkpoint.md`, steering commit-gate, PR + ledger attestation
- No secrets; no changes to the bash scripts; brain updates as drafts only

Acceptance:
- Spike findings on post-exit pane behavior recorded with evidence
- Golden side-by-side parity test green (byte-identical outputs except documented PANE-DEAD timing tolerance ≤2 s)
- Transcript byte-0 completeness verified under burst output
- Guard cases (duplicate slug, $HOME root, missing session, --rm-worktree suffix) verified per contract
- Ledger attestation written

Non-goals:
- TUI rebrand, machine/fabric/harness/peer surfaces (P2–P5)
- Removing or modifying the bash scripts (deprecation is a later phase, after human sign-off)
- Upstreaming the tee before it proves out in our fork

## Open questions

- None blocking — spike items above are the only unknowns.

## Source of truth

- Parent queue item: `Research/queue.json` → `rq-20260908-028` (P1 sub-phase)
- Spec: `Research/specs/ao-engine-parity.md`
- Grounding: `Research/drafts/prep-p1-socket-parity.md`
- Plan: `Products/AgentOrchestratorRuntime.md`
