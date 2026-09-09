---
doc: project
updated: 2026-09-09
status: active
---

# Baseline: agent-orchestration

## What we already have

- `agent-orchestrator` skill (ao v2, tmux-native): orchestrates external CLI agents (kimi, codex, agy, claude) in named tmux sessions via `ao-spawn` / `ao-send` / `ao-watch` / `ao-status` / `ao-kill`; transcript logs in `~/.agent-orchestrator/logs/`; worktree-per-agent isolation; mirrored agent-agnostically at `~/.agent-orchestrator/ORCHESTRATOR.md`
- ao owns scoping, task specs, sentinel chains, monitoring, review, bug-fix fix cycles — the orchestration *brain*
- Transport is plain tmux: local machine only, no agent state detection (verify-idle handshake is scripted, not observed), sessions die with the tmux server, observation = `tmux attach` or log tails

## Gaps (vs herdr 0.9.0 capability)

- **No multi-machine**: ao cannot drive agents on a second host; herdr 0.9.0 manages local + saved SSH machines from one window (`herdr machine`, combined agent list, independent auto-reconnects)
- **No agent state detection**: herdr marks every pane working / blocked / idle and detects approval/question prompts per agent (Claude Code, Codex, Cursor, OpenCode, Grok, Muse); ao approximates this with scripted handshakes
- **No session persistence**: herdr's background server survives client detach/SSH drop and restores layout; tmux sessions die with the server
- **No agent-native API surface**: herdr exposes CLI + socket API so agents spawn panes, prompt each other, and wait on each other's blocked state — ao sends keystrokes to tmux panes

## Related products / paths

- `.kimi-code/skills/agent-orchestrator/SKILL.md` + `~/.claude/skills/agent-orchestrator/` scripts
- `~/.agent-orchestrator/ORCHESTRATOR.md` (agent-agnostic mirror)
- Research INDEX rows: herdr v0.9.0 (`rq-20260908-028`), herdr-lantern (`rq-20260908-005`, decision=watch)
- Prior verdict: do NOT adopt Herdr as a second orchestrator brain; UX patterns only (Lantern watch memo)

## Delta log

- 2026-09-08 — rq-20260908-028 / herdr v0.9.0: full baseline written; decision thin_adapter (ao stays brain, herdr optional transport layer); see `Research/specs/herdr-v090-adapter.md`
- 2026-09-08 — human pivot: thin_adapter archived → **fork_reskin** (`Research/specs/allternit-runtime-fork.md`); one Allternit-branded Rust binary absorbs the runtime + ao semantics + Fabric node + harness sync + visibility; phases 2–6 each gate separately
- 2026-09-09 — rq-20260909-004 / HarnessRouter CE: decision **reverse_engineer** — adopt UHP (Unified Harness Protocol, open versioned HTTP contract) as the canonical harness-router API; closes the "no agent-native API surface" gap below ao / in AllternitOS Layer 3. Upstream container is Docker-gated (veto) so no thin_adapter/fork; provider routing stays in the Allternit gateway (not ported). Complements, does not replace, the ao v3 fork.
