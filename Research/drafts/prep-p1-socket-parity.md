---
doc: project
updated: 2026-09-08
status: draft
---

# p1-socket-parity — herdr v0.9.0 socket API surface for the ao six-script contract

Pre-gate research memo for P1 (engine + contract parity) of the ao v3 plan
(`Research/../Products/AgentOrchestratorRuntime.md`, queue `rq-20260908-028`).
Read-only; upstream GitHub only. All `file:line` references are against the
`v0.9.0` tag: `https://github.com/herdrdev/herdr/blob/v0.9.0/<path>#L<line>`.

## Summary

The herdr v0.9.0 socket API covers ~90% of the ao six-script contract directly:
panes map to tmux panes (read/send/close/exited events), workspaces map to
tmux sessions (label = name), and `worktree.create`/`worktree.remove` map to
ao's worktree flags. The four real gaps are: (1) no engine-side transcript
file (the `script -q` byte-0 log must be built by ao), (2) no alive/dead flag
on pane state — death is event-only, so a late-connecting `ao-watch` can miss
it, (3) no duplicate-name guard on `workspace.create` (ao-core must enforce
the slug-uniqueness contract), and (4) `pane.send_text` does no bracketed
paste — ao-send must use `pane.send_input`, whose key namespace is crossterm
style (`ctrl+u`, never `C-u`).

## Evidence base

- Product plan: `/Users/joe/Desktop/Allternit/Allternit Brain/Products/AgentOrchestratorRuntime.md` (ao contract table §2.1, architecture §3, P1 verify §5).
- ao contract source (read-only): `~/.claude/skills/agent-orchestrator/scripts/{ao-spawn,ao-send,ao-watch,ao-status,ao-kill,ao-doctor}`.
- Upstream herdr v0.9.0 source, fetched as tag tarball from GitHub and inspected (not modified, not built):
  - `src/api/schema.rs` — the full `Method` enum (wire method names).
  - `src/api/schema/{panes,workspaces,worktrees,agents,events,common,response,session,server,tabs,commands}.rs` — params/results.
  - `src/api/{server,client,wait,subscriptions}.rs` — wire protocol, vendored client, blocking waits, event streaming.
  - `src/app/api/{panes,layouts,workspaces}.rs`, `src/app/api_helpers.rs`, `src/app/api.rs` — server-side dispatch semantics.
  - `src/{pane,workspace/tab,workspace,worktree,terminal/state,terminal/runtime}.rs` — spawn paths.
  - `src/{cli,cli/api,cli/server,cli/agent}.rs`, `src/main.rs`, `src/session.rs`, `src/protocol/wire.rs`, `src/config/keybinds.rs`.

## Findings

### 1. Wire protocol (the transport under all six commands)

- Socket: unix domain socket, mode `0o600` (`src/api/server.rs:27`, `:141-143`). Default path `$XDG_CONFIG_HOME/<app-dir>/herdr.sock`; named sessions use `<app-dir>/sessions/<name>/herdr.sock`; `HERDR_SOCKET_PATH` env overrides (`src/session.rs:169-179`, env const at `src/api/mod.rs:16`). herdr already uses the `sessions/<name>/` layout itself (`src/api/client.rs:197-200`). **ao should run its engine as a named session (e.g. `--session ao`) so it never collides with a user's own herdr server.**
- Framing: one newline-delimited JSON request per connection; server replies with exactly one ND-JSON line and the vendored client then disconnects (`src/api/client.rs:55-61`, `:158-174`). There is no persistent request/response multiplexing — each call is a fresh `connect → write line → read line`.
- Request shape: `{"id": "<string>", "method": "<dot.name>", "params": {...}}` — serde `tag = "method", content = "params"` on `Method` (`src/api/schema.rs:36-40`). `Request { id, #[serde(flatten)] method }` (`src/api/schema.rs:24-28`).
- Response shape: success `{"id","result":{"type":"<snake_case>", ...}}` (`ResponseResult` enum, `src/api/schema/response.rs:42-305`); error `{"id","error":{"code","message"}}` (`src/api/schema/response.rs:30-40`). Malformed request → `invalid_request` error, id `""` (`src/api/server.rs:177-191`).
- Caps: max initial request 1 MB (`src/api/server.rs:32`); initial-read timeout 5 s (`src/api/server.rs:30`). `ping` → `Pong { version, protocol, capabilities }` (`src/api/schema/response.rs:45-50`); socket protocol version is `PROTOCOL_VERSION = 22` (`src/protocol/wire.rs:20`).
- Server entry: bare `herdr server` runs the headless server (`src/main.rs:545-546` → `server::headless::run_server()`). Headless virtual terminal size configurable via `[server] headless_cols/headless_rows` (default doc block `src/main.rs:221-225`).
- Reference clients: `src/api/client.rs` (`ApiClient::request_value`) and every `src/cli/*.rs` (e.g. `herdr api snapshot` at `src/cli/api.rs:60-72`) — these are the patterns ao-core's Rust client should copy. Full machine-readable schema ships in the binary: `herdr api schema --json` (`src/cli/api.rs:16-24`, vendored at `docs/next/api/herdr-api.schema.json`).

