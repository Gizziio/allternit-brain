---
doc: project
updated: 2026-09-09
status: draft
---

# prep-p5-visibility-peers — "Who needs you" panel: engine states, native sessions, Rails peers

Pre-gate research memo for P5 (Visibility + peers) of the ao v3 plan
(`Products/AgentOrchestratorRuntime.md` §5 P5, §2.2, §2.5). Read-only against the
vendored fork at `allternit-workspace/allternit/infrastructure/executor/ao-engine/`
(P0 applied; binary already builds as `ao`), the main repo's `cmd/gizzi-code`,
`packages/@allternit/native-sessions`, `rails/`, and `cmd/allternit-api/`.
All `file:line` references are against those checkouts.
**Path deviation (noted):** the prompt named a gizzi-code checkout at
`allternit-workspace/allternit-session-pdf-surface` — that directory does not
exist on this machine. The same code was read at its canonical location
`allternit-workspace/allternit/cmd/gizzi-code/` (paths match plan §2.5 exactly),
so no finding is UNVERIFIED for that reason.

## Headline

P5 is three-way merge, not three builds. **Live-pane half: done.** The engine
already has the full working/blocked/idle state machine, a pushed-state channel
from the CLIs themselves (`pane.report_agent`), socket events
(`pane.agent_status_changed`), sound/toast/desktop-notification surfacing of
blocked transitions, and a TUI agent list whose status priority puts Blocked on
top. **Native-session half: data exists, state does not.** The gizzi
native-session catalog is a *file* index (path, mtime, sha fingerprint) — it has
no live working/blocked signal, and the plan's verify line only requires a
picked-up session to *appear alongside* ao sessions, which the catalog + the
engine's `agent_session` join key can satisfy. **Rails peers: registry exists,
is local-only, and has a poll/heartbeat model an ao subcommand can reuse
verbatim.** The real P5 work is one new TUI view (panel) inside the ao client
shell that merges these three feeds, plus one notification fan-out decision.
No engine changes are required; everything is additive in `src/ao/` + client
shell.

## Evidence base

- Plan: `/Users/joe/Desktop/Allternit/Allternit Brain/Products/AgentOrchestratorRuntime.md` (§2.2 engine, §2.5 native sessions, P5 at lines 145-147)
- Engine: `infrastructure/executor/ao-engine/src/` (detect, api/schema, app, client/shell, server/headless, integration/assets)
- Native sessions: `cmd/gizzi-code/src/runtime/session/native-source.ts`, `cmd/gizzi-code/src/runtime/server/routes/native-session.ts`, `packages/@allternit/native-sessions/src/{types,catalog,harness}.ts`
- Rails peers: `rails/src/peer/mod.rs`, `cmd/allternit-api/src/rails/mod.rs`, `cmd/allternit-api/src/remote_peers.rs`, `cmd/gizzi-code/src/runtime/gizzi-core/services/railsPeer.ts`
- Lantern: `Projects/link-ingest/inbox/2026-09-08-safari/li-20260908-007-herdr-lantern-herd-visibility-plugin.md`, `Research/drafts/herdr-lead-intake-eval--WATCH-MEMO.md`, `Research/queue.json` (`rq-20260908-005`), upstream README (fetched 2026-09-09)

## Findings

### 1. Engine agent states — representation, signaling, and external enumeration

**State machine.** `AgentState { Idle, Working, Blocked, Unknown }`
(`src/detect/mod.rs:11-20`) is the screen/hook-derived state. A richer
`AgentDetection` struct carries arbitration metadata (`visible_idle`,
`visible_blocker`, `visible_working`, `skip_state_update`,
`src/detect/mod.rs:24-39`). The wire/API projection is a separate enum,
`AgentStatus { Idle, Working, Blocked, Done, Unknown }`
(`src/api/schema/common.rs:158-166`) — note the extra `Done`, and
`PaneAgentState` (`common.rs:149-156`) for the push channel. Conversion rules
live in `src/app/api_helpers.rs:3-104` (Blocked ranks highest in sort order at
`api_helpers.rs:3-4`).

