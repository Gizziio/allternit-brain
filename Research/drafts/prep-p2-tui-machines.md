---
doc: project
updated: 2026-09-09
status: draft
---

# prep-p2-tui-machines — herdr v0.9.0 TUI face, machine management, and reconnect for P2

Pre-gate research memo for P2 (TUI face + machine management) of the ao v3 plan
(`Products/AgentOrchestratorRuntime.md` §5 P2, §2.2). Read-only against the
**vendored fork** at `allternit-workspace/allternit/infrastructure/executor/ao-engine/`
(P0 applied: crate name `herdr` kept, `[[bin]] name = "ao"` in `Cargo.toml:24-27`).
All `file:line` references are against that checkout.

## Headline

P2 is much closer to "wire-up + pilot" than "build". Three of its four pillars
already exist in the vendored code: (1) `machine list|add|rename|remove|enable|disable`
is a complete CLI surface with SSH install/bootstrap; (2) the TUI client shell already
renders a **combined, cross-machine agent panel and sidebar** over saved SSH endpoints;
(3) reconnect-on-drop is implemented end-to-end (TCP keepalives → transport failure →
per-endpoint supervisor with exponential backoff). The real P2 work is: a `machine
connect` subcommand (~50 lines additive), a small fixed list of brand-string edits
(binary name still says `herdr` in help/title/onboarding), the ao path rename
(`app_dir_name()` one-liner), an Allternit default config, and the Mac+Linux pilot
itself. Be honest: **there is no `machine connect`, no TUI-based machine add, no
aggregated machine RPC, and zero `~/.agent-orchestrator/` references anywhere in the
crate.**

---

## 1. Rebrand surface (theme/config layer)

**`[theme]` exists and is real, but it is colors-only.** `ThemeConfig { name,
auto_switch, dark_name, light_name, custom }` (`src/config/theme.rs:59-72`) selects
one of 17 built-in palettes (`THEME_NAMES`, `theme.rs:4-23`) plus per-token hex
overrides (`CustomThemeColors`, `theme.rs:100-120`). There is **no app-name /
window-title token in theme** — the plan's "rebrand via `[theme]` + config" works for
the palette and nothing else. The name strings are a short, enumerable list:

| Surface | Location | Note |
|---|---|---|
| clap app name + about | `src/cli/spec.rs:9-10` | `Command::new("herdr")` — drives all `Usage: herdr …` help text including the `override_usage` strings (`spec.rs:324-430`) |
| Window title fallback | `src/terminal_effects.rs:14-24` | `write_window_title` defaults to literal `"herdr"` (`:16`) when no template configured |
| Window title default template | `src/config/window_title.rs:4-6` | default is `"{hostname}: {workspace}"` — **already brand-free**; tokens `{hostname} {workspace} {tab} {pane} {terminal_title}` (`window_title.rs:20-45`) |
| Config/state dir names | `src/config/io.rs:22-28` | `app_dir_name()` → `"herdr"` (release) / `"herdr-dev"` (debug) — the single lever for `~/.config/herdr` and `~/.local/state/herdr` |
| Embedded default config header | `src/main.rs:63` | `DEFAULT_CONFIG` const ("# herdr configuration", path comment); printed by `--default-config` (`main.rs:664`) — **this is where the Allternit default config ships** |
| Onboarding title | `src/ui/onboarding.rs:3` | `ONBOARDING_TITLE = "  herdr"` |
| Right-click menu label | `src/client/shell/context_menu.rs:68` | `"Use Herdr right-click menu"` |
| Settings overlay label | `src/client/shell/settings_overlay.rs:191` | `"inside herdr"` |
| Toast delivery enum value | `src/config/model.rs:1248`, `src/config/write.rs:38` | config-visible: `delivery = "herdr"` under `[ui.toast]` — renaming breaks existing config files |
| Server-busy error string | `src/server/socket_paths.rs:66` | `"herdr server is already running …"` |
| Remote auth hint | `src/remote.rs:22-32` | `print_remote_error_hint` prints `herdr --remote` advice |
| Local attach/stop command strings | `src/session.rs:104-118` | `local_attach_command()` returns `"herdr"` / `"herdr session attach <n>"`; `stop_command_for` → `"herdr server stop"` |
| Remote bootstrap command | `src/remote/saved.rs:41-47` | `saved_ssh_bootstrap_command` → `"herdr --remote <target> --session <n>"` — **functional**: printed for the human to run interactively when setup needs approval |
| Log file names | `src/logging.rs:29-35` | `herdr-client.log`, `herdr-server.log` in session data dir |
| Env vars | ~15 `HERDR_*` consts | e.g. `HERDR_SESSION`, `HERDR_SOCKET_PATH`, `HERDR_CONFIG_PATH` (`src/config/io.rs:169-174`), `HERDR_REATTACH_COMMAND` / `HERDR_REMOTE_KEYBINDINGS` (`src/remote/args.rs:1-2`), `HERDR_REMOTE_BINARY` (`src/remote/attach.rs:27`) — all override/escape hatches, none user-facing in normal operation |