### 2. Event streaming (needed by ao-watch / ao-status / ao-kill)

- `events.subscribe { subscriptions: [ {type: "<dot.name>"}, ... ] }` (`src/api/schema/events.rs:11-85`). The connection stays open: server writes one `SubscriptionStarted` result line, then streams `EventEnvelope { event: <kind>, data: {...} }` ND-JSON lines forever, polling every 100 ms (`src/api/server.rs:700-763`). Client disconnect ends it.
- Subscription starts at `event_hub.current_sequence()` (`src/api/server.rs:708`) — **no backlog replay**: events emitted before subscribe are not delivered.
- Pane lifecycle events: `pane.created`, `pane.updated`, `pane.closed`, `pane.exited`, `pane.agent_detected`, `pane.agent_status_changed`, `pane.output_changed` (`src/api/schema/events.rs:223-253`). `pane.exited` payload is `{pane_id, workspace_id}` (`src/api/schema/events.rs:526-529`); the `Subscription` variant is a unit struct — **no server-side pane filter** (`src/api/schema/events.rs:61-62`), so ao filters by `pane_id` client-side.
- One-shot blocking variant: `events.wait { match_event: {event: "pane_exited", pane_id}, timeout_ms }` → `WaitMatched { event }` or a timeout error (`src/api/schema/events.rs:87-92`, `:178-180`; impl `src/api/wait.rs`). This is the cleanest primitive for a long-running `ao-watch` loop (no permanent socket).
- `pane.output_matched` subscription with per-subscription `{pane_id, source, lines, match: {type: substring|regex, value}, strip_ansi}` (`src/api/schema/events.rs:65-74`) — server-side grep over pane output.

### 3. Command-by-command mapping

#### ao-spawn → workspace.create + layout.apply (+ worktree.create)

Current contract (script, `~/.claude/skills/agent-orchestrator/scripts/ao-spawn`): session `ao-<slug>`, duplicate refusal, optional worktree `<repo>-ao-<slug>` on branch `ao/<slug>` with `$HOME`-root refusal, transcript from byte 0 via `script -q`, instant-exit detection with transcript tail, stdout `<session> <workdir> <logfile>`.