**Two authorities feed the state.** (a) Screen-manifest detection: TOML
manifests per agent in `src/detect/manifests/*.toml` with `state = "blocked"`
rules — kimi has three blocked rules (`detect/manifests/kimi.toml:9,29,43`),
claude/codex/grok/gemini/pi/opencode etc. all ship blocked rules. (b) Pushed
state from the CLI itself: lifecycle-hook integrations call
`ao pane report-agent <pane_id> --source ID --agent LABEL --state
idle|working|blocked|unknown [--message …] [--seq N] [--agent-session-id ID]`
(`src/cli/pane.rs:1166-1229`), which maps to socket methods
`pane.report_agent` / `pane.report_agent_session`
(`src/api/schema.rs:219-222`, params at `src/api/schema/panes.rs:448+`).
The kimi hook is a 61-line sh+python UDS client that sends
`{pane_id, source:"herdr:kimi", agent:"kimi", state, seq, agent_session_id}`
to `$HERDR_SOCKET_PATH` (`src/integration/assets/kimi/herdr-agent-state.sh:34-58`;
PowerShell twin at `herdr-agent-state.ps1:27-32`). The same pattern ships for
opencode (`assets/opencode/herdr-agent-state.js:109-118`), devin, kilo, etc.
**The CLI-reported state includes the CLI's own session id** via
`--agent-session-id`, surfaced on the wire as `AgentSessionInfo { source, agent,
kind, value }` inside `AgentInfo` (`src/api/schema/agents.rs:228-234`,
`agent_session` field at `agents.rs:209-210`). This is the join key between a
live pane and its on-disk native session (Finding 2).

**Surfacing of blocked.** On transition *to* Blocked the engine plays
`Sound::Request` and raises a `ToastKind::NeedsAttention` toast
(`src/app/actions.rs:74-83, 97-110, 121-129`; toast mapping at
`actions.rs:2008-2009`; sound enum `src/sound.rs:30-37`). Headless mode
converts toasts into semantic notifications `NeedsAttention`/"needs attention"
with `SemanticNotificationSound::Request` (`src/server/headless.rs:100-101`,
`src/server/headless/notifications.rs:88-98`) — the desktop-notification path
for "blocked agent" already exists engine-side. The TUI renders these as
banners: `"{agent} waiting"` with a red dot for NeedsAttention
(`src/client/shell/notifications.rs:75-93`).

**External enumeration — "which agents need me right now".** Trivially yes,
three ways, all over the vendored ND-JSON UDS socket API (`src/api/`):
1. Poll: `agent.list` returns `Vec<AgentInfo>` with `agent_status`, `name`,
   `cwd`, `workspace_id/pane_id`, `state_labels`, `agent_session`
   (`src/app/api/agents.rs:28-35`; schema `agents.rs:186-226`). CLI:
   `ao agent list` (`src/cli/agent.rs:438-448`) — prints the raw JSON response.
2. Subscribe: `events.subscribe` with `pane.agent_status_changed` yields
   `PaneAgentStatusChangedEvent { pane_id, workspace_id, agent_status, agent,
   title, state_labels }` (`src/api/schema/events.rs:75-80, 398-411`).
3. Wait: `agent.wait` blocks until the agent reaches a status set
   (`src/api/wait.rs:132-171`, `until` status set at `:149`).
Additionally `agent.prompt` is *refused* with error code `agent_blocked` when
the target is Blocked (`src/app/api/agents.rs:138-147`, test at
`:517-551`) — blocked is a first-class engine concept, not a UI inference.

### 2. Native sessions half — schema, on-disk layout, and the state gap

**Catalog schema.** `NativeSession { harness, sessionId, path, cwd?, title?,
updatedAt, createdAt?, fingerprint, lastEventId?, installed, reader,
projectable }` (`packages/@allternit/native-sessions/src/types.ts:59-73`).
Transcripts are `PortableEvent { kind: message|tool_call|tool_result|…, role,
text, toolName, …, inert: true }` (`types.ts:32-57`). **There is no live
state field** — no working/blocked/idle, no permission/approval flag. The
catalog knows a session exists, where it lives, and when it last changed; that
is all. Reader kinds: `jsonl | sqlite | directory | protobuf | cli-export`
(`types.ts:43`).