**What is already clean:** `src/ui/` and `src/client/` contain **zero** `herdr`
string literals outside the five items above and test fixtures (verified by grep) —
the rendered TUI face, sidebars, popups, and status lines carry no brand. Release
notes (`src/ui/release_notes.rs`) carry several but are on the P0 gut list.

**Minimal rebrand surgery = the table above, ~12 sites**, not a crate-wide string
sweep. The `[theme]` layer handles palette via config with zero code changes.

## 2. Machine management — what exists and the `ao machine` mapping

### What exists today (complete)

- **CLI surface** (all six subcommands): clap spec at `src/cli/spec/machine.rs:5-38`
  (`list [--json]`, `add <ssh-target> --label <label> [--remote-session <name>]`,
  `rename/remove/enable/disable <profile-id>`), hand-rolled runtime dispatch at
  `src/cli/machine.rs` (wired in `src/cli.rs:116`; `HELP` at `machine.rs:6-16`).
  Hand-parsed args via `expand_equals_args`, exit codes 0/1/2. **No `connect`.**
- **Catalog storage**: `EndpointCatalog { version, selected_profile, ssh: Vec<SavedSshEndpoint> }`
  (`src/client/endpoint/catalog.rs:20-26`, `:74-82`). Each profile = `{ id: 32-hex
  opaque ProfileId, label, target, session, enabled }` — **no credentials by design**
  (SSH keys stay with OpenSSH; password-in-target rejected, `catalog.rs:62-68`;
  JSON round-trip asserted secret-free, `catalog.rs:395-413`). Caps: 64 profiles,
  64 KB, `deny_unknown_fields`. Persisted as private JSON via temp-file+rename
  (`catalog.rs:334-367`) at:
  - `~/.local/state/herdr/client/endpoints.json` (`catalog.rs:369-373`)
  - `~/.local/state/herdr/client/endpoint-selection.json` (per-client selection, `:375-379`)
- **Remote prepare/bootstrap** (`ao machine add` calls this before saving):
  `prepare_saved_ssh` (`src/remote/attach.rs:77-131`) → `prepare_remote_herdr`
  (platform detect, find/install remote binary, `:520+`) → `ensure_remote_server_ready`
  (starts the remote server with endpoint protocol + surface-interest + health-check
  requirements enforced by `src/remote/restart_policy.rs:16-37`). Setup that needs
  human approval (install/update prompts) fails non-interactively with the
  `saved_ssh_bootstrap_command` hint (`saved.rs:41-47`).
