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

## Clients (hot state — update every cycle)

- [clients/swyft-market.md](clients/swyft-market.md) — reference/first engagement, SOW-2026-001.

## Strategy (pointers only, not duplicated)

- [strategy/INDEX.md](strategy/INDEX.md) — entity strategy, deep scope/roadmap, brand naming, Minds mythology, consolidated future-development docs.

## Source of truth pointers (never duplicate these — read in place)

- Service catalog: `Allternit LLC/03_Product_and_Service_Scope/ALLTERNIT_FULL_AI_ASSISTED_SERVICE_CATALOG.md`
- Stripe product/price table: `Allternit LLC/08_Revenue_Operations/STRIPE_CATALOG.md`
- New-client kickoff playbook: `Allternit LLC/06_Client_Ops_and_Contracts/00_New_Client_Kickoff_Playbook.md`
- AI-native company integration plan (this whole initiative's plan of record): `Allternit LLC/AI_NATIVE_COMPANY_PLAN.md`

## How to add to this brain

- New distilled knowledge (a belief, a rule, a fact every agent should start from) → `company/`.
- New infra fact (a key location, an account id, a runbook step) → `infra/`.
- New client → `clients/<name>.md`, hot state only; contracts/SOWs/time-logs stay in `Allternit LLC/06_Client_Ops_and_Contracts/<Client>/`.
- Long-form planning that isn't day-to-day operating knowledge → a pointer in `strategy/INDEX.md`, not a new brain doc.