**On-disk layout (per harness, `harness.ts:14-40`).** kimi (Kimi Code):
`~/.kimi-code`, reader `directory` — sessions under
`<root>/sessions/wd_*/session_*/` with `state.json` (`{id, cwd, updatedAt}`)
and `agents/main/wire.jsonl`; fingerprint = hash of both files
(`catalog.ts:170-205`). claude: `~/.claude/projects/<cwd-dir>/*.jsonl`
(reader `jsonl`, `catalog.ts:47-73`, `harness.ts:14`). codex:
`~/.codex/sessions/**/rollout-*-<uuid>.jsonl[.zst]` (`catalog.ts:75-119`).
27 adapters total (`harness.ts:14-40`), five reader kinds.

**API surface that ao would mirror.** gizzi exposes GET `/harnesses`, GET
`/list?cwd&harness`, GET `/show/:harness/:id`, POST `/pickup`, POST
`/:id/fetch`, POST `/:id/export`, GET `/:id/origin`
(`cmd/gizzi-code/src/runtime/server/routes/native-session.ts:14-138`). The
pickup core is thin: `NativeSource.pickup` snapshots a native session into a
gizzi session with `sourceRef` (hash-chain provenance, `native-source.ts:103-121`);
`fetch` computes an origin delta (`native-source.ts:123-160`). gizzi's own
session DB (SQLite, `session.sql.ts`) is *not* needed for the P5 panel — ao
only needs the catalog/list half.

**How ao (Rust) reads the same state.** For the P5 panel, a Rust port needs
only: (1) the harness table (`harness.ts:14-40` → a static array), (2) the
directory/jsonl catalog walkers for at minimum kimi + claude + codex
(`catalog.ts:47-244`), (3) the fingerprint scheme (`fingerprint.ts`). No SQLite
readers are needed for the panel (opencode/antigravity/hermes/crush are
sqlite/protobuf readers — defer). Nothing here is live: the panel's
native-session rows are "session exists, last touched at T, resume hint", and
*live state for a pane-hosted session comes from the engine half via the
`agent_session` join key* (Finding 1), not from the native files. A native
session running *outside* any ao pane (e.g. a bare `claude` in another
terminal) can only be shown as a catalog row — detecting "blocked" from JSONL
tail content is possible in principle (permission prompts are text in the
transcript) but is exactly the fragile screen-scraping the engine already does
better on PTYs; do not spec it.

### 3. "Rails peers" — what a peer is today and what state is available

**A peer is a registered local agent session, not a machine and not a
runtime-device.** `Peer { peer_id, name, cwd, vendor, inbox_socket,
registered_at, last_heartbeat_at, status }`
(`rails/src/peer/mod.rs:44-56`), persisted at
`<root>/.allternit/peers/registry.json` with UDS inboxes in
`.allternit/peers/inbox/` (`peer/mod.rs:73-89`). Lifecycle:
`PeerStatus { Active, Idle, Dead }` (`peer/mod.rs:27-36`); `heartbeat` flips to
Active (`:151-164`); `list()` re-checks socket liveness and marks Dead when the
inbox socket is gone (`:186-197`). Registry is intentionally local-only: two
sessions see each other only under the same `.allternit` root
(`peer/mod.rs:1-8` doc comment).

**HTTP surface (allternit-api, mounted at `/api/rails`).**
`GET/POST /peers`, `DELETE /peers/:id`, `POST /peers/:id/heartbeat`,
`POST /peers/:id/send`, `GET /peers/:id/inbox`
(`cmd/allternit-api/src/rails/mod.rs:204-208`), registry opened at
`:159`. Cross-machine extension exists as **remote peers fabric**:
`remote-peers.json` / `peer-runs.json` / `peer-roster.json`, dm/run ops,
ghost retention on poll failure (`cmd/allternit-api/src/remote_peers.rs:1-35,
77-99, 147-155`) — presence data here is reachability + last poll, no agent
state. **gizzi-code already demonstrates the client pattern ao should copy:**
`railsPeer.ts` registers on session start and polls the HTTP inbox
(`cmd/gizzi-code/src/runtime/gizzi-core/services/railsPeer.ts:3-8, 47-69`);
HTTP-polling peers create a placeholder inbox socket because `list()` marks
peers dead when the socket path is absent (`railsPeer.ts:67-70` — coupling
note).

