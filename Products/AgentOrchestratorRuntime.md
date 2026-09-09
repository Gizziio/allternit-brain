---
doc: product
updated: 2026-09-09
status: draft
---

# Agent Orchestrator Runtime (ao v3) — build plan

**Name decision (2026-09-08, human):** the product is **agent orchestrator — ao**. No new brand. The herdr fork is an internal engine crate, not a product. The user-facing binary replaces the current `ao-*` bash scripts and is named `ao`.

Queue/spec: `rq-20260908-028` / `Research/specs/allternit-runtime-fork.md`. Fork base: herdr v0.9.0, Apache-2.0 (relicensed from AGPL in 0.8.0 — never copy pre-0.8.0 code).

---

## 1. Why this shape

Today ao is six bash scripts over tmux. herdr 0.9.0 is a single-crate Rust binary that already is — engine-wise — what ao wants to become: a background server owning PTYs, a JSON socket API, agent state detection, session persistence, and multi-machine SSH management. Plan: vendor herdr as the **engine crate** inside the existing allternit-workspace Rust workspace, keep its internal crate name (`herdr`) so upstream merges stay cheap, ship one `ao` binary whose subcommands preserve the exact ao contract and add the new surfaces.

## 2. What exists today (evidence base)

### 2.1 ao contract (from `~/.claude/skills/agent-orchestrator/scripts/` + ORCHESTRATOR.md)

| Command | Contract that must survive the port |
|---|---|
| `ao-spawn [--worktree] <slug> <repo-dir> <cmd...>` | Session `ao-<slug>`, refuses duplicates; worktree `<repo>-ao-<slug>` on branch `ao/<slug>`, refuses `$HOME` git root; transcript from byte 0; instant-exit detection with tail dump; stdout prints `<session> <workdir> <logfile>` |
| `ao-send <slug> <prompt>` / `-f` | alnum marker (last 40 chars of prompt), bracketed paste, **two consecutive captures** must show marker within 5 s, Enter only after verified landing, `C-u` (never `C-c`) on failure, exit 1 |
| `ao-watch <slug> <sentinel> [timeout=3600] [interval=20]` | Completion = **file existence only** (never TUI activity — kimi shows no spinner); exits 0 done / 3 pane-dead / 4 timeout |
| `ao-status [slug] [lines]` | No-arg: one line per `ao-*` session `alive|DEAD <pane cwd>`; with slug: transcript tail; DEAD = `pane_dead` |
| `ao-kill <slug> [--rm-worktree]` | Captures cwd before kill; `--rm-worktree` only on `-ao-<slug>` path suffix; keeps branch `ao/<slug>`; missing session is not an error |
| `ao-doctor` | Probes transport + each executor (`--help` substring check, `--version`); exits 2 transport broken / 1 no executor / 0 ok. Executor table: kimi (TUI `--yolo` only), codex (`exec` headless), claude (`-p` headless), agy |

State: only `~/.agent-orchestrator/logs/` (transcripts + `.cmd.sh` runners). No registry — tmux is the state. Transcripts via `script -q` survive session death.

### 2.2 herdr v0.9.0 architecture (single crate, ~395 src files)

| Area | Path | Disposition in fork |
|---|---|---|
| Server core (PTYs, clients, headless mode) | `src/server/` | **Keep — engine** |
| Socket API (ND-JSON RPC over UDS; `pane.*`, `agent.*`, `workspace.*`, `events.subscribe`) | `src/api/` | **Keep — primary control surface** |
| Agent detection (TOML screen manifests; lifecycle-hook integrations) | `src/detect/` | Keep; **disable remote manifest fetch** |
| Machines/SSH (`machine add`, SshStdioBridge, endpoints.json) | `src/remote.rs`, `src/remote/` | **Keep — Phase 2 surface** |
| Persistence (session.json snapshot, agent session restore) | `src/persist/` | Keep |
| Workspaces/worktrees | `src/workspace/`, `src/worktree.rs` | Keep; map ao worktree semantics onto it |
| Client/TUI (86 files, runs fully local since 0.9.0) | `src/client/`, `src/ui/`, `src/app/` | Keep as the ao TUI face; rebrand via `[theme]` + config only |
| Terminal emulation / Kitty graphics | `src/terminal/`, `src/kitty_graphics.rs` | Keep |
| **Gut list** | `src/update.rs` (self-updater ~3.8k lines), `src/product_announcements.rs`, `src/detect/manifest_update.rs` fetch, release-notes/sound assets as desired, `distribution/` installers | Remove/replace with ao update via harness |
| Phone-home | 3 HTTPS couplings to herdr.dev (version check, agent-manifest catalog, announcements) | All gutted in Phase 0; detection manifests vendored locally |

