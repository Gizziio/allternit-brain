---
doc: project
updated: 2026-09-08
status: draft
---

# DayRing UX patterns for division sites

## Goal

Recreate DayRing-like narrative/exploration UX patterns for Allternit **division sites** without adopting DayRing’s product, brand, or backend.

## Source link(s)

- https://dayring-for-kids.vercel.app

## Affected repo / surface

- Allternit Brain Research queue `rq-20260908-001`
- `Research/baselines/division-sites.md`
- Harness / Websites / Infra as implied by decision `reverse_engineer`

## Division / owner

- [Platform / Surfaces](../../Divisions/INDEX.md)

## Integrate decision

- Approach: `reverse_engineer`
- constraints_ok: true
- paid_or_signup: false
- docker_required: false
- baseline_ref: `Research/baselines/division-sites.md`
- Rationale: Reverse-engineer layout/narrative/exploration patterns into division site templates; do not adopt DayRing backend or brand.

## Phased scope

- Phase 1 (the handoff): Produce a short pattern memo + Phase-1 implementation notes for one pilot division site (prefer spaces or compute): hero narrative structure, exploration/interactive section conventions, privacy-forward copy patterns mapped to Allternit voice. No DayRing code copy.
- Phase 2+: only after human approval of this named slug — out of scope until gate passes

## Gate checklist

- [x] Client-facing copy? → Register 1 if any public copy ships
- [ ] Money-adjacent? → no
- [ ] Deploy involved? → preview only; never confirm:true without sign-off
- [ ] Tier C? → audit first if integrations expand

## Acceptance criteria

- [ ] Pattern memo linked from this spec or Surfaces planning note
- [ ] Pilot site named; Phase 1 scoped to layout/components only
- [ ] No third-party DayRing dependencies; constraints_ok remains true

## Executor model tier

<!-- Filled via model_route at execute time — never guessed for spend. Pre-gate only. -->

- Task class: TBD at approval
- Model tier: TBD via `model_route`
- Concrete backend: TBD

## /goal

Outcome: Recreate DayRing-like narrative/exploration UX patterns for Allternit **division sites** without adopting DayRing’s product, brand, or backend.

Constraints:
- Hard vetoes: no paid API/SaaS, no account signup, no Docker on the core path
- decision=reverse_engineer; do not widen to execute/ao without named-slug approval
- No confirm:true brain apply

Acceptance:
- Pattern memo linked from this spec or Surfaces planning note
- Pilot site named; Phase 1 scoped to layout/components only
- No third-party DayRing dependencies; constraints_ok remains true

Non-goals:
- Spawning ao / paid executors
- Approving this spec from the sweep itself

## Open questions

- Any license/Docker surprise on deeper read of upstream?
- Pilot surface / skill folder name finalization

## Source of truth

- Queue: `Research/queue.json` → `rq-20260908-001`
- Spec: `Research/specs/division-sites-dayring.md`
- Drafts: `Research/drafts/division-sites-dayring--{grok,kimi,CHERRY}.md`
