---
doc: project
updated: 2026-09-08
status: draft
harness_pass: grok
author_note: executor dual-pass (grok-style); headless CLI not used for this batch — labeled honestly
---

# Draft (grok): switch-agent-connector

## Offer summary
Open-source self-hostable connector: any AI agent ↔ Slack / Teams / Discord.

## License / deps
- License: NOASSERTION on GitHub API — verify LICENSE before any fork
- Deps: see approach — prefer local / no-signup / no-Docker

## Fit vs baseline
- baseline_ref: `Research/baselines/agent-connectors.md`
- Grok-style pass emphasizes Allternit-owned path and hard veto scan.

## Integrate decision (proposed)
- decision: `watch`
- paid_or_signup: false
- docker_required: false
- constraints_ok: true
- Rationale: High-leverage watch with Phase-1 eval spec: license + Docker/signup audit first. If clean MIT/Apache and no Docker/signup on core path → reconsider fork_reskin/thin_adapter. Until audit clears, stay watch (spec is evaluation-only, not execute build).

## Spec outline
- Goal: land a Phase-1 handoff that implements the decision without crossing the human money gate
- Non-goals: ao/execute, confirm:true, Herdr/DayRing product adoption where decision is watch/reverse_engineer patterns only
