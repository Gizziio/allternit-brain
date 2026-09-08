---
doc: project
updated: 2026-09-08
status: draft
---

# agent-browser as local complement to browser-act

## Goal

Document a thin Allternit adapter/skill over https://github.com/vercel-labs/agent-browser as the no-signup local browser automation path beside browser-act.

## Source link(s)

- https://github.com/vercel-labs/agent-browser

## Affected repo / surface

- Divisions/Compute/BROWSER_CAPABILITY.md
- Optional harness skill
- Queue rq-20260908-012

## Division / owner

- Compute

## Integrate decision

- Approach: thin_adapter
- constraints_ok: true
- paid_or_signup: false
- docker_required: false
- baseline_ref: Research/baselines/browser-automation.md
- Rationale: Complements browser-act; prefer agent-browser for no-signup local automation.

## Phased scope

- Phase 1: Install agent-browser on Joe Mac; comparison matrix vs browser-act in BROWSER_CAPABILITY.md; optional thin skill. No Docker. No BrowserAct account for this path.
- Phase 2+: AllternitOS Worker mapping — out of scope until approved.

## Gate checklist

- [x] Client-facing copy? no
- [ ] Money-adjacent? no
- [ ] Deploy involved? no
- [ ] Tier C? keep confirmation gates for navigate/submit

## Acceptance criteria

- [ ] agent-browser installed; help works
- [ ] Comparison matrix in BROWSER_CAPABILITY.md
- [ ] Decision recorded
- [ ] No ao spawn; stop at human gate

## Executor model tier

- TBD via model_route at approval

## /goal

Outcome: Local agent-browser documented as no-signup complement to browser-act.

Constraints: No Docker; no paid/signup; no ao; no confirm:true.

Non-goals: Replacing browser-act stealth; execute without named-slug approval.

## Source of truth

- Research/specs/agent-browser-eval.md