**Distinct "peer" concepts to keep straight (spec must name them):**
(i) Rails peers (this finding) — agent sessions, local + optional remote fabric;
(ii) Fabric runtime-devices (`cmd/allternit-cloud-api/src/routes/runtime_pairing.rs`,
P3's pairing surface — **not read in depth, not P5's "Rails peers"**);
(iii) herdr/ao *machines* (SSH endpoints from P2). P5's "Rails peers" per the
plan's target architecture is (i): "Rails peer registry
(allternit-agent-system-rails)" (`AgentOrchestratorRuntime.md:104`).

**Available peer state for the panel:** name, cwd, vendor, status
(active/idle/dead), registered/heartbeat timestamps, inbox address, unread
inbox envelopes (`poll_peer_inbox`). There is no "blocked" concept at the Rails
layer — a peer *is* an agent session that could register extra fields, but the
registry schema has no extension slot (`peer/mod.rs:44-56`, no
`#[serde(flatten)]` extras map). If the panel wants "peer X is blocked on
approval", either the peer's vendor reports it elsewhere or P5 adds an
optional metadata map (schema change, versioned file — registry.json is
versionless today).

### 4. Lantern UX reference and the rq-20260908-005 watch verdict

**Prior verdict (stands, now to be revisited with our own runtime).**
Queue item `rq-20260908-005` = `aigorahub/herdr-lantern`, decision `watch`
(`Research/queue.json:283-288`; inbox card
`li-20260908-007-herdr-lantern-herd-visibility-plugin.md`). The watch memo's
rationale: do **not** adopt Herdr as runtime (parallel orchestrator,
product/account surface — veto-adjacent); "extract UX ideas (field status /
who-needs-you) only … optional later reverse_engineer of status overlay
without Herdr" (`Research/drafts/herdr-lead-intake-eval--WATCH-MEMO.md:34`).
P5 is exactly that later reverse-engineer, now legitimate because ao *is* our
own herdr-lineage runtime. Verdict language to preserve at the P5 gate: no
upstream plugin adoption; UX patterns only.

**Lantern patterns worth extracting (upstream README, fetched 2026-09-09):**
- The panel's core readout: **"who needs you, what they are working toward,
  jump to a pane, start a new agent"** — the sidebar "already marks working,
  blocked, done, or idle".
- **Field snapshot** on light-up: pane titles, `/goal` / recap lines, who is
  waiting on you; "What's going on" names every open tab **working and blocked
  first, then done and idle** — matches our `status_priority`
  (`client/shell.rs:219-228`: Blocked 4 > Done 3 > Working 2 > Idle 1).
- **Persistent monitor posture**: Lantern "keeps the work moving", raises only
  decisions that need you, and "if every remaining task needs your input,
  reports the blocks and pauses checks" — the P5 notification semantic.
- Lantern is a **chat-tab-in-its-own-workspace** plugin (🔥 lantern workspace,
  helper CLI driving `herdr` through a mutate gate). P5 should take the
  readout patterns, not the chat-tab host. The vendored engine retains a
  plugin system (`src/plugin_command.rs`, `src/plugin_paths.rs`,
  `src/app/api/plugins/`), but plan §8 excludes plugin-marketplace scope, and
  the watch memo vetoes plugin adoption — the panel is native TUI, not a
  plugin.

### 5. Where the panel lives — TUI panel inside ao (justified)

