---
doc: project
updated: 2026-09-09
status: draft
---

# bots-brains-fabric-ao — Umbrella: Native brain sessions + Fabric/Desktop bots + ao visibility

**Product intent (human, 2026-09-09):** Computer parity (`cloud-computer-orgo-parity`) keeps running in parallel — that track is correct and stays owned by its own agents/PRs. **In parallel**, ship the other half of Nick’s unlock and the phone offer: bots that run on **different brains** (Codex / Claude / Kimi / Allternit cloud) as durable native sessions, and a **first-rate Bots surface** on Fabric Transport PWA + Allternit Desktop that also surfaces the new **`ao` agent-orchestrator** binary (working/blocked/idle, machines, paired devices, who-needs-you).

This is one umbrella so context stays coherent. Execution is **three merge-isolated slices** (A/B/C below) — one feature per agent — sharing only frozen contracts at the seams.

## Why (gap vs what already landed)

| Layer | Status | Notes |
| --- | --- | --- |
| Atomic Bot + persistent Computer Cloud | ✅ Landed | PRs #190 / #195 — `bot-identity-computer` |
| Orgo computer matrix on Incus/Tart | 🔄 Parallel | `cloud-computer-orgo-parity` (do not block on this umbrella) |
| Bot = durable **native harness session** (Codex etc.) | ❌ Missing | Native sessions pickup/export exist; Create Bot does not bind a bot to a forever Codex/Claude/Kimi session as its brain |
| Fabric PWA bots-first phone surface | ❌ Missing | PWA today = pair / runtimes / remote session; brain picker exists for fabric sessions, not a Team/Bots roster |
| `ao` visibility on Desktop + Fabric | ❌ Missing | ao v3 plan has TUI + Fabric node + P5 visibility; not yet a shared UI panel in Desktop Bots / Fabric PWA |

Nick’s real unlock was **Codex session = bot identity**; Orgo was the computer. We shipped the computer join. This umbrella ships the brain-session join + the multi-device offer.

## Goal

A customer (or Joe) can:

1. Create/open a Bot whose **brain** is a chosen harness session (Codex subscription, Claude Code, Kimi, or Allternit cloud) — durable, resumable, not only an Allternit-cloud chat wrapper.
2. Talk to that Bot from **phone (Fabric PWA)** and **Desktop** with the same roster: `Name — Role`, brain chip, computer status.
3. See **`ao` orchestration state** (panes working/blocked/idle, machines, Fabric-paired devices, approval “who needs you”) in both Desktop Bots mode and Fabric — same contract, two skins.
4. Keep Computer Cloud binding from `bot-identity-computer` (persistent desktop per bot) without regressing it.

## Source link(s)

