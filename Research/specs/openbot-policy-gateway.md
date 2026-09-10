---
doc: project
updated: 2026-09-10
status: draft
---

# openbot-policy-gateway — Fail-Closed Policy Layer + Audit-Before-Act + Bot-Mode Governance UI

**Research origin:** `rq-20260910-001` (CopilotKit OpenBot). This spec covers OpenBot port candidates **#1 (declarative policy layer)** and **#2 (audit-before-act ordering)** — same gateway code path, must ship together — plus a **bot-mode UI slice** (policy editor, audit view, live verdict chips) requested by Eoj 2026-09-10, and **Phase 2** scope for herald-style subagent telemetry + computer screen streaming in chat (reference: herald Hermes bot app, screen recordings 2026-09-10, patterns described in Phase 2 below).

Companion reads:
- [`Products/ComputerUse.md`](../../Products/ComputerUse.md) — control plane, locked D1–D3 ("we port designs, not code"; safety is the product)
- [`Research/baselines/bot-computers.md`](../baselines/bot-computers.md) — what we already have, gap list vs OpenBot
- [`Research/specs/bot-identity-computer.md`](bot-identity-computer.md) — sibling spec (bot + persistent computer); bot-mode surfaces defined there
- [`Research/INDEX.md`](../INDEX.md) — OpenBot watchlist row

## Goal

Allternit Computer Use gains the governance properties OpenBot has and we lack — (1) a **declarative, admin-editable action policy** evaluated fail-closed on every gateway call (deny before allow, missing policy permits nothing, a broken rule refuses rather than opens), and (2) an **audit-before-act ordering guarantee** (the audit/receipt row is written *before* the action executes; no code path can act without the record already existing) — **and** the UI to see and steer it, surfaced **only inside bot mode** (the bot session/chat view): a policy editor, an audit list, and live per-action verdict chips. No new top-level tabs or nav entries anywhere. Phase 2 adds herald-style live subagent telemetry and the bot's computer screen streaming inside the chat.

## Source link(s)

- https://github.com/CopilotKit/OpenBot (MIT) — reference for CEL-policy semantics and gateway ordering ("There is no path that acts without the record existing first"; "Deny is evaluated before allow, a missing policy permits nothing, and a broken rule refuses rather than opens"), plus `/admin/boundaries`-style rule editing and `/admin/audit`-style audit listing (design only)
- herald (Hermes bot app by @iamlukethedev, reference via screen recordings 2026-09-10) — Phase 2 telemetry/screen-streaming UX patterns

## Affected repo / surface

- `~/Desktop/allternit-workspace/allternit`
  - Rust ACI gateway (`/api/aci/*` routes, `aci_safety.rs` taxonomy classifier) — policy evaluation point
  - Approvals/grants path (action-hash-bound single-use grants + receipts) — policy outcome feeds grant checks, does not replace them
  - EventLedger / runs.sqlite3 + Rust receipts JSONL — audit-before-act ordering; audit-list read API
  - ACU engine (Python planning loop) — consume gateway verdicts; no separate policy engine Python-side in Phase 1
  - Bot-mode UI in the Agent Hub bot session view (`surfaces/ai.allternit.com/src/views/agent-hub/**`, bots rail + watch/takeover panel from `bot-identity-computer` Phases 1–2)
  - Docs: `docs/public/aci/safety.md` (system card) + operator config docs

## Division / owner

- [Platform / Computer Use](../../Divisions/INDEX.md) — ACI gateway + ACU engine + Agent Hub bot-mode surfaces

## Integrate decision

- Approach: `reverse_engineer` — port the policy/ordering/UX **designs** into our Rust gateway + bot-mode UI; no OpenBot or herald code, runtime, or dependency adopted
- constraints_ok: true (on this path)
- paid_or_signup: false (no CopilotKit Intelligence, no third-party account)
- docker_required: false (policy lives in the existing Rust gateway; Docker-free per Joe policy)
- baseline_ref: `Research/baselines/bot-computers.md`
- Rationale: OpenBot's runtime is vetoed twice (Docker Compose required; CopilotKit Intelligence account required); herald is a closed reference. The value is the governance formalism + bot-mode UX, which maps onto our existing taxonomy + grants + ledger + bot session view. Consistent with ComputerUse.md D3.
- Veto note: adopting OpenBot as a runtime/dependency would flip paid_or_signup and docker_required to true and fail the hard vetoes — do not do it.

