---
doc: project
updated: 2026-09-08
status: draft
---

# allternit-runtime-fork — ao v3 (P0: fork hygiene)

**Naming resolved (2026-09-08, human):** the product stays **agent orchestrator — `ao`**. No new brand. The herdr fork ships as an internal engine crate inside one `ao` Rust binary that replaces the current `ao-*` bash scripts. Full build plan: [`Products/AgentOrchestratorRuntime.md`](../Products/AgentOrchestratorRuntime.md) (evidence base: exact ao contract, herdr module map, Fabric protocol, harness-sync schema; phases P0–P5; upstream policy; risks).

## Goal

Allternit owns an Allternit-branded agent runtime shipped as **one Rust binary named `ao`** — a vendored fork of herdr 0.9.0 (Apache-2.0) embedded as the engine, with ao's existing orchestration contract preserved exactly and the new surfaces (machine/SSH management, Fabric Transport session pickup, harness sync, cross-session visibility) added as `ao` subcommands. This supersedes the thin_adapter spec (`Research/specs/herdr-v090-adapter.md`, archived) — the human direction (2026-09-08) is to absorb the engine and keep the ao identity, not to wrap or rebrand under a new name.

## Source link(s)

- https://github.com/herdrdev/herdr/releases/tag/v0.9.0 (fork base)
- https://github.com/herdrdev/herdr — Apache-2.0, one Rust binary, no signup/paid/Docker
- `~/.agent-orchestrator/ORCHESTRATOR.md` + `~/.claude/skills/agent-orchestrator/` (ao semantics to absorb)
- `Allternit Brain/Infra/cloudflare.md` §Fabric Session (existing transport surfaces)
- `Allternit Brain/Ops/README.md` §Harness sync (harness-sync.js to port)
- `allternit-workspace/allternit` — target repo (Rust workspace; vendored-fork precedent: `services/mailflare`)

## Affected repo / surface

- `allternit-workspace/allternit` → new engine crate (recommended `infrastructure/executor/ao-engine/`; internal crate name `herdr` kept — P0 decision) + `ao` binary target
- `THIRD_PARTY_NOTICES.md` (Apache-2.0 attribution for herdr)
- `~/.agent-orchestrator/`, `~/.claude/skills/agent-orchestrator/` (ao — absorbed over phases, not day 1)
- `Allternit Brain/Ops/harness-sync.js` (ported to Rust in P4)
- Fabric Session PWA + `api.allternit.com` runtime-devices proxy (reused as-is; binary becomes a node in P3)

## Division / owner

- [Platform / Surfaces](../Divisions/INDEX.md)

## Integrate decision

- Approach: `fork_reskin`
- constraints_ok: true
- paid_or_signup: false (local binary; no account on the core path)
- docker_required: false
- baseline_ref: `Research/baselines/agent-orchestration.md`
- Rationale: Human-directed pivot (2026-09-08): herdr's product shape IS the intended Allternit product shape — a branded agent runtime with machine management and session visibility — so reskinning beats adapting. Apache-2.0 permits rebranding with attribution. Rejected: thin_adapter (superseded), reverse_engineer (throws away a clean, fast-moving Rust codebase), watch (human wants the product built).

## Product shape — what goes in the binary

Naming (human, 2026-09-08): binary and product are **`ao`** — no new brand. Details and evidence in [`Products/AgentOrchestratorRuntime.md`](../Products/AgentOrchestratorRuntime.md).

| Capability | Source today | Packaged as |
|---|---|---|
| Agent terminal runtime: panes, workspaces, working/blocked/idle detection, session persistence, socket API | herdr 0.9.0 fork | Engine crate under `ao` (internal crate name `herdr` kept for mergeability) |
| Machine / SSH / workspace management (`herdr machine`, combined agent list, auto-reconnect) | herdr 0.9.0 native | `ao machine` |
| Session pickup anywhere + connected-machines view | Fabric Transport (PWA at fabrictransport.allternit.com, QR pairing, `api.allternit.com` runtime-devices proxy, push worker) | `ao fabric pair|serve`; web surfaces reused as-is |
| Multi-session visibility / "who needs you" | herdr agent list + Lantern UX ideas (`rq-20260908-005`, watch — revisited with our own runtime) | Native sidebar panel fed by agent states + Rails peers |
| Orchestration: spawn/watch/status/kill, sentinels, transcripts, worktree isolation | ao bash scripts (tmux-native) | `ao spawn|send|watch|status|kill|doctor` — exact contract parity per plan §2.1 |
| Harness sync: fan skills/rules to claude/codex/kimi/grok/cursor/gizzi | `Allternit Brain/Ops/harness-sync.js` | `ao harness sync|status|uninstall` — ported, same `harness.json` schema |
| Session pick-up: discover / list / fetch / export any CLI tool's session | gizzi-code v2.0.7 **native sessions** (SHIPPED — `src/runtime/session/native-source.ts`) | ao session substrate; feeds Fabric pickup (P3) + visibility (P5) |
| Peer messaging / agent identity | `allternit-agent-system-rails` (already Rust in workspace) | `ao peer list|send` + visibility panel |

## Phased plan (P0–P5, details in plan doc §5)

