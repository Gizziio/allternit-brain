---
doc: project
updated: 2026-09-09
status: draft
---

# bot-identity-computer — Atomic Bot Create (Identity + Instructions + Persistent Computer + Tools)

**Product intent (human, 2026-09-09):** Nick Vasile’s Codex + Orgo demo proved the UX users want — a sidebar of personified bots where each session is a durable identity and each bot owns a real computer. Allternit already has the pieces (Bot packaging, `vmOperator`, Computer Cloud `/api/v1/computers`, `provisionBotDesktop`). This spec closes the **join**: Create Bot must be one atomic object, not Agent theater then a separate computer path.

Companion reads:
- [`Products/ComputerUse.md`](../../Products/ComputerUse.md) — Computer Use control plane (microVM-per-task stays; this adds **persistent named computers**)
- [`Products/ComputerUsePackaging.md`](../../Products/ComputerUsePackaging.md) — Gap 5 already calls for named persistent agent identities
- [`Products/Desktop.md`](../../Products/Desktop.md) / [`Products/Platform.md`](../../Products/Platform.md)
- Platform contract: `surfaces/ai.allternit.com/src/lib/bots/BOT_AGENT_CONTRACT.md`
- Platform client: `surfaces/ai.allternit.com/src/lib/bots/vm-operator.ts` (`provisionBotDesktop`, persistence modes)
- Computers API: `surfaces/ai.allternit.com/src/lib/computers-api.ts`

## Goal

When a user creates a Bot in Allternit Desktop / Agent Hub, they get in **one flow**:

1. **Identity** — `displayName` as `Name — Role` (Quinn — Chief of Staff), emoji/accent, `@` handle
2. **Instructions** — system prompt / JOB / does-does-not (no RPG/personality theater)
3. **Persistent computer** — Computer Cloud desktop bound to `bot_id` with `persistence: persistent`, sized (default 2 vCPU / 4 GB / 100 GB), named after the bot
4. **Tools** — real tool/MCP/skill allowlist from the registry

After create, the Bots rail shows a live team; opening a bot resumes its durable session + computer (not a fresh ephemeral sandbox every time). Ephemeral/task microVMs remain available for one-shot Computer Use jobs.

## Source link(s)

- https://x.com/nickvasiles/status/2097392151953117355 (Codex sessions as persistent bot identities)
- https://x.com/nickvasiles/status/2097429512854368762 (demo: each bot gets its own Orgo computer; CoS provisions fleet)
- Competitive note in packaging Gap 5: Grok Bot persistent per-agent machine + identity

## Affected repo / surface

- `~/Desktop/allternit-workspace/allternit`
  - `surfaces/ai.allternit.com/src/lib/bots/*` (contract, create path, roster)
  - `surfaces/ai.allternit.com/src/lib/agents/agent.types.ts` (`AgentVMOperatorConfig`)
  - `surfaces/ai.allternit.com/src/lib/computers-api.ts`
  - `surfaces/ai.allternit.com/src/views/agent-hub/**` / Agent Studio create-bot flow
  - allternit-api routes for `/api/v1/computers` and `/api/v1/bots/:id/desktop/*` (verify/extend bind-on-create)
- Docs: `BOT_AGENT_CONTRACT.md`, public ACI/bot docs if user-facing strings change
- Brain: this spec; later Product doc update after Phase 1 lands

## Division / owner

- [Platform / Surfaces](../../Divisions/INDEX.md) — Agent Hub + Desktop
- Computer Use / Compute — Computer Cloud substrate (Incus/Tart; locked D1)

## Integrate decision

- Approach: `thin_adapter` on existing Bot + Computer Cloud primitives (not a new Orgo fork; not reverse-engineering Codex)
- constraints_ok: true
- paid_or_signup: false (BYOC / local Computer Cloud; no Orgo account)
- docker_required: false (Joe policy: Docker-free demos; Tart/Incus already the substrate)
- baseline_ref: `Research/baselines/agent-orchestration.md` (+ Computer Use product docs)
- Rationale: Nick glued Codex sessions to Orgo MCP. Allternit already owns both halves under one brand — Bot packaging + Computer Cloud. The product gap is the **atomic create + persistent bind + Bots-rail UX**, not new infrastructure. Rejected: shipping Orgo as a dependency; rebuilding Agent Studio theater; treating packaged prompt templates (OpenMausBot Phase 1) as sufficient without computers.

## Product contract (binding)

**Bot = Identity + Instructions + Computer + Tools**

| Field | Required on create | Source of truth |
| --- | --- | --- |
| Identity | `botProfile.displayName` (`Name — Role`), accent/emoji, `agent.name` handle | `bot-contract.ts` / `BOT_AGENT_CONTRACT.md` |
| Instructions | `systemPrompt` with explicit JOB + does/does-not | Agent record |
| Computer | `vmOperator.enabled=true`, `persistence: 'persistent'`, `computerKind: 'cloud_desktop'`, resources, bound `computer.id` via `bot_id` | `AgentVMOperatorConfig` + `/api/v1/computers` + `provisionBotDesktop` |
| Tools | `allowedTools` / connector bindings from real registry | tool registry + MCP |