- **Per-connection plumbing**: `SshStdioBridge` (`src/remote/attach.rs:1525-1612`)
  binds a local UDS, and per accepted client spawns `ssh -T <target> <remote bridge
  command>` with stdio pumped both ways (`bridge_connection`, `:1690-1845`). Managed
  ssh config adds `ServerAliveInterval 15` / `ServerAliveCountMax 4` (`:1670-1672`,
  CLI args `:476-478`) plus connection multiplexing via a control socket
  (`ManagedSshOptions`). Noninteractive mode (used by saved machines) nulls stderr
  and classifies failures: auth/host-key/protocol → "attention" (stop retrying),
  network → transient (`src/remote/saved.rs:49-74`).
- **TUI consumption**: open clients hot-reload the catalog (machine add prints
  "Open Herdr clients connect automatically", `machine.rs:157-158`) — no restart
  needed.

### `ao machine connect <profile-id>` mapping (the only missing subcommand)

Thin, additive, no engine changes:

1. Add `connect` to the clap spec (`src/cli/spec/machine.rs`, `profile_command`-style
   + optional `--keybindings local|server`).
2. New arm in `run_machine_command` (`src/cli/machine.rs:32-50`): `load_catalog()`
   (`machine.rs:286`) → find profile by `ProfileId::parse` → build
   `RemoteLaunch { target, keybindings: RemoteKeybindings::Local, live_handoff: false }`
   (`src/remote/args.rs:27-32`) → call `crate::remote::run_remote(remote)`
   (`src/remote/attach.rs:29-75`). That is exactly what top-level `ao --remote <target>`
   does today (`src/cli/spec.rs:14-15` → `extract_remote_args`, `remote/args.rs:34-116`);
   `connect` just resolves the profile first so the human types an id/label instead
   of an SSH target. Optionally `select_ssh` the profile first so the TUI later opens
   on it (`catalog.rs` `select_ssh`, exercised in tests at `catalog.rs:402`).

**What does NOT exist:** any TUI affordance to *add* a machine (the sidebar machines
section is click-to-activate only; grep over `src/client/shell/global_menu.rs` finds
nothing) — add stays CLI-first in P2, matching the ao contract style.

## 3. Combined agent list — gap analysis

**The combined list already exists** in the 0.9.0 semantic client shell; this is the
plan's "runs fully local since 0.9.0" client working as designed:

- Each connected endpoint (Local + every enabled saved SSH profile) is a
  `ClientShellEndpoint { endpoint_id, label, status, snapshot, … }`
  (`src/client/shell/endpoints.rs:8-21`), populated from that machine's server-side
  `ClientShellSnapshot` (`src/server/client_shell.rs:6-241`, `agents` at `:128-141`,
  workspaces at `:35-83`).
- The sidebar renders a **" machines" section** with one row per endpoint (Local +
  each saved machine) and that machine's workspaces nested beneath it
  (`src/client/shell/endpoint_sidebar.rs:168-190`, header literal at `:175`).
- The agent panel merges across **all** endpoints: `agent_rows` zips per-endpoint
  sidebar rows with machine labels and stale-dimming (`src/client/shell/endpoint_agents.rs:97-127`),
  ordered by `aggregate_agent_rows` (`src/client/shell/aggregate_navigation.rs:80-107`)
  with sort options including cross-machine Priority (`:100-107`). Clicking an agent
  or workspace on a non-active machine emits `ActivateEndpoint` with the target
  (`src/client/shell/endpoint_navigation.rs:38-54`).
- Snapshots flow over the client-shell protocol per endpoint connection (not over
  `workspace.*`/`agent.*` socket RPC, which remain per-server). Negotiation requires
  `surface_interest` + `client_shell.surface.set` on every endpoint and `health_check`
  on remotes (`src/client/endpoint/supervisor.rs:291-298`).

**Gaps for P2 (all verification, not construction):**

1. **No aggregated machine RPC.** `workspace.list` / `agent.list` answer for one
   server only. The combined view is TUI-internal. Headless consumers (`ao status`-style
   CLI over multiple machines) would need an ao-core aggregator that fans out per saved
   endpoint — **out of P2 scope** unless the spec's pilot demands it. Do not build it
   speculatively.