- **Duplicate refusal: ao-core's job.** `workspace.create` accepts any label, no uniqueness check (`src/app/api/workspaces.rs:39-85` — label applied via `set_custom_name`). ao-core must `workspace.list` and reject an existing label `ao-<slug>` (exit 1, same message shape).
- **Creating the workspace:** `workspace.create { label: "ao-<slug>", cwd, env, focus:false }` → `WorkspaceCreated { workspace, tab, root_pane }` (`src/api/schema/workspaces.rs:7-20`, `src/api/schema/response.rs:57-61`). Caveat: the created tab's root pane always spawns the **default shell** (`src/app/api/layouts.rs:122-131`) — there is no `command` field on `workspace.create`/`tab.create` (`src/api/schema/tabs.rs:7-19`).
- **Running the agent command — two viable patterns:**
  - **(A) layout.apply replace.** `layout.apply { workspace_id, tab_id: <placeholder tab>, root: {type:"pane", command: ["kimi","--yolo",...], cwd, env} }` creates a *new* tab whose root pane runs the argv directly via `create_tab_argv_command` (`src/app/api/layouts.rs:101-133`), applies any splits (`MAX_LAYOUT_PANES` 24, depth 16, `src/app/api/layouts.rs:15-16`), then closes the placeholder tab (`src/app/api/layouts.rs:153-181`). Spawn path is `split_pane_argv_command_with_ratio` → `TerminalRuntime::spawn_shell_command` (`src/app/api/layouts.rs:415-434`, `src/workspace/tab.rs:279+`, `src/terminal/runtime.rs:154-169`) with argv recorded as launch metadata (`with_launch_argv`, `src/workspace/tab.rs:174`, `src/terminal/state.rs:243-246`). Response: `LayoutApply { layout: LayoutDescription { workspace_id, tab_id, focused_pane_id, root } }` (`src/api/schema/response.rs:144-147`, `src/api/schema/panes.rs:178-185`). `command` is a JSON argv array — no shell quoting issues (vs ao's runner-file trick).
  - **(B) send-to-shell.** Skip layout.apply; `pane.send_text` a command line into the workspace root shell (`/bin/sh <runner>`), optionally `exec`-prefixed so process exit kills the pane. Simpler (one call, no placeholder tab) but reintroduces shell quoting and changes exit semantics.
  - Spec must pick; (A) preserves ao's argv-exec + instant-exit semantics most faithfully.
- **Instant-exit detection:** nothing synchronous — `layout.apply` returns success even if the child immediately dies. ao-core subscribes `pane.exited` (or polls `pane.get`) for a grace window (~0.5 s like the script's sleep) and then dumps `pane.read` tail to stderr before exit 1. **Pane content survives death**: `PaneDied` does not remove the pane; the app only emits `pane.exited` (`src/app/api.rs:265-277`).
- **Worktree:** `worktree.create { cwd, branch: "ao/<slug>", path: "<parent>/<repo>-ao-<slug>", label, trust_repository }` → `WorktreeCreated { workspace, tab, root_pane, worktree }` (`src/api/schema/worktrees.rs:13-31`, `src/api/schema/response.rs:69-74`). Branch and path are explicit, so ao's `<repo>-ao-<slug>` / `ao/<slug>` convention is expressible — but note herdr's *default* path layout differs (`<root>/<repo_name>/<branch-slug>`, `src/worktree.rs:171-172`) and its default branch is a generated `worktree/<adj>-<noun>-<hex>` slug (`src/worktree.rs:21-32`). New-branch vs existing-branch `git worktree add` is handled internally (`src/worktree.rs:311-318`). The `$HOME` git-root guard does **not** exist upstream — ao-core must keep it. `trust_repository` gates whether repo git config is honored (flag on all worktree methods).
- **Transcript (byte 0): GAP.** No engine feature writes pane output to a file (grep for transcript/ logging across `src/` finds only agent-detection manifests and integration hooks). ao-spawn's `script -q` byte-0 guarantee must be reimplemented: either (a) ao-core runs its own log writer fed from `pane.read` deltas (`PaneReadResult.revision` at `src/api/schema/panes.rs:755-764` gives a monotonic cursor; risk of loss under heavy output since reads are snapshot-based, poll interval-limited), or (b) a small additive engine patch teeing PTY output (fits the plan's "engine-side logging" note and the additive `src/ao/` module policy). Log naming must stay `~/.agent-orchestrator/logs/ao-<slug>-<timestamp>.log` (or symlinked) per plan §6.
- **stdout:** `<session> <workdir> <logfile>` — session = workspace label `ao-<slug>`; workdir from `PaneInfo.cwd` (`src/api/schema/panes.rs:527-560`); logfile = ao-managed path above.

#### ao-send → pane.send_input + pane.read (marker loop)

Current contract: bracketed paste, alnum marker (last 40 chars), two consecutive captures within 5 s, Enter only after verified landing, `C-u` (never `C-c`) on failure, exit 1.

- **Paste:** `pane.send_input { pane_id, text: "<prompt>", keys: [] }`. Server-side `encode_api_text` wraps text in `\x1b[200~...\x1b[201~` **iff** the terminal reports bracketed-paste enabled (`src/app/api_helpers.rs:25-32`) — exactly ao's `paste-buffer -p` behavior. **Do not use `pane.send_text`** — it writes raw bytes with no paste wrapper (`src/app/api/panes.rs:1801-1817`).
- **Enter / clear:** `pane.send_input { pane_id, keys: ["enter"] }` and `keys: ["ctrl+u"]`. Key namespace is crossterm style parsed by `parse_key_combo` (`src/config/keybinds.rs:1231-1294`: `enter`/`return` at :1255; modifiers like `ctrl` split on `+`). The only `C-` alias is `C-c`→`ctrl+c` (`src/app/api_helpers.rs:17-23`) — **`C-u` fails with `invalid_key`**; ao must translate. Unknown keys → error `invalid_key` (`src/app/api/panes.rs:1819-1843`).
- **Marker verification:** loop `pane.read { pane_id, source: "recent", lines: 80, format: "text", strip_ansi: true }` (`PaneReadParams`, `src/api/schema/panes.rs:354-367`). `recent` defaults to 80 lines, capped at 1000 via `lines` (`src/app/api_helpers.rs:117-118`); `visible` is the viewport; `detection` is the detection-strip text; `recent_unwrapped` also exists (`src/api/schema/common.rs:77-101`, dispatch `src/app/api_helpers.rs:119-130`). Result `PaneReadResult { text, revision, truncated }` (`src/api/schema/panes.rs:755-764`). ao-core keeps the exact two-consecutive-capture / 5 s / alnum-marker algorithm from the script.
- **Shortcut that deviates:** `pane.wait_for_output { pane_id, source, match: {type:"substring", value: marker}, timeout_ms: 5000 }` blocks server-side and returns `OutputMatched { read, matched_line }` or a `timeout` error (`src/api/wait.rs:22-120`, params `src/api/schema/events.rs:95-112`). It returns on **first** sighting — weaker than ao's two-consecutive-capture rule. Usable only if the P1 spec consciously relaxes the rule; otherwise keep the pane.read loop.
- Exit codes/messages: keep script's exactly (`submitted to ao-<slug>` / error + `exit 1`; usage error `exit 2`).

#### ao-watch → sentinel poll + events.wait (pane death)

Current contract: file-existence sentinel only; exit 0 DONE / 3 PANE-DEAD / 4 TIMEOUT; never TUI-activity-based.

- Sentinel check: unchanged, pure local `Path::exists()` in ao-core.
- Death detection: `events.wait { match_event: {event: "pane_exited", pane_id}, timeout_ms: interval }` in a loop alongside the sentinel poll — no permanent connection, matches the script's poll model. Alternatively a held `events.subscribe` socket filtered client-side. `events.wait` timeout error is the natural "keep polling" signal (impl shares the wait machinery, `src/api/wait.rs`).
- **Late-connect race (real):** subscriptions start at current sequence with no replay (§2), so if the pane died *before* `ao-watch` starts, no `pane.exited` will ever arrive. ao-core needs a death-liveness probe: `pane.get { pane_id }` and interpret result/error, or `pane.process_info` (`src/api/schema/panes.rs:141-145`, result with `shell_pid`/`foreground_processes` at `:570-594`). Whether `pane.get` on an exited pane errors or returns normally is **UNVERIFIED** — must be settled in the P1 spike; if it returns normally, engine patch or an ao-side "exited set" tracked from events is needed. (tmux today gives this via `pane_dead` for free — this is the sharpest parity gap after transcripts.)

#### ao-status → workspace.list + pane.list / pane.read

Current contract: no-arg one line per `ao-*` session `alive|DEAD <pane cwd>`; with slug, header + transcript tail; DEAD = `pane_dead`.

- No-arg: `workspace.list` → `Vec<WorkspaceInfo> { workspace_id, label, focused, pane_count, tab_count, agent_status, worktree }` (`src/api/schema/workspaces.rs:61-76`, result `src/api/schema/response.rs:62-64`); filter `label` startswith `ao-`; per workspace `pane.list { workspace_id }` → `Vec<PaneInfo>` with `cwd` and `agent_status` (`src/api/schema/panes.rs:314-318`, `:527-560`). Empty → print `no ao-* sessions`.
- **DEAD flag: GAP** — `PaneInfo`/`WorkspaceInfo` have no dead/exited field (contrast tmux `#{pane_dead}`). Same late-connect problem as ao-watch: ao-core must derive liveness (process_info probe or tracked exits). **UNVERIFIED** post-exit `pane.get` behavior.
- With slug: `pane.read` as in ao-send (source `recent`, `lines` = arg, default 25), same header format `== ao-<slug> (alive|DEAD) — last N lines ==`.

#### ao-kill → pane.get + workspace.close / pane.close + worktree.remove

Current contract: capture cwd *before* kill; `--rm-worktree` only on `-ao-<slug>` suffix; keep branch; missing session is not an error.

- Capture cwd first: `pane.get { pane_id }` → `PaneInfo.cwd` (also `foreground_cwd`), then kill.
- Kill: `workspace.close { workspace_id, close_group }` (`src/api/schema/workspaces.rs:22-27`) for the whole session (tmux `kill-session` analog), or `pane.close { pane_id }` for a single pane. Gotcha: `pane.close` refuses with `confirmation_required` when closing would implicitly close a worktree group (`src/app/api/panes.rs:1862-1870`) — prefer `workspace.close` for ao-kill. Missing session → still print `no session ao-<slug> (already gone)`, exit 0 (ao-core maps `workspace_not_found` error to that).
- Worktree removal: `worktree.remove { workspace_id, force: true }` (`src/api/schema/worktrees.rs:51-58`) — `git worktree remove --force` equivalent; branch is not deleted (matches ao keeping `ao/<slug>`). The `-ao-<slug>` suffix guard is ao-core logic, unchanged from the script.

#### ao-doctor → local probes + ping

Current contract: probe tmux/script/git transport (exit 2 if broken), probe executors via `--help` substring + `--version` (exit 1 if none usable, 0 ok). Executor matrix: kimi (`--yolo` TUI-only), codex (`exec` headless), claude (`-p`), agy.

- No socket API involvement except transport: new-path transport = engine socket reachable + `ping` → `Pong`. ao-doctor should probe socket first (its absence ≠ total failure — could offer to boot the server, but per contract print transport state), then run the unchanged executor probes as subprocesses from ao-core.
- Plan open question (§9) — keep probing tmux after P2 — is a spec decision; while bash fallback exists, tmux probe stays.

### 4. Adjacent surface the P1 spec will touch

- `session.snapshot` → `SessionSnapshot { version, protocol, workspaces, tabs, panes, layouts, agents }` (`src/api/schema/session.rs:8-23`) — the bootstrap/restore surface ao uses to enumerate existing `ao-*` workspaces on startup (replaces tmux-as-registry).
- `agent.*` family: `agent.list`, `agent.get`, `agent.read`, `agent.send_keys`, `agent.start { name, kind, pane_id, args, timeout_ms (3000..300000) }` (`src/api/schema/agents.rs:166-176`), `agent.prompt { target, text, wait }` (`:178-184`), `agent.wait { target, until: [AgentStatus], timeout_ms }` (`:25-32`). `AgentStatus = idle|working|blocked|done|unknown` (`src/api/schema/common.rs:158-166`). Plan §P1 names `agent.wait` as a watch building block — it waits on *agent detection state*, not process death, so it complements rather than replaces the sentinel/pane-exited logic. `agent.start` is for engine-known agent kinds (drives lifecycle hooks), **not** a general spawn — ao-spawn should use the layout.apply argv path (§3).
- `client_shell.surface.set { active }` (`src/api/schema/common.rs:64-68`, result `src/api/schema/response.rs:298-303`) — headless surface-interest lease; relevant to the P2 TUI face, not the six scripts.
- Event `pane.agent_status_changed` payload includes `agent_status`, `agent`, `state_labels` (`src/api/schema/events.rs:540-552`) — feeds the P5 visibility panel later; cheap to subscribe while building ao-watch.

## Implications for the phase spec

- **Spec the ao-core client as a thin wrapper over `ApiClient`-style connect/write/read** (copy `src/api/client.rs:55-75`); one function per method with typed params from `src/api/schema/*`. The full JSON schema is vendored upstream (`docs/next/api/herdr-api.schema.json`, exposed via `herdr api schema --json`) — ao can code-generate or hand-map against it.
- **Adopt pattern (A) for spawn** (`workspace.create` + `layout.apply` with argv `command`), unless the P1 spike shows the placeholder-shell tab causes problems (it briefly spawns a shell per spawn; also check `focus:false` and headless rows/cols sizing for TUI agents — kimi/claude TUIs need sane PTY size: `[server] headless_cols/headless_rows`, `src/main.rs:221-225`).
- **Write the transcript sink decision into the P1 spec explicitly** (recommendation: small additive engine tee in the vendored crate writing `~/.agent-orchestrator/logs/ao-<slug>-*.log` from byte 0, plus structured events — matches plan §9 "raw-compatible, engine also emits structured"). Snapshot-polling via `pane.read` revision will lose data under output bursts; do not silently accept that.
- **Specify the liveness model**: since pane death is event-only with no replay, ao-core needs (a) an `events.subscribe` daemon or (b) per-call probes. Recommend (b) probes for CLI parity simplicity + an optional `events.wait` in ao-watch, and record the post-exit `pane.get`/`pane.read` behavior as a mandatory P1 spike finding (also whether `pane.read` still works after exit for the ao-status/ao-kill tail).
- **Pin key-namespace translation in ao-core**: `C-u → ctrl+u`, `Enter → enter`; reject anything else early. Encode the marker algorithm verbatim from `ao-send` (two consecutive captures, 5 s, last-40-alnum) on top of `pane.read`; do **not** substitute `pane.wait_for_output` unless the human gate explicitly approves the weaker single-sighting semantics.
- **Slug discipline lives in ao-core**: duplicate-label check before `workspace.create`, `$HOME` git-root guard before `worktree.create`, `-ao-<slug>` suffix guard before `worktree.remove`. None are enforced by the engine.
- **Run the engine as named session `ao`** (`HERDR_SESSION` / `--session ao` mechanism, socket at `<config>/sessions/ao/herdr.sock`) for isolation from any user-run herdr; bake the path resolution from `src/session.rs:163-179`.
- **Golden-test mapping** (plan §P1 verify): byte-identical stdout is achievable for spawn/send/status/kill/doctor; ao-watch's `PANE-DEAD` timing may differ from tmux by poll granularity (events.wait 100 ms poll loop, `src/api/server.rs:28`) — define tolerance in the spec, not ad hoc.

## Open questions / risks

1. **Post-exit pane behavior UNVERIFIED** — whether `pane.get`/`pane.read`/`pane.process_info` on an exited pane succeed, error, or return stale data. Everything in ao-watch/ao-status DEAD semantics hinges on this; requires a runtime spike against the vendored engine (read-only source inspection could not settle it — the pane is not removed on `PaneDied`, `src/app/api.rs:265-277`, but the RPC-layer answer is untested).
2. **Transcript byte-0 parity** — no upstream logging feature; the poll-`pane.read`-with-revision fallback can drop output under load, and a PTY tee is an engine patch (allowed by plan §7's additive `src/ao/` policy, but it enlarges the fork diff and needs the P0 gut-list discipline applied to it too).
3. **Event-loss race for short-lived panes** — `events.subscribe` starts at current sequence with no replay (`src/api/server.rs:708`); a pane that exits between `layout.apply` and the subscribe call emits a `pane.exited` that ao never sees (instant-exit detection and ao-watch both affected). Needs either a subscribe-before-spawn pattern held across the spawn call, or confirmation that the probe-based liveness check closes the hole.
4. **Placeholder shell tab** in spawn pattern (A) — one extra default-shell PTY per spawn, briefly. Confirm no side effects (cwd resolution, session save churn) in the spike; pattern (B) `exec` send-text is the fallback but reintroduces quoting.
5. **`layout.apply` limits** — max 24 panes / depth 16 per apply (`src/app/api/layouts.rs:15-16`) and a 1 MB request cap (`src/api/server.rs:32`): fine for ao (single-pane root), but large env maps or prompts near the cap deserve a guard in ao-core.
6. **Protocol coupling** — socket protocol v22 at v0.9.0 (`src/protocol/wire.rs:20`); upstream bumps it on wire breaks (§7 monthly merge policy). ao-core should surface `Pong.protocol` in `ao-doctor` output so a stale fork is visible.
