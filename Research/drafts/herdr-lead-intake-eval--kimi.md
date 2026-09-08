---
doc: project
updated: 2026-09-08
status: draft
harness_pass: kimi
author_note: executor dual-pass (kimi-style); headless CLI not used for this batch — labeled honestly
---

# Draft (kimi): herdr-lead-intake-eval

## Offer summary
Herdr plugin (aigora.lantern) illuminating who needs you across a herd of agents. Requires Herdr 0.7.5+; opens chat tab driving herdr CLI.

## License / deps
- License: MIT (plugin); depends on Herdr host app
- Deps: see approach — prefer local / no-signup / no-Docker

## Fit vs baseline
- baseline_ref: `Research/baselines/lead-intake.md`
- Kimi-style pass emphasizes checkable acceptance and baseline delta clarity.

## Integrate decision (proposed)
- decision: `watch`
- paid_or_signup: false
- docker_required: false
- constraints_ok: true
- Rationale: Do NOT replace lead-intake-agent with Herdr. Watch: extract UX ideas (field status / who-needs-you) only. Adopting Herdr as runtime would add a parallel orchestrator and likely product/account surface — veto-adjacent. Keep bookings-based lead-intake; optional later reverse_engineer of status overlay without Herdr.

## Spec outline
- Goal: land a Phase-1 handoff that implements the decision without crossing the human money gate
- Non-goals: ao/execute, confirm:true, Herdr/DayRing product adoption where decision is watch/reverse_engineer patterns only