2. **No ao-* filter.** The panel shows every detected agent on every machine. Fine
   for the pilot; a filter toggle is a P5 visibility-panel concern.
3. **Freshness semantics.** Remote rows dim as `stale` when the endpoint status is
   not `Online` (`aggregate_navigation.rs:52-54`) — snapshots are last-known-good,
   not live, while a machine is reconnecting. The spec should state this as intended
   behavior (better than disappearing).
4. **Version coupling.** A remote must negotiate the same endpoint protocol
   generation (`restart_policy.rs:23-25`) or `machine add` forces a remote update —
   the pilot must run the same ao build on both hosts.

## 4. Config/path inventory and `~/.agent-orchestrator/` compat

**Where state lives (all derived from `app_dir_name()` = `herdr`,
`src/config/io.rs:22-28`):**

| Path | Contents | Source |
|---|---|---|
| `~/.config/herdr/config.toml` | user config; override via `HERDR_CONFIG_PATH` | `io.rs:30-35`, `:61-68`, `:169-174` |
| `~/.config/herdr/sessions/<name>/` | per-session dir: `herdr.sock` (API), `herdr-client.sock`, `session.json` (persistence), `session-history.json` (opt-in), `herdr.log` | `src/session.rs:162-179`, `src/persist.rs:3-4`, `src/logging.rs:16-26` |
| `~/.local/state/herdr/client/` | `endpoints.json`, `endpoint-selection.json` | `io.rs:37-42`, `:87-94`, `catalog.rs:369-379` |
| `~/.herdr/worktrees` | default worktree root | `src/config/model.rs:1153` |
| managed ssh config dir | temp ssh config w/ keepalives + control socket | `src/remote/attach.rs:1649-1680` |

Known top-level config keys: `advanced, experimental, keys, onboarding, remote,
server, session, terminal, theme, ui, update, worktrees` (`io.rs:7-20`) — unknown
keys produce diagnostics, so ao-specific keys need a new top-level section or the
`[experimental]` bucket.

**`~/.agent-orchestrator/` compat: nothing exists.** Grep for `agent-orchestrator`
across the crate returns zero hits. The only overlap surface is transcripts/logs:
the bash ao keeps `~/.agent-orchestrator/logs/` (plan §6: "naming preserved or
symlinked"). The engine has no byte-0 transcript feature (that's P1's sink decision);
P2 inherits whatever path P1's sink writes to. Engine-native state (sockets, session
snapshots, endpoint catalog, worktrees) has **no** legacy to migrate — a fresh ao
install starts empty, so there is nothing to migrate from `~/.agent-orchestrator/`
except P1's transcript sink, which should write there directly.

**Env-var surface** (all `HERDR_*`, listed in §1): override-only, none required for
normal operation. Keeping them named `HERDR_*` in P2 keeps the fork diff thin; they
can gain `AO_*` aliases later without breaking anything.

## 5. Reconnect-on-drop behavior

**Already implemented end-to-end; P2 should verify, not rebuild:**

1. **Detection (≤ ~60 s):** managed ssh config sets `ServerAliveInterval 15` +
   `ServerAliveCountMax 4` (`src/remote/attach.rs:1670-1672`), so a dead SSH/TCP path
   surfaces as `ssh` child exit. Live connections additionally get application-level
   health pings over the negotiated `health_check` capability
   (`src/client/endpoint/registry.rs:204-240`, `src/client/endpoint/health.rs`).
2. **Reaction:** transport failure → `EndpointRegistry::record_failure`
   (`registry.rs:320-346`) → `EndpointSupervisors::disconnected`
   (`src/client/shell_runtime.rs:446`) → status `Reconnecting` + scheduled retry.