Embed seam is real: headless server mode + `herdr api snapshot` bootstrap exist — driving the engine without herdr's TUI is a supported pattern. Key deps: tokio, ratatui 0.30, crossterm, vendored `portable-pty` patch, interprocess, clap 4.5, schemars, bincode. Toolchain 1.96.1.

### 2.3 Fabric Transport (existing, deployed — reused not rebuilt)

- PWA: `https://fabrictransport.allternit.com/` (canonical; also `ai.allternit.com/fabric-session/`)
- Pairing/list: `GET https://api.allternit.com/api/v1/runtime-devices` (Clerk-authed same-origin at `ai.allternit.com/__clerk`)
- Drive a node: `POST /api/v1/runtime-devices/:id/proxy`
- Push fallback: `https://push.fabrictransport.allternit.com` (Worker `allternit-remote-control-push`)
- Desktop app today shows a QR for the PWA URL with `?runtime=` when paired

### 2.4 Harness sync (`Allternit Brain/Ops/harness-sync.js` + `harness.json`)

SoT: skills `~/Desktop/Allternit/.claude/skills/`, rules `~/Desktop/Allternit/CLAUDE.md`, MCP server `Allternit Brain/Ops/index.js`. Targets per tool (dir + rules file + MCP wiring): claude (`~/.claude`, settings.json), codex (`~/.codex`, config.toml block), kimi (`~/.kimi-code`, mcp.json), grok (`~/.grok`, CLI add/remove), cursor (`~/.cursor`, mdc rules + mcp.json), gizzi (`~/.gizzi`, `~/.config/gizzi-code/gizzi.json` commandArray). Verbs: `status` / `sync` (+`--dry-run`) / `uninstall`.

### 2.5 Native sessions (SHIPPED — gizzi-code v2.0.7, 2026-09-06)

The session-pickup substrate already exists and is the model for ao's session layer: any CLI tool's session (Kimi, Claude, Codex, …) can be **discovered, listed, fetched, exported** into Allternit.

- Discovery/list/fetch/export core: `cmd/gizzi-code/src/runtime/session/native-source.ts`
- API routes: `cmd/gizzi-code/src/runtime/server/routes/native-session.ts` (+ `agent-compat.ts`); ingress service `src/runtime/services/api/sessionIngress.ts`
- TUI: `src/cli/ui/ink-app/commands/native/native.ts`
- Consumed by the Allternit Desktop app and the platform web export (`surfaces/ai.allternit.com`)
- Docs gaps + production verification **LANDED 2026-09-08 — PR #170 merged** (`docs/public/tools/native-sessions.md` user doc + `docs/NATIVE_SESSIONS.md` operator doc, ledger attestation `2026-09-08-2022-nsdocs`). gizzi-code 2.0.7 CLI verified PASS against 3,340 real sessions (pickup/fetch/export, origin sha256 unchanged, auth 401→200). **Desktop 1.1.0 shipped broken** (bundled api returns SPA HTML for `/api/v1/native-sessions/*`). **FIXED 2026-09-09 — v1.1.1**: release run 7 macOS artifact verified — bundled `allternit-api` contains the full native-sessions route table (`/native-sessions/harnesses`, `pickup`, `:harness/:id`, `/v1/native-session/list`…) which 1.1.0 lacked. Run 8 (tag at main `5f5cfbd5`) adds the Windows office-addins packaging fix (PR #193) and the release preflight gate (PR #189). Release-night incident classes all guarded by `scripts/release-preflight.mjs` in CI. Also: core is `@allternit/native-sessions` package with 27 harness adapters; `/native` is interactive-TUI-only on 2.0.7.

Significance for this plan: native sessions prove the pick-up pattern end-to-end in production. In ao v3 the same pattern becomes the session substrate that feeds Fabric pickup (P3) and the visibility panel (P5) — the ao engine (herdr persistence + agent session restore, §2.2) supplies the live-pane half, native-source.ts the on-disk CLI session half.

