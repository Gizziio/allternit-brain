---
doc: project
updated: 2026-09-09
status: draft
---

# cloud-computer-orgo-parity — Internal Orgo: Orgo's full capability matrix on Allternit's Computer Cloud

**Product intent (human, 2026-09-09):** We are not adopting Orgo and we are not excluding it —
we are absorbing it. Take everything Orgo **is and does** (cloud computers for AI agents) and
package that functionality into our own Cloud Computer so it is essentially our internal Orgo.
Everything Orgo offers must exist in Cloud Computer, plus anything else already in our codebase
that overlaps with what they have. Strategy: replicate the capability matrix on our Incus/Tart
substrate (`Products/ComputerUse.md` locked D1), under our brand, self-hosted/BYOC-first.

## What Orgo is (source of truth for the matrix)

[Orgo](https://www.orgo.ai/) — "cloud computers for AI agents" ([docs](https://docs.orgo.ai/introduction),
[API reference](https://docs.orgo.ai/api-reference), [migrate guide](https://docs.orgo.ai/guides/migrate)).
Not an agent, not a browser — the computer agents run on. Reached via HTTP API, CLI, or MCP.
Trigger: [Nick Vasile's Codex+Orgo demo](https://x.com/nickvasiles/status/2097429512854368762)
(sidebar of personified bots, each owning a real computer) — Phase 1 of `bot-identity-computer`
(merged, PR #190/#195) already closed the bot-join. This spec closes the **platform** gap.

## Orgo capability matrix vs Allternit today (audited 2026-09-09)

Legend: ✅ implemented · 🟡 partial · ❌ absent · ➕ we exceed Orgo

| # | Orgo capability | Allternit status | Where / gap |
|---|---|---|---|
| 1 | Create computer: os (linux/windows/macos/android), cpu 0.5–16, ram 4–64 GB, disk, gpu, resolution | 🟡 | `POST /api/v1/computers` only accepts `cloud_desktop` + `bot_id`; cpu/disk/resolution/gpu not settable at create (only `memory_mib` via template). Other kinds (`local`/`byo_vps`/`managed`/`byoc`) are 501 stubs |
| 2 | Computers for ANY owner (not just bots) | ❌ | create requires `bot_id`; no user/org/session-owned standalone computers |
| 3 | <500 ms boot (warm restore from golden snapshot) | ❌ | cold spawn only; snapshot restore exists, no warm pool |
| 4 | start / stop / restart | ✅ | `computer_routes.rs:844-1083`; restart = stop+start (no distinct verb) |
| 5 | Live hot-resize (PATCH /resize, cpu/ram/disk, partial-207) | ❌ | no resize endpoint, no UI; presets UI (Phase 2) has nothing to send to |
| 6 | Clone (full disk state copy) | 🟡 | snapshots create/list/restore/delete exist (`bot_desktop_snapshots.rs`); no one-call clone |
| 7 | Move between workspaces | ❌ | no workspace grouping resource for computers (org scoping exists) |
| 8 | Auto-stop per computer | 🟡 | persistence policies (ephemeral/session/persistent) on session-end; no idle auto-stop timer |
| 9 | Screenshot / click (left/right/double) / drag / scroll / type / keypress | 🟡 | all server-side ✅ (`bot_desktop_input.rs`, approval-gated) but `computers-api.ts` doesn't export them; drag not present |
| 10 | Bash exec / Python exec | 🟡 | shell ✅ (`/computers/:id/shell`); Python = run via shell; not exposed in unified client |
| 11 | Interactive PTY terminal over WebSocket | ❌ | shell is one-shot only |
| 12 | Live audio stream (PCM from virtual speaker) | ❌ | — |
| 13 | Event stream (window/clipboard/file/process/idle) | ❌ | — |
| 14 | File upload/download | ✅ | `/computers/:id/files/upload|download` (base64 via guest exec) |
| 15 | Authenticated in-VM HTTP proxy (`/desktops/:id/proxy/<path>`, API-keyed TLS) | ❌ | Tailscale mesh exists (`mesh.rs`) but no API-keyed reverse proxy into guest HTTP services |
| 16 | Templates as code (`orgo.ai/v1`: hardware, apps, services, secrets, lifecycle hooks → golden snapshot) | 🟡 | `/api/v1/desktop-templates` CRUD is DB-row-driven with OS/memory defaults; no declarative file format with app/service/hook builds |
| 17 | Curated `system/…` template refs | 🟡 | template catalog exists; no curated built-in refs |
| 18 | Python + TypeScript SDKs | 🟡 | ACU SDKs (`sdk/computer-use/`) target the ACU canonical gateway, not the `/api/v1/computers` plane; TS `computers-api.ts` lags server (see #9/#10) |
| 19 | CLI (`orgo` — create, drive, `orgo ssh`) | ❌ | `allternit-rails` CLI has no computer commands |
| 20 | MCP server for computers | ❌ | tool-spec emitter only (`mcp-tool-spec.ts`); no standalone computers MCP server |
| 21 | Model-drives-computer endpoint (OpenAI-compatible chat with `computer_id`) | 🟡 | ACU engine + `computer` tool in the tool belt cover the loop; no unified REST "give a model this computer" on the computers plane |
| 22 | Workspaces (group computers; workspace-scoped API keys) | 🟡 | org scoping + Clerk auth ✅; workspace object per se absent |
| 23 | Rate limits, plan caps, error codes | ➕ | we have quotas, org spend caps, approval gating, audit log — stronger |
| 24 | 24/7 continuous run | ✅ | persistent desktops; bots run continuously |
| 25 | Windows guest | ✅ | `bot_desktop_windows.rs` input + PowerShell screenshot |
| 26 | Human watch/takeover/hand-back | ➕ | Orgo has monitoring; we have full observe→take-over→hand-back with bot pause |
| 27 | Fleet desktop mesh / multi-bot mux | ➕ | Tailscale mesh + desktop mux + input queue — Orgo has nothing like this |
| 28 | GPU guests | ❌ | not on Incus/Tart roadmap — deliberate non-goal |
| 29 | Android guests | ❌ | deliberate non-goal |
| 30 | Multi-screen (Xvfb extra displays) | 🟡 | `computer_screens.rs` library, routes not mounted |

## What we already exceed (do NOT rebuild)

Human observe/take-over/hand-back with bot pause, desktop mesh + mux + input arbitration,
approval-gated control (`aci_approvals.rs`), usage/pricing/quota/capacity + audit log,
org auth, ACU engine with run monitor + HITL + replay/GIF trajectories, TS **and** Python
SDKs, e2e verification harness. These are the reasons to build internal-Orgo instead of
buying Orgo — the parity work plugs gaps, it doesn't start from zero.

## Integrate decision

- Approach: `reverse_engineer` (capability parity reimplemented on our substrate — no Orgo
  code, no Orgo account, no Orgo MCP dependency; the public docs are the spec)
- constraints_ok: true · paid_or_signup: false · docker_required: false
- baseline_ref: `Research/baselines/agent-orchestration.md` + audit notes in this spec
- Rejected: vendoring Orgo, depending on Orgo MCP at runtime, dropping our exceed-features
  to match Orgo's surface, GPU/Android guests.

## Phased scope (each phase = one PR-able handoff, own /goal, human gate each)

**Phase 1 — Computers for everything (core parity).** Generalize `POST /api/v1/computers`
to any owner (`owner_type`/`owner_id`: user/org/session/bot — bot becomes one case, not the
only case); full specs at create (cpu/ram/disk/resolution via validated sizes, presets aligned
with `BOT_DESKTOP_PRESETS`); implement `local` kind (Tart on Joe's Mac — first-class provider,
this is the demo story) and formally cut `managed`; `byo_vps`+`byoc` stay tracked follow-ups;
bring `computers-api.ts` to full parity (screenshot/mouse/keyboard/drag/shell/files/snapshots);
distinct restart verb. **Gate decisions 2026-09-09: `local` is committed to Phase 1.**

**Phase 2 — Lifecycle parity.** Live resize (stop-only for disk, cpu/ram where substrate
allows; honest 409/207 semantics), one-call clone from snapshot, idle auto-stop timer per
computer, workspaces-lite = org scoping + a `group` label on computers (decided 2026-09-09:
label first; a dedicated workspace resource only if labels strain).

**Phase 3 — Real-time plane.** Interactive PTY over WebSocket (extend existing VNC ws-token
infra in `bot_desktop_stream.rs`), guest event stream (window/clipboard/file/process/idle via
guest agent), authenticated in-VM HTTP proxy (`/api/v1/computers/:id/proxy/<path>` with
existing auth + approval patterns). Audio stream: optional stretch.

**Phase 4 — Templates as code.** Declarative `allternit.ai/v1`-style template file (hardware,
packages/apps, long-running services, secret refs — vault patterns, not paste — lifecycle
hooks) → build once into golden snapshot → launch restores in seconds (this is also the
foundation for Phase 5's <500 ms-class boot); curated `system/…` refs.

**Phase 5 — Distribution surface.** Computers MCP server (standalone, tool-spec from real
routes), CLI (`allternit computers create/list/ssh/drive`), SDK parity across both planes,
embeddable live-computer widget (reuse BotComputerViewport/noVNC with token-scoped embed).
All first-party: serving our agents and our users' bots. External/third-party developer API
keys are NOT this spec — they ship with the Allternit Cloud subscription product when that
launches (decided 2026-09-09).

**Deliberate non-goals (all phases):** GPU/Android guests, Orgo runtime dependency,
multi-tenant SaaS pricing tiers, replacing the ACU engine (model-driving stays on the ACU
canonical gateway — Phase 1 only documents it), un-gating approval-gated control, external
developer API keys (Allternit Cloud subscription scope, separate spec when that ships).

## Gate checklist

- [ ] Client-facing copy? → yes where UI changes; voice Register 1
- [ ] Money-adjacent? → we already meter/bill computers; parity must reuse, not reinvent
- [ ] Deploy involved? → API + desktop surface; no Cloudflare deploy needed per phase
- [ ] Tier C? → yes — compute isolation, credential adjacency (templates/secrets phase),
      external proxy surface (Phase 3): audit-first on Phase 3's proxy, vault patterns for
      template secrets, keep approval gating on input/shell/file-write

## Acceptance criteria (Phase 1)

- [ ] `POST /api/v1/computers` accepts `owner_type` user/org/session/bot without `bot_id`, or
      documented formal cut of each stub kind
- [ ] Create accepts cpu/ram/disk/resolution with server-side validation matching preset sizes
- [ ] `computers-api.ts` exports the full control surface (screenshot/mouse/drag/keyboard/
      shell/files/snapshots/restart); vm-operator/desktop-cloud-api ad-hoc fetches migrate or
      are noted
- [ ] A non-bot standalone computer can be created, driven (screenshot+shell+files), and
      deleted via the API alone
- [ ] Bots keep working unchanged (bot_id path is a specialization, not a regression)
- [ ] Smoke: create (user-owned) → screenshot → shell → file upload/download → stop → delete
- [ ] Repo ritual per AGENTS.md; brain updates as drafts only

## Executor model tier

- Task class: client_coding_work (Phase 1) · architecture_or_novel_judgment (Phase 3 proxy,
  Phase 4 template format)
- Model tier: A://C backend claude-sonnet-5; spikes A://Fe

## Gate decisions (resolved 2026-09-09, Eoj)

1. **External developer API keys** — out of this spec. They ship with the **Allternit Cloud
   subscription** product when that launches (you have a sub → you get keys). Internal-Orgo
   distribution surface (Phase 5) is strictly first-party: our agents, our users' bots.
2. **`local` kind (Tart on Joe's Mac)** — **in Phase 1**, first-class provider and demo story.
3. **Workspaces** — org scoping + `group` label in Phase 2; dedicated resource only if labels
   strain.
4. Model-driving — ACU canonical gateway + tool belt remains the answer (no new REST endpoint;
   revisit only if a harness needs raw REST). Standing guidance, no change.

## Source of truth

- Spec: `Allternit Brain/Research/specs/cloud-computer-orgo-parity.md`
- Workspace: `~/Desktop/allternit-workspace/allternit`
- Substrate lock: `Products/ComputerUse.md` D1 (Incus/Tart)
- Orgo docs (reference only): https://docs.orgo.ai/introduction · https://docs.orgo.ai/api-reference
- Tracking PR: (fill when opened)