- **P0 — Fork hygiene (this handoff):** vendor herdr v0.9.0 as engine crate (recommended home `infrastructure/executor/ao-engine/`); gut `update.rs` / `product_announcements.rs` / remote manifest fetch; notices + LICENSE; build + herdr tests green; `ao --version` works. Upstream remote kept; monthly merge windows.
- **P1 — Engine + ao contract parity (own spec at gate):** `ao spawn/send/watch/status/kill/doctor` on the vendored engine — marker-paste protocol, sentinel file-existence semantics, exit codes, stdout formats, worktree guards, transcripts; tmux scripts become fallback; golden side-by-side parity test is the hard gate.
- **P2 — TUI face + machine management (own spec):** herdr client as the ao TUI via theme/config layer; `ao machine` multi-machine pilot (this Mac + one Linux host).
- **P3 — Fabric node (own spec):** runtime-device pairing, QR, proxy node, PWA session pickup; protocol spike first (Clerk auth is the riskiest piece).
- **P4 — Harness sync port (own spec):** `ao harness` in Rust on the existing `harness.json`; JS retired after byte-parity dry-run.
- **P5 — Visibility + peers (own spec):** "who needs you" panel (agent states + Rails peers + blocked notifications); revisits `rq-20260908-005`.

## Gate checklist

- [ ] Client-facing copy? → runtime is internal-first; any user-facing strings follow voice Register 1
- [ ] Money-adjacent? → no
- [ ] Deploy involved? → no (P3 reuses existing deployed surfaces; nothing new deployed here)
- [ ] Tier C? → no regulated data; license audit done (Apache-2.0 attribution required — tracked in acceptance)

## Acceptance criteria (P0)

- [ ] herdr v0.9.0 source vendored under the chosen workspace path with upstream git remote + SHA recorded
- [ ] Workspace member builds as binary `ao`; `ao --version` reports ao/Allternit identity; internal crate name `herdr` kept (mergeability)
- [ ] Gut list applied and documented: `src/update.rs`, `src/product_announcements.rs`, remote agent-manifest fetch (vendored TOML manifests instead); no herdr.dev network couplings remain (verify by grep + a run under no external network expectations)
- [ ] Diff vs upstream tag v0.9.0 = gut list + notices + build wiring only — no functional forks of core logic
- [ ] `THIRD_PARTY_NOTICES.md` carries herdr Apache-2.0 attribution; herdr LICENSE preserved in-crate
- [ ] `cargo test` for the vendored crate matches upstream results (pre-existing failures noted honestly, not silently fixed)
- [ ] Repo ritual honored: session worktree, plan file, steering checkpoints, PR + ledger attestation

## Executor model tier

- Task class: client_coding_work
- Model tier: A://C
- Concrete backend: claude-sonnet-5 (per `model_route` 2026-09-08)

## /goal (P0 — paste-ready)

Outcome: herdr v0.9.0 is vendored into the allternit-workspace Rust workspace as an engine crate (recommended path `infrastructure/executor/ao-engine/`; internal crate name `herdr` kept so upstream merges stay textual), gutted of its three herdr.dev couplings (self-updater `src/update.rs`, `src/product_announcements.rs`, remote agent-manifest fetch — vendored TOML manifests instead), building as one `ao` binary that reports ao/Allternit identity via `ao --version`, with Apache-2.0 attribution in THIRD_PARTY_NOTICES.md and the herdr LICENSE preserved in-crate. herdr's existing tests pass with upstream-parity results.

Constraints:
- Follow the workspace AGENTS.md session ritual: own worktree, plan file, `.steering/checkpoint.md` updates, steering gate on commits
- Keep the fork diff minimal and mergeable with upstream: gut list + notices + build wiring only — no rewrites of core logic, no string-level rebrand of the TUI (that is P2, via theme/config layer); record the upstream remote/SHA vendored from
- Apache-2.0 compliance: preserve LICENSE, mark modifications, attribute in THIRD_PARTY_NOTICES.md
- No paid/signup/Docker dependencies introduced; no new network services; no herdr.dev network couplings remain (verify by grep)
- Brain updates as drafts only; no confirm:true

Acceptance:
- `cargo build` for the workspace member green; `ao --version` shows ao/Allternit identity
- Diff vs upstream tag v0.9.0 reviewable and confined to the gut list + notices + wiring
- THIRD_PARTY_NOTICES.md + in-crate LICENSE correct
- herdr test suite passes (pre-existing failures documented, not silently fixed)
- Ledger attestation written per repo ritual

Non-goals:
- ao subcommand parity, TUI rebrand, machine/fabric/harness/peer surfaces (P1–P5, each its own named spec + gate — see Products/AgentOrchestratorRuntime.md §5)
- Any change to the Fabric PWA, api.allternit.com proxy, or harness-sync.js
- Allternit-only feature code in the fork before the engine base is proven mergeable

## Open questions

- **Crate home:** `infrastructure/executor/ao-engine/` (recommended — executor runtime, matches cowork-runtime placement) vs `vendor/` — P0 decision
- **Transcripts:** keep `script -q`-compatible raw log files vs structured engine logs (recommend: raw-compatible, engine also emits structured) — P1 decision
- **Post-deprecation doctor:** should `ao doctor` keep probing tmux after P2? (recommend: yes until bash scripts are removed) — P1 decision
- Fabric Clerk device-auth details — P3 protocol spike before that spec is written

## Source of truth

- Queue: `Research/queue.json` → `rq-20260908-028` (decision fork_reskin)
- Spec: `Research/specs/allternit-runtime-fork.md`
- Baseline: `Research/baselines/agent-orchestration.md`
- Tracking PR: TBD at execute (workspace PR per repo ritual)