### 2.6 HarnessRouter CE (fork base for P6/P7 — rq-20260909-004, decision fork_reskin 2026-09-09 human redirect)

[HarnessRouter CE](https://github.com/HarnessRouter/harnessrouter), Apache-2.0: one box running **ten agent harnesses** (Claude Code, Codex, Gemini CLI, Qwen, opencode, Cline, Pi, DSH, Hermes, OMP) behind a single OpenAI **Responses-compatible API** — the Unified Harness Protocol (UHP, open standard at unifiedharnessprotocol.org: OpenAPI 3.1 schemas, versioned spec, runnable conformance suite). Three components, none of them Docker-coupled at the code level:

| Component | Stack | Role |
|---|---|---|
| Gateway (`gateway/`, 59 files) | Python (`app.py` + pytest suite) | UHP surface: Responses API, harness CRUD, sessions, streaming, cancellation, idempotency, SQLite backing |
| Runner (`runner/`, 40 files) | Python (`server.py` + per-backend drivers) | One agent CLI process per session, isolated workspace dir, turn handles, checkpoint/rehydrate |
| Console (`ui/`, 202 files) | Next.js | Web UI — **reference only for ao; not ported** (ao TUI + existing surfaces are the face) |

**What Docker actually is in the product:** the appliance layer only — (a) bundling the three components + first-run CLI installers into one image, and (b) the isolation boundary (container starts as root solely to create a per-session Linux user that owns that session's workspace; `HR_SANDBOX_TRUST=owner` exists because on your own box the key is handed over directly). All state is SQLite + files on a volume; gateway and runner are plain loopback HTTP servers. **A Docker-free fork loses only the per-session-user hardening** — isolation degrades to workspace-dir separation, which is exactly ao's existing owner-trust model.

**What we take:** UHP as the agent-native API surface (closes the "no agent-native API surface" gap in `Research/baselines/agent-orchestration.md`), the per-backend driver set (10 harnesses' turn-protocol adapters, incl. reasoning-strip / schema-normalize / token-usage handling per backend), the first-run harness auto-installer, and the conformance suite as the parity gate.
**What we gut:** the container entrypoint + per-session-user machinery, the Next.js console, hosted-service couplings (push-to-cloud, marketplace), and the provider connection-policy/key store — **model and provider routing stay in the Allternit gateway + A:// tier policy** (`model_route`), never a second key store.
**License caveat carried into P7:** agent CLIs install under their own terms (Claude Code under Anthropic's terms, hermes-agent license undeclared) — per-tool explicit opt-in, same honesty HarnessRouter itself ships with.

## 3. Target architecture

```
                        ┌─────────────────────────── ao (binary) ───────────────────────────┐
 spawn/send/watch/      │  clap subcommands — preserve ao contract (§2.1), exit codes,      │
 status/kill/doctor     │  stdout formats. New families: machine, fabric, harness, peer.    │
───────────────         │                                                                   │
                        │  ao-core (new, thin): marker-paste protocol, sentinel watcher,    │
                        │  transcript policy, worktree guards, doctor probes                │
                        │  native-session substrate (ported from gizzi native-source.ts:    │
                        │  discover / list / fetch / export any CLI session)                │
───────────────         │         │                                                         │
 machine / ssh / ws     │         ▼                                                         │
 fabric pair/serve       │  herdr engine crate (vendored fork, internal name kept):          │
 harness sync/status     │  server + api + persist + pty + detect + workspace + remote       │
 peer visibility         │         │                                                         │
                        │         ├── TUI face (herdr client, rebranded by [theme]/config)  │
                        │         ├── Rails peer registry (allternit-agent-system-rails)    │
                        │         └── Fabric node client → api.allternit.com proxy + push   │
                        │                                                                   │
                        │  UHP execution layer (P6, §2.6 fork — Python, ao-supervised):     │
                        │  gateway + runner as loopback child processes; per-session        │
                        │  workspaces; harness registry = the "choose a brain" surface      │
                        └───────────────────────────────────────────────────────────────────┘
```

- One binary, one background server (herdr model — already server-attached since 0.9.0 removed `--no-session`).
- `ao` talks to the engine over the vendored socket API in-process or via UDS — no shelling out to tmux on the new path.
- tmux scripts stay on disk as fallback until Phase 1 acceptance proves parity; then deprecated.

## 4. CLI surface

Legacy-compatible (phase-in): `ao spawn|send|watch|status|kill|doctor` with identical arguments/exit codes/stdout — the orchestrator skill and ORCHESTRATOR.md keep working unmodified. Optionally keep `ao-spawn`… symlinks → `ao spawn` for one release.

New: `ao machine add|list|remove|connect` · `ao fabric pair|serve|status` · `ao harness sync|status|uninstall` · `ao harness install <tool>` (P7) · `ao serve` (P6 — start/stop/status the UHP gateway+runner sidecar) · `ao peer list|send` · `ao ui` (TUI face).

## 5. Phases

### P0 — Fork hygiene (spec `allternit-runtime-fork`, gate-ready)
Vendor herdr v0.9.0 into `infrastructure/executor/ao-engine/` as workspace member (internal crate name `herdr` kept); record upstream remote + SHA; gut `update.rs`/`product_announcements.rs`/manifest remote fetch (vendored TOML manifests instead); `THIRD_PARTY_NOTICES.md` + in-crate LICENSE; build + herdr test suite green; binary builds as `ao --version`.
**Verify:** diff vs upstream tag = gut list + notices only; `cargo test` parity.

### P1 — Engine + contract parity (new spec at gate)
Headless engine in-process; implement `ao spawn/send/watch/status/kill/doctor` on socket API preserving §2.1 exactly (marker protocol incl. two-consecutive-capture rule; sentinel file-existence semantics; exit codes; stdout formats; worktree guards; transcript policy — herdr `pane.read` + `agent.wait` replace capture-pane; `script -q` byte-0 transcripts become engine-side logging). tmux fallback intact. `ORCHESTRATOR.md` updated; scripts marked deprecated.
**Verify:** golden test — run the six current bash scripts and the new `ao` binary side by side on the same spawn/send/watch/kill scenario; outputs byte-identical where specified.

### P2 — TUI face + machine management (new spec)
Rebrand herdr client to ao via theme/config layer (no string surgery beyond name/window title); surface `ao machine` (SSH add/list/connect, combined agent list); Allternit default config (paths, `~/.agent-orchestrator/` compat or migration).
**Verify:** multi-machine pilot — this Mac + one Linux host, agent list combined, reconnect on drop.

### P3 — Fabric node (new spec)
Implement runtime-device pairing in the binary (register, Clerk session reuse or device token, QR = PWA URL + `?runtime=`); `serve` as proxyable node; connected-machines view in PWA shows live ao sessions; push-worker fallback for wakeups. Server side unchanged.
**Prep memo:** `Research/drafts/prep-p3-fabric-protocol.md` (pairing = Ed25519 + OAuth-device flow; relay = WSS tunnel to 127.0.0.1:8013; ao needs zero server changes but `runtimeType "ao"` must be added to the API enum; biggest fork: relay speaks HTTP/WS, engine speaks ND-JSON over UDS — pick in-process translation vs loopback shim). **Verify:** pick up a running session from the PWA on a second device while the TUI is detached.

### P4 — Harness sync port (new spec)
`ao harness sync|status|uninstall` in Rust, same `harness.json` schema and SoT paths; `harness-sync.js` retired only after a `--dry-run` diff shows parity across all six tools.
**Verify:** byte-diff of synced files vs JS implementation output on the same machine.

### P5 — Visibility + peers (own spec)
"Who needs you" panel: engine agent states (working/blocked/idle) + Rails peers + blocked-agent notifications, fed from both halves of the session substrate — live panes (engine) and picked-up CLI sessions (native-session port, §2.5); Lantern UX patterns as reference (revisits `rq-20260908-005` watch — verdict revisited with our own runtime, still no upstream plugin adoption).
**Verify:** two concurrent ao sessions, one blocked on approval — panel surfaces it; a kimi/claude session picked up via native sessions appears alongside ao sessions.

### P6 — UHP execution layer (own spec; HarnessRouter CE fork per §2.6)
Docker-free fork of HarnessRouter CE absorbed into the ao runtime. The ao binary **supervises** the forked gateway+runner as loopback child processes (they are Python — they do not go inside the Rust binary; `ao` owns their lifecycle, config, and health via `ao serve` + `ao doctor`). Strip: container entrypoint + per-session-user machinery, Next.js console, hosted couplings, provider key store (routing delegates to the Allternit gateway + A:// policy). Keep: UHP Responses surface, harness CRUD, sessions/turns/streaming/cancel/idempotency, per-backend drivers, SQLite+files backing. **"Choose a brain" semantics land here:** a harness object (base + model + instructions + limits) is a runnable brain in a registry; picking one = choosing `harness_id` (+ model per `model_route`) at call time; UHP session ids give resumable headless sessions. Cross-harness *interactive* session pickup stays with native sessions (§2.5) + Fabric (P3) — UHP does not translate one CLI's session state into another's, and this plan does not pretend otherwise.
**Verify:** UHP conformance suite passes at class Full against the fork (same bar upstream CE publishes); an ao-spawned task run through the UHP layer streams, cancels, and resumes identically across at least kimi + claude + codex backends.

### P7 — Harness auto-install + onboarding (own spec)
Port the first-run installer (entrypoint install scripts, version-pinned per backend) to `ao harness install <tool>`: one managed dir, verify-by-doctor, per-tool license gate (Anthropic-terms and license-undeclared backends require explicit opt-in). Onboarding lifecycle: install CLI → ao registers it as an executor → P4 harness-sync fans skills/rules/MCP → native-sessions adapter (gizzi 27-adapter pattern) starts picking up its session format. Surfacing inside Allternit / gizzi-code onboarding is a follow-on spec after P7 proves out locally.
**Verify:** clean machine (or clean HOME prefix): `ao harness install kimi codex` → `ao doctor` green → `ao harness sync` reaches the new tools → a session started in the installed CLI appears in native-session listing.

## 6. Migration & compatibility

- ao-* bash scripts: frozen at P1 acceptance, deprecated at P2, removed at P3. `~/.agent-orchestrator/logs/` naming preserved (or symlinked) so existing tooling/parsing keeps working.
- Orchestrator skill / ORCHESTRATOR.md: updated at each phase; skill contract (you scope → spawn → watch → review) unchanged.
- No change to Fabric PWA, proxy, or push worker until P3 — and then only additive.

## 7. Upstream policy

herdr moves fast (0.8→0.9 in ~5 weeks). Keep fork diff = gut list + rebrand layer + additive `src/ao/` modules. Merge window: monthly upstream review, or immediately for security/agent-detection manifest changes. Prefer upstreaming generic fixes. Internal crate name `herdr` never renamed — merges stay textual.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Fork drift as upstream ships features we want | §7 merge windows; thin diff; vendored manifests keep detection fresh independently |
| herdr agent-detection depends on their manifests/integrations | Vendor manifests at P0; local override dir is already the authority |
| ao parity gaps break orchestrator flows | §P1 golden side-by-side test is a hard gate |
| Fabric auth (Clerk device pairing) is the murkiest integration | P3 starts with a protocol spike before full spec |
| Scope creep (plugins marketplace, Windows port) | Out of scope: plugin marketplace browsing, Windows server targets, Kitty graphics work |
| Two runtimes to own (Rust engine + Python UHP fork) | P6 keeps the fork a supervised sidecar with the conformance suite as contract; absorb hot paths into Rust only if the fork proves it earns that |
| UHP fork drift or license-carrying CLI installs | Monthly merge window like §7; P7 installer never auto-accepts non-Apache/MIT/BD-class tool terms — explicit opt-in recorded |

## 9. Open questions

- Crate home: **RESOLVED (human, 2026-09-08)** — `infrastructure/executor/ao-engine/`
- Transcripts: keep `script -q`-compatible raw files vs structured engine logs (recommend: raw-compatible, engine also emits structured) — P1 decision
- Should `ao doctor` keep probing tmux after P2 deprecation? (recommend: yes, fallback exists until scripts removed) — P1 decision

## 10. Phase-1 gate

Current gate artifact: `Research/specs/allternit-runtime-fork.md` (P0). Approval verb: **approve `allternit-runtime-fork`**. P1–P5 each return to the gate as their own named slugs; **P6 (UHP execution layer) and P7 (harness auto-install) added 2026-09-09 (human redirect on `rq-20260909-004`, decision fork_reskin)** — same gate rule, each its own named slug when its phase arrives. P6/P7 do not change P0 scope.
