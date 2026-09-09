---
doc: project
updated: 2026-09-09
status: draft
---

# ao-tui-machines (P2)

## Goal

P2 of the ao v3 plan (`Products/AgentOrchestratorRuntime.md` §5): the herdr-derived
TUI ships as the ao face — name/window-title/config rebrand via a small fixed
string list (~12 sites) plus the single `app_dir_name()` path lever — and
`ao machine add|list|remove|connect` is exposed with Allternit default config.
P1 (engine parity) must land first. Scope is wire-up + pilot, NOT construction:
per the grounding memo, machine CLI, combined cross-machine agent list, and
reconnect-on-drop already exist in the vendored crate.

## Source link(s)

- Plan: `Products/AgentOrchestratorRuntime.md` §5 P2, §2.2
- Grounding memo: `Research/drafts/prep-p2-tui-machines.md` (10 binding design
  decisions — binding for this spec)
- Engine: `infrastructure/executor/ao-engine/` (P0 output; P1 adds ao-core)

## Affected repo / surface

- `infrastructure/executor/ao-engine/` — ~12 rebrand string sites + `app_dir_name()`
- `src/ao*` (P1's additive modules) — `machine connect` thin mapping (~80 lines, additive)
- Embedded `DEFAULT_CONFIG` (Allternit defaults)
- NO new vendored deps; NO aggregated machine RPC (TUI-internal combined view is
  sufficient — memo decision)

## Division / owner

- [Platform / Surfaces](../../Divisions/INDEX.md)

## Integrate decision

fork_reskin (continues queue `rq-20260908-028`; P2 shares the fork).

## Binding decisions (from memo §6, condensed)

1. Rebrand = the memo's fixed ~12-site list + `app_dir_name()` only — no string sweep; TUI render code stays untouched (it is already brand-free).
2. `[theme]` is colors-only; app-name/window-title rebrand is code-level, not config.
3. State paths flip `herdr` → `ao` via `app_dir_name()` (config `~/.config/ao`, state `~/.local/state/ao`) in one commit, with a one-time migration note (rename existing dirs, no data transform).
4. `ao machine connect` maps to `remote::run_remote` (thin, additive; no new transport).
5. Combined agent list uses the existing `agent_rows`/`aggregate_agent_rows` machinery unchanged.
6. Reconnect-on-drop ships as-is (supervisor backoff 500 ms→30 s, generation-fenced); pilot verifies it, we do not rebuild it.
7. Allternit default config ships in the embedded `DEFAULT_CONFIG`; endCliOutput paths follow `app_dir_name()`.
8. Remote install suffix `.local/bin/ao`; `HERDR_*` env vars keep their prefix (documented).
9. `~/.agent-orchestrator/` compat is P1's transcript sink only — P2 adds nothing there.
10. Fork-diff guardrail: P2 PR = gut list + name strings + machine connect + default config. Nothing more.

## Work items

1. Rebrand commit (fixed string list + `app_dir_name()` + path migration note).
2. `machine connect` subcommand (thin `remote::run_remote` mapping + clap spec entry).
3. Allternit `DEFAULT_CONFIG`.
4. Multi-machine pilot: this Mac + one Linux host — machine add over SSH, combined agent list shows both, kill the SSH bridge and watch supervisor reconnect (backoff ≤ 30 s).

## Verify

- `ao --version` and window title show ao branding; zero `herdr` user-visible strings in the TUI (grep evidence list in PR).
- `ao machine list/add/remove/connect` round-trip against a real Linux host (evidence: session log).
- Pilot evidence per work item 4, including the reconnect event.
- `cargo test -p herdr` parity with P0 baseline (no new failures; classify honestly vs P0's pre-existing upstream SIGPIPE/detect flakes).
- Fork-diff guardrail: PR diff outside the rebrand list + machine connect + DEFAULT_CONFIG = empty.

## Done

`docs/AO_TUI_MACHINES_NOTES.md` sentinel in the P2 worktree with pilot evidence and honest deferrals; PR merged; queue history event; dashboard regen.