**Defaults (Nick-compatible, overridable):**
- Resources: 2 vCPU, 4096 MB RAM, 102400 MB disk (document as 2 / 4 GB / 100 GB)
- Provider: Computer Cloud (`incus` Linux desktop default; `tart` when macOS guest required)
- Computer display name: `emoji displayName` (e.g. `👨‍💼 Quinn — Chief of Staff`)
- Auto-start: off until first session/task (avoid frying host); provision record exists immediately
- Task microVMs: remain for Computer Use one-shots; do **not** replace the bot’s persistent desktop

**Non-goals for this slug:** Orgo MCP integration, Codex-inside-Allternit, RPG personality wizard, pricing/quotas, monitor-model Phase 2, ao v3 work.

## Phased scope

- **Phase 1 (this handoff):** Atomic Create Bot path that always writes the four fields; on save, provision (or bind existing) persistent Computer Cloud desktop with `bot_id`; Bots rail / roster shows computer status; create-bot smoke test; contract/docs updated. Collapse/disable theater steps that don’t affect runtime.
- **Phase 2+ (out of scope):** Orchestrator “provision computers for the whole team” fleet action; size presets UI; watch/takeover UX polish; publish safety numbers; client-facing Build package “named bot hive.”

## Gate checklist

- [ ] Client-facing copy? → yes for Bots rail labels — voice Register 1 (plain, no guarantee language)
- [ ] Money-adjacent? → no billing in Phase 1
- [ ] Deploy involved? → no production deploy required for Phase 1; desktop/local Computer Cloud only
- [ ] Tier C? → computer isolation/credentials adjacent — keep vault/proxy-token patterns; no new credential paste into prompts

## Acceptance criteria (Phase 1)

- [ ] Create Bot form/API accepts Identity + Instructions + Computer policy + Tools in one submit (no post-hoc manual provision required for the happy path)
- [ ] On success, `GET /api/v1/computers?bot_id=<id>` returns exactly one primary `cloud_desktop` with `persistence` persistent (or documented bind to existing)
- [ ] `agent.vmOperator` persisted with `enabled: true`, `persistence: 'persistent'`, resources matching defaults unless overridden
- [ ] Bots roster/rail shows `Name — Role` + computer status (provisioning / running / stopped / error)
- [ ] Opening the bot reuses the same computer (`ensure`/`find` by `bot_id`), not a new ephemeral sandbox
- [ ] Theater-only steps (RPG stats, Big Five, forge animation) are removed or skipped on the Create Bot path
- [ ] Contract docs (`BOT_AGENT_CONTRACT.md`) state the atomic four-field rule and persistent-computer default for bots
- [ ] Automated or scripted smoke: create → list computer by bot_id → start session → assert same computer id
- [ ] Repo ritual: worktree, plan/steering as required by `AGENTS.md`, PR + ledger attestation

## Executor model tier

- Task class: client_coding_work
- Model tier: A://C
- Concrete backend: claude-sonnet-5 (per `model_route` 2026-09-09)
- Spike/design judgment if needed: A://Fe / claude-fable-5

## /goal (Phase 1 — paste-ready)

Outcome: In `~/Desktop/allternit-workspace/allternit`, ship Phase 1 of `bot-identity-computer` so Create Bot is one atomic submit that packages an Agent as a Bot with Identity (`Name — Role`), Instructions (JOB system prompt), Tools (real allowlist), and a **persistent** Computer Cloud desktop bound via `bot_id` (default 2 vCPU / 4 GB / 100 GB), visible in the Bots rail with live computer status, reusing the same computer across sessions.

Constraints:
- Read and follow: `Allternit Brain/Research/specs/bot-identity-computer.md` (this slug), `surfaces/ai.allternit.com/src/lib/bots/BOT_AGENT_CONTRACT.md`, `vm-operator.ts`, `computers-api.ts`, `Products/ComputerUse.md` locked D1 (Incus/Tart — no Firecracker/Orgo dependency)
- Prefer extending existing `provisionBotDesktop` / `/api/v1/computers` / `vmOperator` over new substrate
- No Docker-required path; no Orgo MCP; no paid signup deps
- Remove or bypass Create Bot theater that does not affect runtime (RPG/personality/forge)
- Follow workspace `AGENTS.md` ritual (worktree, steering, PR, ledger)
- Brain updates as drafts only; no `confirm:true`; no deploy with `confirm:true`

Acceptance:
- Atomic create writes all four fields
- Computer list-by-`bot_id` shows persistent primary desktop
- Session reopen reuses same computer id
- Bots UI shows Name — Role + computer status
- Smoke test or equivalent verification recorded
- `BOT_AGENT_CONTRACT.md` updated
- PR + ledger attestation

Non-goals:
- Fleet “provision all bots” orchestrator action (Phase 2)
- Orgo/Codex integration
- Pricing, monitor model, ao v3

## Open questions

- Should Create Bot **block** until the computer reaches `running`, or return immediately with `provisioning` and let the rail stream status? (Recommend: return immediately + stream status.)
- Default guest OS: Linux desktop via Incus vs macOS via Tart for first-run on Joe’s Mac? (Recommend: Incus Linux default; Tart opt-in.)
- Do non-bot Agents keep `vmOperator` optional/off, while Bots default persistent on? (Recommend: yes — contract already says every Bot is an Agent.)

## Source of truth

- Spec: `Allternit Brain/Research/specs/bot-identity-computer.md`
- Workspace: `~/Desktop/allternit-workspace/allternit`
- Surface: Allternit Desktop / Agent Hub Bots + Computer Cloud
- Tracking PR: (fill when opened)
