# Allternit Brain

The agent-readable operator's manual for Allternit LLC. This sits **beside** `Allternit LLC/` (never wraps it) — that folder stays the authoritative filing cabinet of real-world records (contracts, financials, formation docs). This brain holds distilled operating knowledge, an index with pointers into that filing cabinet, and hot per-client state. Read this file first; follow the pointers for anything that needs the source.

## Company (start here)

- [business.md](company/business.md) — what Allternit sells, entity structure, the two-tier revenue model, brand architecture, hard operating principles.
- [customer.md](company/customer.md) — ICP, pains, objections, buying triggers, decision criteria.
- [offer.md](company/offer.md) — pricing logic, tier system, bundles, proof, claims to avoid.
- [voice.md](company/voice.md) — the two speaking registers, phrase bank, what never to sound like.

## Infra (how things actually run)

- [infra/stripe.md](infra/stripe.md) — account state, keys, invoicing, the booking-automation pipeline. **Has an open blocker — check `charges_enabled` before assuming checkout works.**
- [infra/cloudflare.md](infra/cloudflare.md) — account, zone, Pages project names, DNS/email routing.
- [infra/deploy-runbook.md](infra/deploy-runbook.md) — Electron desktop + iOS build pipelines and toolchain pins (in the untouched `allternit-workspace` repo).
- [infra/model-routing.md](infra/model-routing.md) — the A:// tier policy, executable via `allternit-ops`'s `model_route` tool. Only applies to spawned subagents/autonomous agents, not the running interactive session.
- [infra/site-monitoring.md](infra/site-monitoring.md) — the two independent monitoring legs (cloud/Claude + local/launchd, deliberately vendor-redundant), the launchd-vs-Desktop-TCC gotcha, and why kimi+local-model wasn't used for this specific leg.

## Clients (hot state — update every cycle)

- [clients/swyft-market.md](clients/swyft-market.md) — first engagement, SOW-2026-001 (~$1.5K fixed scope, completing; a normal client, not a strategic pillar — per Eoj 2026-07-25).

## The living tracker

- `Allternit LLC/08 Revenue Operations/ALLTERNIT_ACTION_PACK.md` — the **living working document** for the whole business plan (per Eoj, 2026-07-25): document inventory, master checklist with STATUS column, send-ready copy-paste blocks, dependencies. Update the checklist there first (with dated progress-log lines); `ALLTERNIT_FULL_STACK_OVERVIEW.html/.pdf` section 12 mirrors it and gets re-rendered after edits (exact headless-Chrome command is in the action pack's header) — never edit the PDF/HTML snapshot directly.

## Session handoff (how this workflow runs, for any agent picking up cold)

The full operating loop, built 2026-07-24/26: read `CLAUDE.md` (tree rules) → this BRAIN.md → `company/business.md` (identity anchor, canonical platform state, owner attributes, address facts) → the Action Pack (what's next, what's done) → `Allternit LLC/ALLTERNIT_FULL_STACK_BUSINESS_OUTLINE.md` (plan of record: layers, entities, products, decisions queue). Key standing facts a fresh agent must not re-litigate: PBC is the parent (LLC becomes subsidiary); EIN 42-3788518; S-corp effective 2026-07-09; Stripe approved; home address is the real operating address (Rice St is a virtual mailbox, marketing only, never on government filings); Swyft is a normal first client, not a pillar; the product is "the Allternit platform" (surfaces: Home/Code/ACI — Allternit Computer Interface — plus Design app; engine: agent workspace + gizzi-code on allternit-api + SDK); Allternit OS is the future on-chip play; repo `docs/` trees are partially archived — Eoj's word + observed app state overrides them. Sensitive-context docs (8(a) deferral reasons, disclosure skeleton) live in `08 Revenue Operations/` — handle with the same candor they're written with: full disclosure on every government form, always.

## Delegation (the self-improving loop)

- [delegation-runbook.md](delegation-runbook.md) — what to inline into agent-orchestrator task specs when delegating Allternit business work to an external CLI agent, and how learned facts flow back into this brain.

## Strategy (pointers only, not duplicated)

- [strategy/INDEX.md](strategy/INDEX.md) — entity strategy, deep scope/roadmap, brand naming, Minds mythology, consolidated future-development docs.

## Source of truth pointers (never duplicate these — read in place)

- Service catalog: `Allternit LLC/03 Product And Service Scope/ALLTERNIT_FULL_AI_ASSISTED_SERVICE_CATALOG.md`
- Stripe product/price table: `Allternit LLC/08 Revenue Operations/STRIPE_CATALOG.md`
- New-client kickoff playbook: `Allternit LLC/06 Client Ops And Contracts/00_New_Client_Kickoff_Playbook.md`
- AI-native company integration plan (this whole initiative's plan of record): `Allternit LLC/AI_NATIVE_COMPANY_PLAN.md`

## How to add to this brain

- New distilled knowledge (a belief, a rule, a fact every agent should start from) → `company/`.
- New infra fact (a key location, an account id, a runbook step) → `infra/`.
- New client → `clients/<name>.md`, hot state only; contracts/SOWs/time-logs stay in `Allternit LLC/06 Client Ops And Contracts/<Client>/`.
- Long-form planning that isn't day-to-day operating knowledge → a pointer in `strategy/INDEX.md`, not a new brain doc.