**The plan's wording implies in-TUI.** P5 is a "panel" in the same breath as
"P2 rebranded the TUI"; §2.6 already names "the visibility panel (P5)" as a UX
consumer of the HR console *reference*, and the target architecture keeps
everything inside the one `ao` binary (`AgentOrchestratorRuntime.md:82, 90-111,
145-147`). The P2 memo established that the client shell already renders a
combined cross-machine agent panel (`endpoint_agents.rs:97-127`,
`aggregate_navigation.rs:80-107`) with stale-dimming and click-through
activation (`endpoint_navigation.rs:38-54`). A desktop-side panel would require
a new surface + sync story the plan never asks for; a whole new TUI *app* is
contradicted by "one binary, one background server" (`:113-115`).

**Recommendation: a new view (panel) inside the ao client shell**, not a
modification of the existing agent sidebar. Evidence for "view" over "sidebar
tweak": the shell's notification/banner machinery (`client/shell/notifications.rs`)
and the aggregate sorting (`aggregate_navigation.rs`) already cover
"blocked-first" inside the sidebar; what P5 adds is a *merged feed of three
sources* (engine agents + native catalog + Rails peers) plus notification
fan-out — that is a distinct composition, cleanest as its own panel toggled
from the shell (Lantern's "jump to a pane" maps to existing
`ActivateEndpoint`/focus flows, `endpoint_navigation.rs:38-54`,
`handle_agent_focus` at `app/api/agents.rs:47-54`).

**What the "two concurrent ao sessions, one blocked" demo needs that doesn't
exist yet:**
1. The panel view itself (new client-shell module; merges three feeds).
2. **Native-session feed in Rust** — port of the catalog list half (kimi,
   claude, codex first) into ao-core; no equivalent code exists in the engine.
3. **Rails peer feed in ao** — `ao peer list|send` exists as plan CLI surface
   (`AgentOrchestratorRuntime.md:121`) but zero peer code exists in the engine;
   ao can either link `allternit-agent-system-rails` (workspace crate,
   `Cargo.toml:149`) or shell to `allternit-rails peer list` — decision needed.
4. **Blocked-agent notification fan-out decision** — engine already emits
   sound + toast + semantic notification (Finding 1); P5 must decide what the
   panel adds: a persistent "waiting on you" list (vs transient toasts) and
   whether blocked events also go to macOS notification center via the
   headless semantic path. UNVERIFIED: whether the semantic headless path is
   wired to OS notifications on macOS or only in-TUI banners
   (`server/headless/notifications.rs:88-98` shows construction; delivery
   target not traced).
5. **Join-key correlation** — to show a kimi/claude session "alongside" ao
   sessions without double-listing, the panel must match `AgentInfo.agent_session`
   (`agents.rs:209-210`, populated by the CLI hooks, Finding 1) against native
   catalog `harness+sessionId` (`types.ts:59-73`). Fallback when no join:
   show the catalog row as external (no live state) — satisfies the verify
   line as written.
6. Nothing engine-side: state machine, events, push channel, and refusal
   semantics are all present (Finding 1).

## Implications for the phase spec

1. **Panel home:** new client-shell view inside the ao TUI (decision per
   Finding 5). Fork-diff guardrail applies (plan §7): additive `src/ao/`
   module + shell view only; no engine logic edits. Explicit non-goal:
   desktop-side panel and Lantern-style chat-tab host.
2. **Feed 1 (engine agents):** consume the existing socket API
   (`agent.list` poll + `events.subscribe pane.agent_status_changed`); do not
   add an engine RPC. Blocked is detected via manifests + `pane.report_agent`
   push; both already exist. `ao agent list` JSON is the headless contract the
   panel's CLI twin (`ao peer visibility` / `ao ui --panel`?) should reuse.
3. **Feed 2 (native sessions):** port the catalog *list* half only
   (`NativeSession` schema, harness table, kimi/claude/codex walkers,
   fingerprint) into ao-core; explicitly defer sqlite/protobuf readers and the
   gizzi SQLite session DB. Native rows render as catalog entries
   (path/cwd/updatedAt/resume-hint); live state only via the `agent_session`
   join key when the session is pane-hosted. Do not spec transcript-tail
   blocked-detection for external sessions.
