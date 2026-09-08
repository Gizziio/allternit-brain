---
doc: project
updated: 2026-09-08
status: draft
harness_pass: kimi
author_note: executor dual-pass (kimi-style); headless CLI not used for this batch — labeled honestly
---

# Draft (kimi): vendor-refactoring-ui-skill

## Offer summary
Claude Code skill encoding Refactoring UI mechanical rules (spacing/type/color/shadow scales, hierarchy, depth). Ships SKILL.md + references + tokens.css. Does not include the book text.

## License / deps
- License: MIT
- Deps: see approach — prefer local / no-signup / no-Docker

## Fit vs baseline
- baseline_ref: `Research/baselines/ui-skills.md`
- Kimi-style pass emphasizes checkable acceptance and baseline delta clarity.

## Integrate decision (proposed)
- decision: `vendor_skill`
- paid_or_signup: false
- docker_required: false
- constraints_ok: true
- Rationale: Vendor as harness skill (folder name refactoring-ui); sync via harness-sync. Docs/skill only — no runtime SaaS.

## Spec outline
- Goal: land a Phase-1 handoff that implements the decision without crossing the human money gate
- Non-goals: ao/execute, confirm:true, Herdr/DayRing product adoption where decision is watch/reverse_engineer patterns only
