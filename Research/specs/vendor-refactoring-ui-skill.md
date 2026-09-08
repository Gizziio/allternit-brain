---
doc: project
updated: 2026-09-08
status: draft
---

# Vendor refactoring-ui skill

## Goal

Vendor `vendor-refactoring-ui-skill` into the Allternit harness skills pack (SoT + harness-sync) as a docs/skill-only path with zero paid/signup/Docker runtime dependency.

## Source link(s)

- https://github.com/s0xDk/refactoring-ui-skill

## Affected repo / surface

- Allternit Brain Research queue `rq-20260908-002`
- `Research/baselines/ui-skills.md`
- Harness / Websites / Infra as implied by decision `vendor_skill`

## Division / owner

- [Platform / Surfaces](../../Divisions/INDEX.md)

## Integrate decision

- Approach: `vendor_skill`
- constraints_ok: true
- paid_or_signup: false
- docker_required: false
- baseline_ref: `Research/baselines/ui-skills.md`
- Rationale: Vendor as harness skill (folder name refactoring-ui); sync via harness-sync. Docs/skill only — no runtime SaaS.

## Phased scope

- Phase 1 (the handoff): Clone/copy skill into SoT skills dir with correct folder name; run `node Ops/harness-sync.js sync`; verify skill appears on claude+grok+kimi; document host prerequisites (e.g. ffmpeg). No executor money path beyond skill files.
- Phase 2+: only after human approval of this named slug — out of scope until gate passes

## Gate checklist

- [x] Client-facing copy? → Register 1 if any public copy ships
- [ ] Money-adjacent? → no
- [ ] Deploy involved? → preview only; never confirm:true without sign-off
- [ ] Tier C? → audit first if integrations expand

## Acceptance criteria

- [ ] Skill present under `/Users/joe/Desktop/Allternit/.claude/skills/<name>/SKILL.md`
- [ ] harness-sync redistributes to grok/kimi/claude
- [ ] README note: local prereqs only; paid_or_signup=false docker_required=false

## Executor model tier

<!-- Filled via model_route at execute time — never guessed for spend. Pre-gate only. -->

- Task class: TBD at approval
- Model tier: TBD via `model_route`
- Concrete backend: TBD

## /goal

Outcome: Vendor `vendor-refactoring-ui-skill` into the Allternit harness skills pack (SoT + harness-sync) as a docs/skill-only path with zero paid/signup/Docker runtime dependency.

Constraints:
- Hard vetoes: no paid API/SaaS, no account signup, no Docker on the core path
- decision=vendor_skill; do not widen to execute/ao without named-slug approval
- No confirm:true brain apply

Acceptance:
- Skill present under `/Users/joe/Desktop/Allternit/.claude/skills/<name>/SKILL.md`
- harness-sync redistributes to grok/kimi/claude
- README note: local prereqs only; paid_or_signup=false docker_required=false

Non-goals:
- Spawning ao / paid executors
- Approving this spec from the sweep itself

## Open questions

- Any license/Docker surprise on deeper read of upstream?
- Pilot surface / skill folder name finalization

## Source of truth

- Queue: `Research/queue.json` → `rq-20260908-002`
- Spec: `Research/specs/vendor-refactoring-ui-skill.md`
- Drafts: `Research/drafts/vendor-refactoring-ui-skill--{grok,kimi,CHERRY}.md`
