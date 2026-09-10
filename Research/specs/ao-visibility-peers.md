---
doc: project
updated: 2026-09-10
status: draft
---

# ao-visibility-peers (P5)

## Goal

P5 of the ao v3 plan (`Products/AgentOrchestratorRuntime.md` §5): the
"who needs you" panel — engine agent states (working/blocked/idle) + native
CLI sessions + Rails peers, merged in one new view inside the ao client
shell, with a persistent waiting-on-you list. Revisits `rq-20260908-005`
(watch → reverse-engineer Lantern UX patterns only; still no upstream plugin
adoption).

**Verify (plan, pinned interpretation):** two agent panes in ONE engine
server, one driven to a permission prompt — the panel surfaces it in the
waiting-on-you list; a bare kimi/claude session outside ao appears in the
panel via the native-session catalog feed alongside ao sessions.

## Source link(s)

- Plan: `Products/AgentOrchestratorRuntime.md` §5 P5, §2.2, §2.5
- Binding memo: `Research/drafts/prep-p5-visibility-peers.md` — **wins over
  this spec on disagreement** (update this spec if so)
- Platform sync contract: `Research/drafts/agent-sessions-sync-contract.md`
- Lantern watch: `Research/drafts/herdr-lead-intake-eval--WATCH-MEMO.md`,
  `rq-20260908-005`

## Affected repo / surface

- Repo: `Gizziio/allternit-platform` (checkout `~/Desktop/allternit-workspace/allternit`)
- New module: `ao` crate (`infrastructure/executor/`, sources under
  `src/ao/`) — `visibility/` (feed merges) + `native/` (catalog port);
  new client-shell view in the ao TUI
- Engine crate (`herdr` at `infrastructure/executor/ao-engine/`): **NO
  changes** — state machine, events, push channel, blocked refusal all exist
- Rails crate: link `allternit-agent-system-rails` (workspace member already)

## Integrate decision

fork_reskin (continues queue `rq-20260908-028`; same fork as P0–P4).

## Binding decisions (from memo, condensed + spec-time calls)

1. **Panel home:** new view inside the ao client shell (not a sidebar tweak,
   not a desktop surface, not a Lantern-style chat-tab host). Additive
   `src/ao/` + shell view only; fork-diff guardrail applies.
2. **Feed 1 — engine agents:** consume the existing socket API
   (`agent.list` poll + `events.subscribe pane.agent_status_changed`); no new
   engine RPC. Blocked comes from manifests + `pane.report_agent` push, both
   existing. `ao agent list` JSON is the headless contract.
3. **Feed 2 — native sessions:** port the catalog **list half only** into the
   `ao` crate: `NativeSession` schema, the 27-entry harness table
   (memo §2; kimi/claude/codex walkers first), fingerprint scheme. **Defer**
   sqlite/protobuf readers and the gizzi SQLite session DB. Native rows render
   as catalog entries (path/cwd/updatedAt/resume hint); live state only via
   the `agent_session` join key when pane-hosted. **Do not** spec
   transcript-tail blocked-detection for external sessions.
4. **Feed 3 — Rails peers:** link the `allternit-agent-system-rails` crate;
   read `PeerRegistry` (`<root>/.allternit/peers/registry.json`). `ao peer
   list|send` CLI surface per plan §4. Registry root for the demo: the ao
   process's active workspace root (documented in NOTES; wrong root = empty
   panel — demo-day check).
5. **Join-key correlation:** match `AgentInfo.agent_session` (populated by
   CLI hooks) against native catalog `harness+sessionId`. Fallback: catalog
   row shows as external (no live state) — satisfies the verify line.
   **Executor must check `src/integration/assets/` for a claude hook asset
   before demo day** (unverified in memo); if claude doesn't push session
   ids, claude rows double-list — acceptable, note it.
6. **Notification semantics (binding):** blocked transitions already produce
   sound + toast + semantic notification engine-side. P5 adds the PERSISTENT
   waiting-on-you list (enters on transition to Blocked, clears on transition
   out; `state_change_seq` is the ordering token). OS-notification-center
   fan-out: **deferred** (delivery target unverified, memo open question 1) —
   not a P5 gate.
7. **Platform sync (scope-corrected):** ao sessions reach the platform
    catalog via the P3 relay proxy surface (`/v1/remote-control/sessions`) —
    already landed. The `/api/v1/agent-sessions/sync` SSE bus is gizzi-bus
    semantics and does not apply to a pure ao node (contract:
    `Research/drafts/agent-sessions-sync-contract.md`). If ao ever co-locates
    with allternit-api (Desktop-style), the sync call shape is documented
    there (loopback + device Bearer + Last-Event-ID). **No sync caller is a
    P5 deliverable.**

## Explicit non-goals

- Desktop-side panel; Lantern chat-tab host; upstream plugin adoption.
- Transcript-tail state inference for external native sessions.
- Cloud-edge device-token support for /sync (separate platform PR if wanted).
- Multi-engine-server aggregation (two panes in ONE server is the pinned
  interpretation; multi-server is P3 Fabric territory).

## Verify plan

1. `cargo test -p herdr` stays green (no engine edits expected); new module
   tests for catalog walkers + join-key correlation.
2. Demo script: ao server + two panes (kimi + one other); drive kimi to a
   permission prompt (kimi manifest blocked rules exist; verify which spawn
   path installs the hook before demo day); panel shows the waiting-on-you
   entry, blocked-first ordering; transition out of blocked clears it.
3. Start a bare `claude` (or kimi) session outside ao in a known cwd; panel
   native feed lists it; it renders alongside (not duplicated against) ao
   sessions when the join key matches.
4. Screenshot evidence to `~/.agent-orchestrator/evidence/ao-visibility-peers/`.

## Goal body (paste into /goal when human-approved)

Drive P5 of the ao v3 runtime plan (Allternit Brain/Products/
AgentOrchestratorRuntime.md §5) to a merged PR. Spec:
Research/specs/ao-visibility-peers.md; binding memo:
Research/drafts/prep-p5-visibility-peers.md (memo wins on disagreement).
Implement in the ao crate (infrastructure/executor/, src/ao/): (1) the
"who needs you" panel as a new view inside the ao client shell merging three
feeds — engine agents via the existing socket API (agent.list +
pane.agent_status_changed events), native CLI sessions via a Rust port of the
catalog list half (NativeSession schema + 27-harness table, kimi/claude/codex
walkers first, fingerprint scheme; defer sqlite/protobuf readers), Rails
peers via the allternit-agent-system-rails crate (PeerRegistry at
<workspace>/.allternit/peers/registry.json); (2) the persistent
waiting-on-you list (enters on Blocked transition, clears on exit,
state_change_seq ordering); (3) join-key correlation matching
AgentInfo.agent_session against native catalog harness+sessionId, external
fallback when no join. NO engine (herdr crate) changes — state machine,
events, push channel all exist. Hard gate = the plan verify line: two agent
panes in one engine server, one blocked on a permission prompt, surfaced in
the panel; plus a bare kimi/claude session outside ao listed via the native
feed alongside ao sessions. Screenshot evidence to
~/.agent-orchestrator/evidence/ao-visibility-peers/. Honest NOTES sentinel
docs/AO_VISIBILITY_PEERS_NOTES.md; ledger attestation on land. Harness rules:
no secrets in commits, no rm -rf (mktemp -d), honest failure reporting.

## Model route

Task class `client_coding_work` → A://C tier (per model-routing.json).
Executor: orchestrated CLI agent in own tmux session + worktree
(`allternit-ao-visibility-peers`, branch `ao/visibility-peers`), following
the P0–P4 executor pattern.