3. **Retry policy:** per-endpoint exponential backoff, 500 ms initial doubling to a
   30 s cap (`src/client/endpoint/supervisor.rs:11-12`, `:333-341`), generation-fenced
   so stale connects are dropped (`:187-229`, tests at `:471-491`). Reconnect
   re-runs `connect_saved_ssh` (`supervisor.rs:259-266` → `src/remote/saved.rs:15-39`),
   which rebuilds the ssh bridge and re-handshakes.
4. **Classification:** `saved_ssh_failure_needs_attention` (`saved.rs:49-74`) —
   auth, host-key changes, protocol/incompat → `Attention` (retries stop, UI shows a
   "run this command" hint); timeouts/refusals → `Reconnecting` (retries forever).
   Catalog edits (`machine add/rename/remove`) reconcile live via `reconcile_profiles`
   without dropping unaffected connections (`supervisor.rs:102-131`).
5. **What the bridge itself does NOT do:** `bridge_connection` (`attach.rs:1690-1845`)
   has no mid-connection retry — a dropped ssh child kills that one bridged stream,
   and reconnection is the supervisor's job. That layering is sound; don't add retry
   inside the bridge.

**Smallest additive change for P2:** none required for correctness. Optional UX
only: the machine row already shows non-Online status (stale dimming, §3); a
"reconnecting to <label> (attempt n)" indicator would make the pilot demo legible.
Worth one spike finding: verify a mid-session drop (kill sshd-side) recovers within
keepalive + first backoff (~61 s worst case) with the pane state intact after
re-handshake (snapshot re-sync via surface interest).

## 6. Binding design decisions for the P2 spec

1. **Rebrand surgery list is fixed and small (§1 table):** clap name/about
   (`cli/spec.rs:9-10`), `write_window_title` fallback (`terminal_effects.rs:16`),
   `app_dir_name()` (`config/io.rs:22-28`), `DEFAULT_CONFIG` header (`main.rs:63`),
   onboarding title (`ui/onboarding.rs:3`), the two shell menu labels
   (`context_menu.rs:68`, `settings_overlay.rs:191`), the busy-server error
   (`socket_paths.rs:66`), remote hint + bootstrap command (`remote.rs:22-32`,
   `saved.rs:41-47`), local attach/stop strings (`session.rs:104-118`), log names
   (`logging.rs:29-35`). Everything else stays `herdr` (env vars, toast enum,
   `HERDR_*` consts) to keep the upstream diff minimal per plan §7. Internal crate
   name stays `herdr` (already decided in P0).
2. **Paths become ao's, via the single `app_dir_name()` lever:** `~/.config/ao`,
   `~/.local/state/ao`, `~/.ao/worktrees` (worktree default in `config/model.rs:1153`
   tracks it). Debug builds get `ao-dev` parity with the `herdr-dev` convention. No
   dual-name compat: fresh product, empty state, nothing to migrate.
3. **Allternit default config ships in the embedded `DEFAULT_CONFIG`** (`main.rs:63`,
   printed by `ao --default-config`): `[theme]` name + `[theme.custom]` tokens from
   the brand palette (exact hex values decided at spec time from the brand sheet —
   the token list is `theme.rs:100-120`), `ui.window_title = "{hostname}:
   {workspace}"` (keep the brand-free default; outer-terminal title says the host,
   not the product), and any ao-specific keybind adjustments. `[theme]` is
   colors-only — it cannot carry the app name; the spec must not pretend otherwise.
4. **`ao machine` = the six existing subcommands verbatim + one new `connect <profile-id>`**
   resolving through the catalog to `remote::run_remote` with `RemoteKeybindings::Local`
   (`remote/attach.rs:29-75`, `remote/args.rs:27-32`). Target: ≤ ~80 lines across
   `src/cli/machine.rs` + `src/cli/spec/machine.rs`. No clap rebuild of the existing
   hand-rolled parser in P2 (rewrite is churn against upstream). No engine changes.