4. **Feed 3 (Rails peers):** `ao peer list` reads `PeerRegistry`
   (`<root>/.allternit/peers/registry.json`) or the `/api/rails/peers` HTTP
   surface; `ao peer send` maps to `POST /peers/:name/send`. Decide at spec
   time: link the `allternit-agent-system-rails` crate (workspace member
   already, `Cargo.toml:149`) vs spawn the `allternit-rails` CLI — prefer the
   crate, avoid a node/api dependency for a local JSON file. Register ao
   sessions as peers (gizzi pattern, `railsPeer.ts:47-69`) only if the demo
   needs ao itself in the peer list.
5. **Notification semantics (binding):** blocked transitions already produce
   sound + toast + semantic notification engine-side; P5's addition is the
   persistent "waiting on you" list and the fan-out decision (OS notification
   center yes/no). Spec must state blocked-inclusion and blocked-removal
   semantics (clears on transition out of Blocked; `state_change_seq`,
   `agents.rs:219-220`, is the ordering token).
6. **Verify scenario decomposition** (plan `:147`): (a) two engine agents, one
   driven to a permission prompt — blocked detection needs the kimi manifest
   (`detect/manifests/kimi.toml:9,29,43`) or the kimi integration hook; verify
   which ao spawn path installs the hook (`src/integration/assets/kimi/`,
   "managed by herdr" header at `herdr-agent-state.sh:2`) before demo day;
   (b) a bare kimi/claude session outside ao appears in the panel via the
   native catalog feed. Both are panel-render assertions, not engine changes.
7. **Lantern attribution:** spec records P5 as the revisit of
   `rq-20260908-005` (watch → reverse_engineer UX patterns, still no upstream
   plugin adoption), citing the watch memo and this memo; queue item updated
   at land time, not at spec time.

## Open questions / risks

1. **OS-notification delivery unverified:** the semantic "agent attention"
   notification is constructed headless (`server/headless/notifications.rs:88-98`)
   but this memo did not trace its delivery target on macOS (notification
   center vs TUI-only). The spec's "blocked-agent notifications" verb depends
   on the answer.
2. **Peer registry root:** `PeerRegistry::new(root_dir)` resolves
   `<root>/.allternit/peers/` — which root ao should use (session cwd? repo
   root? `$HOME`?) is unspecified, and peers under different roots are
   invisible to each other (`peer/mod.rs:1-8`). Wrong default = empty panel in
   the demo.
3. **HTTP-poll peer liveness coupling:** `PeerRegistry::list()` marks peers
   dead when the inbox socket path is absent (`peer/mod.rs:186-197`), so
   HTTP-polling peers must create a placeholder socket (gizzi workaround,
   `railsPeer.ts:67-70`). If ao registers as a peer, it inherits this quirk —
   or fixes it, which is a rails-crate schema/behavior change outside the
   fork-diff guardrail.
4. **Join-key coverage unverified:** `AgentSessionInfo` is populated only when
   the CLI hook reports a session id (kimi/opencode/devin/kilo assets do;
   `claude.toml`/`codex.toml` manifests exist but this memo did not verify a
   claude hook asset). If claude doesn't push session ids, claude panes can't
   be deduped against the native catalog and will double-list. Check
   `src/integration/assets/` for claude before spec'ing dedupe.
5. **"Two concurrent ao sessions" ambiguity:** read literally as two agent
   panes in one engine server (herdr model = one server per host,
   `AgentOrchestratorRuntime.md:113`) the demo is straightforward; read as two
   engine servers it needs a multi-server aggregator that does not exist and
   is closer to P3 Fabric territory. Spec should pin the interpretation.
6. **Peer state is presence-only:** Rails peers carry no blocked/working
   field (`peer/mod.rs:44-56`). If the panel must show "peer X needs you",
   either peers gain an optional metadata map (versioned registry.json
   migration) or that signal rides inbox envelopes instead. Pick one in the
   spec; do not silently grow the registry schema.
7. **Native-catalog staleness model:** fingerprints/mtimes detect change but
   the panel needs a refresh policy (poll interval vs on-focus) — unbounded
   polling of 27 harness home dirs is cheap on mtime but the spec should fix
   the number (gizzi's 3,340-session production figure shows scale is fine,
   plan §2.5).
