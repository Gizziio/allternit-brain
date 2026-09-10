---
doc: project
updated: 2026-09-10
status: draft
---

# openbot-policy-gateway — Declarative Fail-Closed Policy Layer + Audit-Before-Act

**Research origin:** `rq-20260910-001` (CopilotKit OpenBot). Of the six port candidates identified, this spec covers **#1 (declarative policy layer)** and **#2 (audit-before-act ordering)** — they live in the same gateway code path and must ship together. #3 (take-the-wheel state machine), #4 (routines), #5 (MCP read/write classification), #6 (coworkers-as-config) are separate follow-up specs.

Companion reads:
- [`Products/ComputerUse.md`](../../Products/ComputerUse.md) — control plane, locked D1–D3 ("we port designs, not code"; safety is the product)
- [`Research/baselines/bot-computers.md`](../baselines/bot-computers.md) — what we already have, gap list vs OpenBot
- [`Research/specs/bot-identity-computer.md`](bot-identity-computer.md) — sibling spec (bot + persistent computer)
- [`Research/INDEX.md`](../INDEX.md) — OpenBot watchlist row

## Goal

Allternit Computer Use gains the two governance properties OpenBot has and we lack: (1) a **declarative, admin-editable action policy** evaluated fail-closed on every gateway call — deny before allow, missing policy permits nothing, a broken rule refuses rather than opens; and (2) an **audit-before-act ordering guarantee** — the gateway writes the audit/receipt row *before* the action executes, so no code path can act without the record already existing. Today we have a risky-action taxonomy (`aci_safety.rs`), action-hash-bound grants, and an EventLedger fed from execution paths — but no rule layer a human can edit, and no proven ordering.

## Source link(s)

- https://github.com/CopilotKit/OpenBot (MIT) — reference for CEL-policy semantics and gateway ordering ("The gateway is the only way in… There is no path that acts without the record existing first"; "Deny is evaluated before allow, a missing policy permits nothing, and a broken rule refuses rather than opens")

## Affected repo / surface

- `~/Desktop/allternit-workspace/allternit`
  - Rust ACI gateway (`/api/aci/*` routes, `aci_safety.rs` taxonomy classifier) — policy evaluation point
  - Approvals/grants path (action-hash-bound single-use grants + receipts) — policy outcome feeds grant checks, does not replace them
  - EventLedger / runs.sqlite3 + Rust receipts JSONL — audit-before-act ordering
  - ACU engine (Python planning loop) — consume gateway verdicts; no separate policy engine Python-side in Phase 1
  - Docs: `docs/public/aci/safety.md` (system card) + operator config docs

## Division / owner

- [Platform / Computer Use](../../Divisions/INDEX.md) — ACI gateway + ACU engine

## Integrate decision

- Approach: `reverse_engineer` — port the policy/ordering **design** into our Rust gateway; no OpenBot code, runtime, or dependency adopted
- constraints_ok: true (on this path)
- paid_or_signup: false (no CopilotKit Intelligence, no third-party account)
- docker_required: false (policy lives in the existing Rust gateway; Docker-free per Joe policy)
- baseline_ref: `Research/baselines/bot-computers.md`
- Rationale: OpenBot's own runtime is vetoed twice (Docker Compose required; CopilotKit Intelligence account required), so fork/vendor is out. The value is the governance formalism, which maps cleanly onto our existing taxonomy + grants + ledger. Consistent with ComputerUse.md D3.
- Veto note: adopting OpenBot as a runtime or dependency would flip paid_or_signup and docker_required to true and fail the hard vetoes — do not do it.

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

## Phased scope

