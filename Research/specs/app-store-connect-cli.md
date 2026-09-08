---
doc: project
updated: 2026-09-08
status: draft
---

# App-Store-Connect-CLI evaluation + iOS pipeline note

## Goal

Decide whether [rorkai/App-Store-Connect-CLI](https://github.com/rorkai/App-Store-Connect-CLI) becomes Allternit's scriptable path to App Store Connect — TestFlight uploads, build/submission status, signing/analytics — and record the verdict plus usage in `Allternit Brain/Infra/deploy-runbook.md` so the iOS pipeline has a documented automation path instead of an ad-hoc one.

## Source link(s)

- https://github.com/rorkai/App-Store-Connect-CLI

## Affected repo / surface

- `Allternit Brain/Infra/deploy-runbook.md` (the iOS App section — new "App Store Connect automation" subsection)
- `~/Desktop/allternit-workspace/allternit` (only if the verdict is "adopt": a thin wrapper script or documented command set — no changes to app code)

## Division / owner

- [Platform / Desktop+mobile surfaces](../../Divisions/INDEX.md)


## Integrate decision

- Approach: `thin_adapter` (evaluate → document; wrap CLI only if adopt)
- constraints_ok: true for Phase 1 docs/eval (ASC API key is Apple account — treat live submissions as gated; Phase 1 is evaluate + runbook only)
- paid_or_signup: true for live ASC API use (Apple developer account) — Phase 1 docs-only path keeps runtime optional
- docker_required: false
- baseline_ref: `Research/baselines/ios-release.md`

## Phased scope

- Phase 1 (the handoff): evaluate the CLI (auth model — API key vs ASC credentials, coverage of TestFlight/builds/submissions/analytics, license, maintenance state); if adoptable, install it and land a "App Store Connect automation" subsection in `deploy-runbook.md` with the working commands for the current iOS pipeline (XcodeGen project at `allternit-workspace/allternit/surfaces/allternit-mobile/ios`). If not adoptable, land the "evaluated, rejected, why" note in the same doc.
- Phase 2+: wire the CLI into a release script; screenshot/analytics pulls for `/client-report`-style reporting. Out of scope for the executor.

## Gate checklist

- [x] Client-facing copy? → must follow voice Register 1 (plain, direct, no guarantees) — see `company/voice.md` — runbook doc only, no client copy
- [ ] Money-adjacent (Stripe, invoices, pricing)? → requires explicit human approval before shipping
- [ ] Deploy involved? → preview the deploy command first; never `confirm: true` without sign-off — the CLI can submit to App Store review; submission actions are manual-only per this checklist
- [ ] Tier C scope (integrations, migrations, production automations, regulated data)? → audit first, never quote blind — see `company/offer.md` — ASC submission rights are production automation; Phase 1 is read/evaluate + docs only, no live submissions

## Acceptance criteria

- [ ] Verdict recorded: adopt or reject, with reasons, in `deploy-runbook.md`
- [ ] If adopt: CLI installed and authenticated path documented (where the API key lives — Keychain, never in the repo)
- [ ] If adopt: the documented TestFlight-upload command sequence verified against the real XcodeGen project layout
- [ ] If reject: the rejected alternative and what would change the verdict noted
- [ ] No credentials committed anywhere; no live App Store submission performed

## Executor model tier

<!-- Filled via the model_route MCP check for the executor's task class — never guessed. -->

- Task class: client_coding_work
- Model tier: A://C — everyday reasoning, coding, routine client execution
- Concrete backend: claude-sonnet-5 (`sonnet`)

## Open questions

- Does the CLI support ASC API-key auth (issuer/key-id/p8) or only Apple ID sessions? (Affects credential handling.)
- Is TestFlight upload in scope for the tool or does it still require `xcrun altool`/`notarytool`-style paths?

## Source of truth

- Workspace: `~/Desktop/allternit-workspace/allternit` (untouched repo — see `Infra/deploy-runbook.md`)
- Surface: `Allternit Brain/Infra/deploy-runbook.md`
- Tracking PR: —