- Nick: https://x.com/nickvasiles/status/2097392151953117355 · https://x.com/nickvasiles/status/2097429512854368762
- Landed computer join: `Research/specs/bot-identity-computer.md` (PRs #190/#195)
- Parallel computer parity: `Research/specs/cloud-computer-orgo-parity.md`
- Native sessions: `docs/public/tools/native-sessions.md` (Codex/Claude/Kimi pickup/export)
- Fabric protocol: `Research/drafts/prep-p3-fabric-protocol.md`
- ao plan: `Products/AgentOrchestratorRuntime.md` (P3 Fabric node, P5 visibility, P6 “choose a brain” / UHP)
- Existing UI hooks: `FabricBrainPicker.tsx`, `FabricSessionHub.tsx`, `BotHub*`, `surfaces/.../views/bots/*`

## Visual targets (mockups — design intent, not pixels-locked)

Assets (Mac + box Brain):

- `Research/specs/assets/bots-fabric-ao/01-fabric-pwa-bots-roster.png` — phone Team roster: Bots / Sessions / Computers / Devices tabs; `Name — Role` + brain chip + computer status
- `Research/specs/assets/bots-fabric-ao/02-fabric-pwa-bot-chat-brain.png` — bot chat with brain switcher (Codex/Claude/Kimi/Allternit) + computer card + Watch
- `Research/specs/assets/bots-fabric-ao/03-desktop-bots-ao-fabric-panel.png` — Desktop Bots mode + right rail `ao` panel (states, machines, Fabric devices, who-needs-you)

Implementers match information architecture and hierarchy; polish colors/chrome to existing Allternit tokens.

## Affected repo / surface

- `~/Desktop/allternit-workspace/allternit`
  - **Slice A:** `surfaces/ai.allternit.com/src/lib/bots/*`, agent types/`harness`, native-sessions bridge, CreateBotForm brain step, session start
  - **Slice B:** Fabric PWA routes/components under `surfaces/ai.allternit.com` fabric-session + `infrastructure/fabrictransport-*` only as needed for bots API proxy allow-list; mobile chrome
  - **Slice C:** Desktop shell + shared `ao` visibility client (new thin module), Fabric hub panel reuse; ao binary socket API consumers (read-only first)
- ao engine worktrees (visibility contract only — no P0 gut scope change here)
- Brain: this umbrella; child gate notes per slice

## Division / owner

- Platform / Surfaces (Desktop, Fabric PWA, Bots)
- ao / runtime (visibility + Fabric node alignment)
- Computer Use track remains owner of `cloud-computer-orgo-parity` (sibling)

## Integrate decision

- Approach: `thin_adapter` + product packaging — compose native-sessions + Bot contract + Fabric relay + ao visibility; do **not** vendor Orgo; do **not** make Codex Desktop a dependency of Allternit Desktop
- constraints_ok: true · paid_or_signup: false for core path (customer’s own CLI logins = brain mode 1; Allternit cloud credits = brain mode 2 per ao §2.6 credential model)
- docker_required: false
- baseline_ref: `Research/baselines/agent-orchestration.md`
- Rationale: Nick glued Codex sessions + Orgo computers. We already own computers. Extending services means **selling bots that can run on the customer’s brains** and **reaching them on phone via Fabric** while Desktop remains the home node. `ao` is the orchestration pane both surfaces show.

## Frozen seam contracts (all slices must honor)

1. **Bot record (already):** Identity + Instructions + Tools + `vmOperator` persistent computer (`bot-identity-computer`).
2. **Brain binding (new):** `bot.brain` = `{ mode: 'native_harness' | 'allternit_cloud' | 'uhp_harness', harness?: 'codex'|'claude'|'kimi'|…, nativeSessionId?: string, uhpHarnessId?: string, modelRef?: {providerID, modelID} }` — exact TS shape owned by Slice A; B/C only consume.
3. **Roster DTO (new):** `{ botId, displayName, roleLine, brainLabel, computerStatus, aoState? }` — shared JSON for Desktop + PWA.
4. **ao visibility DTO (new, read-only v1):** `{ panes: [{id,label,state: working|blocked|idle}], machines: [...], fabricDevices: [...], needsYou: [...] }` served from Desktop gateway / ao socket bridge; Fabric proxies via existing runtime relay path allow-list.
5. **No cross-slice file ownership:** A owns bot/brain libs; B owns `fabric-session` mobile bots UI; C owns Desktop Bots+ao chrome and shared visibility client package path agreed at kickoff (`packages/@allternit/ao-visibility` recommended).

## Parallel slices (one agent each)

### Slice A — `bots-native-brain` (brain sessions)

**Outcome:** Create/open Bot can bind a durable brain: native Codex/Claude/Kimi session **or** Allternit cloud. Starting the bot resumes that brain; switching brain is explicit and recorded. Computer bind unchanged.

**Touches:** CreateBotForm brain step; `BOT_AGENT_CONTRACT.md`; harness/native-sessions bridge; `useStartBotSession` brain resume; provider routing pins stay compatible.

**Acceptance:**
- [ ] Bot create/edit persists `bot.brain` 
- [ ] Start bot with `native_harness:codex` resumes or creates tracked Codex-backed session (using native-sessions + subprocess/harness — no silent fallback to a different brain)
- [ ] Brain chip visible on BotHubCard
- [ ] Contract doc updated; vitest for brain bind/resume
- [ ] Does **not** edit Fabric PWA routes or ao TUI

**/goal A:** see below.

### Slice B — `fabric-pwa-bots` (phone surface)

**Outcome:** Fabric Transport PWA gains first-rate **Bots** tab matching mockup IA: Team roster, bot chat with brain chips + computer card, Sessions/Computers/Devices secondary. Paired to Desktop runtime; uses roster DTO + existing relay.

**Touches:** Fabric session PWA views/chrome; bots roster/chat mobile; relay path allow-list only if new `/api/...` prefixes required; reuse Slice A DTOs (stub with fixtures until A merges if needed — prefer feature flag).

**Acceptance:**
- [ ] PWA bottom nav includes Bots (default) / Sessions / Computers / Devices
- [ ] Roster shows Name — Role, brain label, computer status when paired
- [ ] Opening a bot supports message send via existing fabric session/drive paths
- [ ] Works on phone-width; no Desktop-only chrome
- [ ] Does **not** change CreateBotForm or ao engine crates

**/goal B:** see below.

### Slice C — `desktop-ao-visibility` (Desktop + shared ao panel)

**Outcome:** Allternit Desktop Bots mode shows Team list + chat + **ao panel** (states, machines, Fabric devices, who-needs-you) per mockup 03. Same ao visibility client embedded in Fabric hub (desktop web) so Fabric is not phone-only for ao.

**Touches:** Desktop shell Bots layout; shared `@allternit/ao-visibility` (or agreed path); read-only consumer of ao socket / gateway; FabricSessionHub side panel reuse.

**Acceptance:**
- [ ] Desktop Bots mode shows ao rail with working/blocked/idle counts
- [ ] Lists This Mac + other ao machines when available; shows paired Fabric devices
- [ ] Needs-you approvals render with approve/deny hooks to existing approval surfaces where possible
- [ ] Fabric desktop hub can show the same panel component
- [ ] Does **not** implement UHP P6 or rewrite herdr; read-only visibility first
- [ ] Graceful empty state when ao binary not running

**/goal C:** see below.

## Sibling track (do not steal)

**`cloud-computer-orgo-parity`** continues independently. Umbrella slices must not regress `ensureBotComputer` / persistent `bot_id` desktops. If a computer API change is required for phone Watch, file a small PR against the computer track or coordinate — do not fork computer routes inside B.

## Gate checklist

- [x] Client-facing copy? → Register 1 on PWA/Desktop strings
- [ ] Money-adjacent? → no new billing in these slices (cloud brain uses existing credits path only)
- [ ] Deploy? → Fabric/PWA deploy preview before confirm; Desktop release separate
- [ ] Tier C? → credentials stay in native CLI logins or vault/proxy tokens — never paste API keys into bot prompts

## Executor model tier

- Umbrella / seam design: A://Fe · claude-fable-5
- Slice implementation: A://C · claude-sonnet-5 (`model_route` 2026-09-09)

## /goal — Slice A (`bots-native-brain`)

Outcome: In allternit-workspace, bind each Bot to a durable brain (`native_harness` Codex/Claude/Kimi or `allternit_cloud`), persist on the bot record, show brain on BotHubCard, and resume that brain on session start without breaking persistent Computer Cloud binding from bot-identity-computer.

Constraints: Honor frozen seam contracts in `Research/specs/bots-brains-fabric-ao.md`; extend native-sessions + harness — do not depend on Orgo or Codex Desktop app UI automation; no Fabric PWA file ownership; AGENTS.md ritual; drafts-only brain updates.

Acceptance: `bot.brain` persisted; resume path verified in tests; hub chip; contract updated; PR + ledger. Non-goals: PWA tabs, ao panel, orgo-parity matrix items.

## /goal — Slice B (`fabric-pwa-bots`)

Outcome: Fabric Transport PWA presents Bots as the primary phone surface (roster + bot chat with brain chips and computer status card) per mockups 01–02, paired to the Desktop runtime via existing Fabric relay.

Constraints: Consume roster/brain DTOs from Slice A (fixtures/feature-flag OK if A not merged); match mockup IA; phone-first CSS; only additive relay allow-list changes; no CreateBotForm/ao-engine edits; preview before deploy.

Acceptance: Bots default tab; roster fields; chat send path; mobile layout; PR + ledger. Non-goals: native brain bind implementation, ao visibility rail.

## /goal — Slice C (`desktop-ao-visibility`)

Outcome: Desktop Bots mode shows Team + chat + ao visibility rail (pane states, machines, Fabric devices, who-needs-you) per mockup 03; same panel component available in Fabric desktop hub; empty-state when ao is down.

Constraints: Read-only ao visibility v1; shared package/module; do not implement UHP P6 or Fabric pairing rewrite; no PWA bots tab ownership; AGENTS.md ritual.

Acceptance: rail renders live or empty; Fabric hub reuse; approve/deny wired or clearly stubbed to existing approvals; PR + ledger. Non-goals: phone PWA bots, brain bind.

## Open questions

- Brain switch mid-flight: fork new native session vs continue same with model change? (Recommend: explicit confirm; default fork for native_harness, in-place for allternit_cloud.)
- Should `runtimeType: "ao"` land before Slice C, or can C talk to gizzi/Desktop gateway first? (Recommend: C targets Desktop gateway bridge first; ao runtimeType follows ao P3.)
- PWA auth: Clerk on phone vs device-token-only when already paired? (Recommend: keep current Fabric pairing; bots API uses paired runtime proxy.)

## Source of truth

- Umbrella: `Allternit Brain/Research/specs/bots-brains-fabric-ao.md`
- Mocks: `Allternit Brain/Research/specs/assets/bots-fabric-ao/`
- Workspace: `~/Desktop/allternit-workspace/allternit`
- Sibling: `Research/specs/cloud-computer-orgo-parity.md`