- **Phase 1 (this handoff):** policy document loading + fail-closed evaluation in the Rust ACI gateway on all action routes; audit-before-act reordering with the no-act-without-record guarantee; refusal audit rows carrying rule id; startup refusal on malformed policy; tests incl. forced-failure ordering test; safety docs updated.
- **Phase 2+ (out of scope):** admin UI for rule editing (OpenBot's `/admin/boundaries` equivalent), per-bot policy overrides, CEL-grade expression language, take-the-wheel state machine, routines, MCP read/write classification, policy conformance metrics in the system card.

## Gate checklist

- [ ] Client-facing copy? → no (admin/operator JSON + internal docs; if any string ships, voice Register 1)
- [ ] Money-adjacent? → no billing touch
- [ ] Deploy involved? → no production deploy; local/desktop verification only
- [ ] Tier C? → security-policy adjacent — keep vault/proxy-token patterns; policy must never receive or log credential values (vault already redacts; keep it that way)

## Acceptance criteria (Phase 1)

- [ ] Gateway loads one JSON policy document at startup; malformed JSON or broken rule → startup refuses and names the rule
- [ ] Deny rules evaluated before allow; absent/empty policy permits nothing (fail-closed), verified by test
- [ ] Rule matching covers: tool/action name, intent, bot id, actor/session id, target host/url, file path class, MCP tool class
- [ ] Every gateway action route writes its audit/receipt row **before** dispatching to the executor — proven by a forced-executor-failure test where the record still exists
- [ ] Policy refusals are audited events carrying the refusing rule id
- [ ] Existing approvals/grants flow unchanged and still enforced (policy is additive, not a bypass)
- [ ] Existing suites pass: cargo `aci_` tests, ACU pytest suite (excluding known env-dependent fails documented in ComputerUse.md)
- [ ] `docs/public/aci/safety.md` (or operator config doc) updated with policy semantics + ordering guarantee
- [ ] Repo ritual: worktree, steering per `AGENTS.md`, PR + ledger attestation

## Executor model tier

- Task class: client_coding_work
- Model tier: A://C
- Concrete backend: claude-sonnet-5 (per `model_route` 2026-09-10)
- Spike/design judgment if needed: A://Fe / claude-fable-5

## /goal (Phase 1 — paste-ready)

Outcome: In `~/Desktop/allternit-workspace/allternit`, ship Phase 1 of `openbot-policy-gateway`: the Rust ACI gateway loads a single admin-editable JSON action policy at startup and evaluates it fail-closed on every action route (deny before allow, missing policy permits nothing, malformed policy stops startup and names the broken rule), and the gateway writes the audit/receipt row *before* dispatching any action to an executor, so no code path can act without the record existing first.

Constraints:
- Read and follow: `Allternit Brain/Research/specs/openbot-policy-gateway.md` (this slug), `Products/ComputerUse.md` locked D1–D3, `Research/baselines/bot-computers.md`
- Port the OpenBot **design** only — no OpenBot code, dependency, Docker, or CopilotKit Intelligence signup (hard veto)
- Policy is additive to the existing taxonomy (`aci_safety.rs`) and action-hash grant flow — it must not bypass or weaken approvals
- Phase 1 rule syntax is plain declarative JSON (match → allow/deny); do NOT add a CEL interpreter unless one already exists in the dependency tree
- Rule fields: tool/action name, intent, bot id, actor/session id, target host/url, file path class, MCP tool class
- Refusals are audited events carrying the refusing rule id; credential values never enter policy documents or audit rows (vault redaction patterns hold)
- No production deploy; local verification only
- Follow workspace `AGENTS.md` ritual (worktree, steering, PR, ledger)
- Brain updates as drafts only; no `confirm:true` anywhere

Acceptance:
- Startup refuses malformed policy and names the broken rule; absent policy permits nothing (fail-closed test)
- Deny-before-allow proven by test
- Forced-executor-failure test proves the audit row exists before the act on every action route
- Refusal audit rows carry rule id
- cargo `aci_` tests + ACU pytest pass (excluding documented env-dependent fails)
- `docs/public/aci/safety.md` or operator config doc updated
- PR + ledger attestation

Non-goals:
- Admin UI for rule editing, per-bot overrides, CEL expressions (Phase 2)
- Take-the-wheel state machine, routines/scheduling, MCP read/write classification, coworkers-as-config (separate specs)
- Monitor model work

## Open questions

- Policy document location: env-var JSON (OpenBot shape) vs file path vs SQLite row? (Recommend: file path with env override — survives restarts, diffable in git-ignored ops config.)
- Should policy verdicts feed the existing grant flow (policy-then-grant) or run parallel with both required? (Recommend: policy first, then grant — one linear gate.)
- Performance: per-action rule evaluation cost on the hot path — measure, but a flat JSON rule list should be negligible next to executor latency.

## Source of truth

- Spec: `Allternit Brain/Research/specs/openbot-policy-gateway.md`
- Workspace: `~/Desktop/allternit-workspace/allternit`
- Surface: Allternit Computer Use — ACI gateway + ACU engine
- Tracking PR: (fill when opened)