5. **Combined agent list: no new code.** The client shell already merges agents and
   workspaces across Local + all enabled machines (`endpoint_agents.rs:97-127`,
   `aggregate_navigation.rs:80-107`, `endpoint_sidebar.rs:168-190`). P2 acceptance =
   pilot evidence on Mac + Linux (add, combined panel, sort, click-through activation
   `endpoint_navigation.rs:38-54`). Explicitly out: an aggregated multi-machine RPC —
   the per-server `workspace.*`/`agent.*` surface stays per-server; if a headless
   combined list is ever needed it is new ao-core code, not an engine patch.
6. **Reconnect-on-drop ships as-is** (supervisor backoff `supervisor.rs:11-12`,
   keepalives `attach.rs:1670-1672`); the only P2 addition is a spec'd acceptance
   scenario: kill the ssh session server-side mid-pilot, expect recovery ≤ ~61 s with
   stale-dim during the gap and full snapshot re-sync after. No retry-policy config
   key in P2.
7. **Remote-side binary name must match on both ends.** `machine add` scp-installs
   the *local* binary to the remote (`install_suffix = ".local/bin/herdr"`,
   `attach.rs:188`; override via `HERDR_REMOTE_BINARY`, `attach.rs:27`). Decision:
   rename the install suffix to `.local/bin/ao` in the fork and let `machine add`'s
   own install path carry it — self-consistent because the installer uploads the
   running binary. The human-typed fallback stays `ao --remote <target> --session
   <name>` (`saved.rs:41-47`).
8. **`~/.agent-orchestrator/` compat is P1's transcript sink writing directly to
   `~/.agent-orchestrator/logs/`** (naming preserved per plan §6, no symlink needed
   if the sink writes there natively). P2 adds nothing here; state dirs (decision 2)
   and transcript logs live in different trees by design. The deprecated bash
   scripts keep working untouched until P3 removal.
9. **Env vars keep the `HERDR_` prefix in P2** (they are undocumented overrides),
   except `HERDR_REATTACH_COMMAND` / `HERDR_REMOTE_KEYBINDINGS` values printed to
   humans, which show `ao` after decision 1's string edits — verify no code reads
   the *printed* string back (it doesn't; the env var names are the contract, the
   values are cosmetic). Revisit `AO_*` aliases at P3 if the Fabric work introduces
   user-facing configuration.
10. **Fork-diff guardrail:** every edit in decisions 1–7 must land inside the
    rebrand layer or `src/ao/` additive modules (plan §7); nothing touches engine
    logic, the client-shell protocol, or the endpoint supervisor. The P2 PR diff
    should be reviewable as "gut list + name/window-title strings + ~80-line
    machine connect + default config + docs" — anything larger is scope creep to
    reject at the gate.

## Open questions / risks

1. **Pilot reality check on reconnect timing:** worst case = 60 s keepalive + 500 ms
   first backoff ≈ 61 s before re-handshake; if that feels dead in the demo, the
   tunable is `ServerAliveInterval/CountMax` (`attach.rs:1670-1672`) or adding a
   health-ping-driven faster detection — spike first, don't spec a number unverified.
2. **Theme hex values:** the Allternit palette tokens for `[theme.custom]` need the
   brand sheet (dark bg family + accent); spec must pin exact hex before the gate or
   the default config ships unbranded.
3. **Toast delivery enum `delivery = "herdr"`** (`config/model.rs:1248`) stays in P2
   per decision 1 — confirm no Allternit doc plans to teach users that key; if yes,
   rename the serde value with a legacy-alias in the same PR.
4. **`update.rs` still present in the tree** (plan says P0 guts it); P2 builds on
   whatever P0 left. If `release_notes`/update UX strings leak into the TUI face
   (e.g. `ui/release_notes.rs`), the rebrand list in §1 grows — re-grep at P2
   implementation time against the then-current tree.
5. **Selection persistence:** `endpoint-selection.json` is per-client-machine
   (`catalog.rs:375-379`), so "last active machine" won't follow the human across
   devices — acceptable for P2; note it for the P3 Fabric narrative.
