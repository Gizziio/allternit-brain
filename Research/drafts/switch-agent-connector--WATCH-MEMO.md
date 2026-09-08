---
doc: project
updated: 2026-09-08
status: draft
---

# Switch team-chat agent connector

## Goal

Record a clear **watch** verdict for Switch team-chat agent connector against the Allternit baseline, including what would change the verdict, without adopting the upstream runtime.

## Source link(s)

- https://github.com/sandbox-quantum/switch

## Affected repo / surface

- Allternit Brain Research queue `rq-20260908-009`
- `Research/baselines/agent-connectors.md`
- Harness / Websites / Infra as implied by decision `watch`

## Division / owner

- [Platform / Surfaces](../../Divisions/INDEX.md)

## Integrate decision

- Approach: `watch`
- constraints_ok: true
- paid_or_signup: false
- docker_required: false
- baseline_ref: `Research/baselines/agent-connectors.md`
- Rationale: High-leverage watch with Phase-1 eval spec: license + Docker/signup audit first. If clean MIT/Apache and no Docker/signup on core path → reconsider fork_reskin/thin_adapter. Until audit clears, stay watch (spec is evaluation-only, not execute build).

## Phased scope

- Phase 1 (the handoff): Write the watch rationale into Research knowledge + this spec; update INDEX if needed; do **not** install Herdr/Switch/etc. Capture license/Docker/signup audit notes. Stop at human gate.
- Phase 2+: only after human approval of this named slug — out of scope until gate passes

## Gate checklist

- [x] Client-facing copy? → Register 1 if any public copy ships
- [ ] Money-adjacent? → no
- [ ] Deploy involved? → preview only; never confirm:true without sign-off
- [ ] Tier C? → audit first if integrations expand

## Acceptance criteria

- [ ] Queue item `rq-20260908-009` has decision=watch, baseline_ref set, constraint flags set
- [ ] Watch rationale names what would flip to build (license clean + no Docker/signup + clear gap)
- [ ] No upstream runtime installed; no ao spawn

## Executor model tier

<!-- Filled via model_route at execute time — never guessed for spend. Pre-gate only. -->

- Task class: TBD at approval
- Model tier: TBD via `model_route`
- Concrete backend: TBD

## /goal

Outcome: Record a clear **watch** verdict for Switch team-chat agent connector against the Allternit baseline, including what would change the verdict, without adopting the upstream runtime.

Constraints:
- Hard vetoes: no paid API/SaaS, no account signup, no Docker on the core path
- decision=watch; do not widen to execute/ao without named-slug approval
- No confirm:true brain apply

Acceptance:
- Queue item `rq-20260908-009` has decision=watch, baseline_ref set, constraint flags set
- Watch rationale names what would flip to build (license clean + no Docker/signup + clear gap)
- No upstream runtime installed; no ao spawn

Non-goals:
- Spawning ao / paid executors
- Approving this spec from the sweep itself

## Open questions

- Any license/Docker surprise on deeper read of upstream?
- Pilot surface / skill folder name finalization

## Source of truth

- Queue: `Research/queue.json` → `rq-20260908-009`
- Spec: `Research/specs/switch-agent-connector.md`
- Drafts: `Research/drafts/switch-agent-connector--{grok,kimi,CHERRY}.md`