## Product contract (binding)

**Policy semantics (ported from OpenBot, adapted to our action model):**
- One policy document (JSON, loaded from env/file at startup — same operational shape as OpenBot's `AGENT_COMPUTER_POLICY`), admin-editable
- Rule fields map to our action envelope: tool/action name, intent, bot id, actor/session id, target host/url, file path class, MCP tool class
- **Deny before allow; missing policy permits nothing; malformed policy stops gateway startup and names the broken rule**
- Every refusal records the rule that caused it (rule id in the audit row + receipt)

**Audit-before-act ordering:**
- Gateway sequence per action: resolve target → evaluate policy → write audit/receipt row → only then dispatch to executor
- A failed/crashed executor still leaves the audit row; a policy refusal is itself an audited event
- Verification must include a forced-executor-failure test proving the record exists before the act

**Phase 1 rule syntax:** simple declarative JSON (match fields → allow/deny). Do **not** vendor a CEL interpreter in Phase 1 unless one is already in the dependency tree — the semantics matter, the language doesn't.

**UI placement (Eoj directive 2026-09-10, binding):**
- All policy UI lives **inside bot mode** — the bot session/chat view where the bot's computer, tools, and activity already live
- **No new top-level tabs, no new nav entries.** When bot mode is off, none of this renders
- Three surfaces, all in-context: (a) **verdict chips** on each action in the session/activity stream (allowed / refused / failed; refused shows the rule id), (b) **audit list** — scrollable permitted/refused/failed history for this bot, refusal rows name the rule, (c) **policy editor** — add/edit/enable/disable rules (plain declarative JSON fields, not raw JSON text for the common case), presets, and a visible "broken rule blocks startup" warning state
- The editor is a **write surface on a security policy**: validate client-side against the same schema the gateway enforces; show the gateway's startup-refusal error path in plain language (voice Register 1); never display or accept credential values

**Phase 2 scope (listed for context — NOT this handoff):**
- **Herald-style subagent telemetry** in bot mode: live tree of parent bot → spawned subagents with per-action status (spinner → ✓/✗), header counts (`N running · N done`, `N actions · elapsed`), expandable per-subagent run cards (task text, model, step checklist with live check-off, per-step duration), inline tool-call rows in the chat (`delegate_task ✓`, `message_agent done 0.2s`), "…is typing…"-style presence per bot. Reference: herald recordings 2026-09-10.
- **Computer screen streaming in chat**: the bot's Computer Cloud desktop screen embedded/streamed inside the bot chat panel (watch mode), beside the activity/verdict stream — OpenBot's "watch what it is doing" pattern. Transport decision deferred (chrome-stream / VNC / MJPEG-over-WS — reuse existing watch/takeover infra, no new substrate).

## Phased scope

- **Phase 1 (this handoff):** policy document loading + fail-closed evaluation in the Rust ACI gateway on all action routes; audit-before-act reordering with the no-act-without-record guarantee; refusal audit rows carrying rule id; startup refusal on malformed policy; audit-list read API; bot-mode UI: verdict chips, audit list, policy editor (all bot-mode-only, zero new tabs); tests incl. forced-failure ordering test; safety + operator docs updated.
- **Phase 2+ (out of scope):** the bot-mode UX cluster below (each gets its own spec when Phase 1 lands), plus per-bot policy overrides, CEL-grade expression language, take-the-wheel state machine, routines/scheduling, MCP read/write classification, coworkers-as-config, policy conformance metrics in the system card.

**Bot-mode UX cluster (Eoj additions 2026-09-10, reference: herald recordings 2026-09-10 + OpenBot) — Phase 2, spec separately:**
- **Bot avatars / identity visuals** — every bot gets a real visual identity, not a default icon: emoji, uploaded photo, or a generated companion/pet-style avatar (herald's Teknium pattern). Renders consistently everywhere the bot appears: roster, chat header, message rows, typing indicators, verdict chips, subagent tree. Extends the identity field from `bot-identity-computer` (emoji/accent) — avatar becomes a first-class identity property.
- **@mention routing** — typing `@BotName` in a session assigns that turn to that bot; the bot picks up the task in its own context. Requires mention parsing + turn routing to the right bot's durable session.
- **Multi-bot group chat** — a conversation with several bots as members (herald's "Teknium, Fixer, Rev, Synth" group): bots address each other by @handle, respond in-thread, show per-member typing presence. Requires group-thread model + inter-bot addressing + per-member presence.
- **Long-running session model** — the bot session is durable and long-lived (weeks), so the view must stay legible over time: conversation separated from activity/telemetry (actions and verdicts never pollute the dialogue), resumable timeline with old stretches compacted/summarized, clear status line (running / done / pending / waiting-on-you), per-thread notify settings. Herald's pattern: threads persist across days/weeks and reopen exactly where they left off.

## Gate checklist

- [ ] Client-facing copy? → bot-mode labels only — voice Register 1 (plain, no guarantees); refusal messages must be actionable, not alarmist
- [ ] Money-adjacent? → no billing touch
- [ ] Deploy involved? → no production deploy; local/desktop verification only
- [ ] Tier C? → security-policy adjacent — keep vault/proxy-token patterns; policy must never receive or log credential values (vault already redacts; keep it that way); policy editor is a security write surface — validate before save, fail closed

## Acceptance criteria (Phase 1)

Backend:
- [ ] Gateway loads one JSON policy document at startup; malformed JSON or broken rule → startup refuses and names the rule
- [ ] Deny rules evaluated before allow; absent/empty policy permits nothing (fail-closed), verified by test
- [ ] Rule matching covers: tool/action name, intent, bot id, actor/session id, target host/url, file path class, MCP tool class
- [ ] Every gateway action route writes its audit/receipt row **before** dispatching to the executor — proven by a forced-executor-failure test where the record still exists
- [ ] Policy refusals are audited events carrying the refusing rule id
- [ ] Existing approvals/grants flow unchanged and still enforced (policy is additive, not a bypass)
- [ ] Audit-list read API (bot-scoped, permitted/refused/failed with rule id)
- [ ] Existing suites pass: cargo `aci_` tests, ACU pytest suite (excluding known env-dependent fails documented in ComputerUse.md)

Bot-mode UI:
- [ ] Verdict chips render on actions in the bot session; refused actions show the rule id; **nothing renders when bot mode is off**
- [ ] Zero new top-level tabs/nav entries — the three surfaces live inside the existing bot session view
- [ ] Audit list shows permitted/refused/failed for the current bot, refusal rows name the rule
- [ ] Policy editor: add/edit/enable/disable rules via structured fields + presets; client-side validation matches gateway schema; a rule that would break startup is flagged before save with the plain-language reason
- [ ] No credential value is ever displayed or accepted in the editor or audit view

Docs:
- [ ] `docs/public/aci/safety.md` (or operator config doc) updated with policy semantics + ordering guarantee + where the UI lives in bot mode
- [ ] Repo ritual: worktree, steering per `AGENTS.md`, PR + ledger attestation

## Executor model tier

- Task class: client_coding_work
- Model tier: A://C
- Concrete backend: claude-sonnet-5 (per `model_route` 2026-09-10)
- Spike/design judgment if needed: A://Fe / claude-fable-5

## /goal (Phase 1 — paste-ready)

Outcome: In `~/Desktop/allternit-workspace/allternit`, ship Phase 1 of `openbot-policy-gateway`: the Rust ACI gateway loads a single admin-editable JSON action policy at startup and evaluates it fail-closed on every action route (deny before allow, missing policy permits nothing, malformed policy stops startup and names the broken rule); the gateway writes the audit/receipt row *before* dispatching any action to an executor, so no code path can act without the record existing first; and the bot session view gains three bot-mode-only surfaces — per-action verdict chips, a bot-scoped audit list, and a structured policy editor — with no new top-level tabs and nothing rendering when bot mode is off.

Constraints:
- Read and follow: `Allternit Brain/Research/specs/openbot-policy-gateway.md` (this slug), `Products/ComputerUse.md` locked D1–D3, `Research/baselines/bot-computers.md`, `surfaces/ai.allternit.com/src/lib/bots/BOT_AGENT_CONTRACT.md` (bot-mode contract)
- Port the OpenBot **design** only — no OpenBot/herald code or dependency, no Docker, no CopilotKit Intelligence signup (hard veto)
- Policy is additive to the existing taxonomy (`aci_safety.rs`) and action-hash grant flow — it must not bypass or weaken approvals
- Phase 1 rule syntax is plain declarative JSON (match → allow/deny); do NOT add a CEL interpreter unless one already exists in the dependency tree
- Rule fields: tool/action name, intent, bot id, actor/session id, target host/url, file path class, MCP tool class
- Refusals are audited events carrying the refusing rule id; credential values never enter policy documents, audit rows, or the UI (vault redaction patterns hold)
- **UI placement is binding**: all three surfaces live inside the existing bot session/chat view; zero new top-level tabs or nav entries; render nothing when bot mode is off; refusal copy in voice Register 1
- Policy editor validates client-side against the same schema the gateway enforces and flags broken rules before save
- No production deploy; local verification only
- Follow workspace `AGENTS.md` ritual (worktree, steering, PR, ledger)
- Brain updates as drafts only; no `confirm:true` anywhere

Acceptance:
- Startup refuses malformed policy and names the broken rule; absent policy permits nothing (fail-closed test)
- Deny-before-allow proven by test
- Forced-executor-failure test proves the audit row exists before the act on every action route
- Refusal audit rows carry rule id; audit-list read API returns bot-scoped permitted/refused/failed
- Bot-mode UI: verdict chips (refused shows rule id), audit list, structured policy editor with validation; nothing renders with bot mode off; no new tabs/nav
- cargo `aci_` tests + ACU pytest pass (excluding documented env-dependent fails)
- `docs/public/aci/safety.md` or operator config doc updated
- PR + ledger attestation

Non-goals:
- Entire bot-mode UX cluster (Phase 2, patterns in spec): herald-style subagent telemetry, computer screen streaming in chat, bot avatars/identity visuals, @mention routing, multi-bot group chat, long-running session model
- Per-bot policy overrides, CEL expressions, take-the-wheel state machine, routines/scheduling, MCP read/write classification, coworkers-as-config
- Monitor model work

## Open questions

- Policy document location: env-var JSON (OpenBot shape) vs file path vs SQLite row? (Recommend: file path with env override — survives restarts, diffable in ops config outside the repo.)
- Should policy verdicts feed the existing grant flow (policy-then-grant) or run parallel with both required? (Recommend: policy first, then grant — one linear gate.)
- Bot-mode policy editor: structured form fields for the common rule shapes with a raw-JSON fallback, or form-only in Phase 1? (Recommend: form fields + presets, raw JSON behind an "advanced" toggle — matches the "no CEL" constraint.)
- Verdict chip stream: reuse the existing approval SSE events (`approval.required`/`approval.resolved`) or a new policy-verdict event? (Recommend: extend the existing run-events stream — one timeline, not two.)
- Phase 2 stream transport for screen-in-chat: chrome-stream frames vs MJPEG-over-WebSocket vs VNC? (Decide at Phase 2 spec; reuse watch/takeover infra.)

## Source of truth

- Spec: `Allternit Brain/Research/specs/openbot-policy-gateway.md`
- Workspace: `~/Desktop/allternit-workspace/allternit`
- Surface: Allternit Computer Use — ACI gateway + ACU engine + Agent Hub bot-mode session view
- Tracking PR: (fill when opened)
