---
doc: project
updated: 2026-09-08
status: draft
harness_pass: kimi
author_note: executor dual-pass (kimi-style); headless CLI not used for this batch — labeled honestly
---

# Draft (kimi): vendor-ffmpeg-skill

## Offer summary
Local ffmpeg agent skill (npx ffmpeg-skill): 28 tools, MCP, probe→edit→verify workflow. Requires ffmpeg+python3 on PATH. Offline, no API keys.

## License / deps
- License: MIT
- Deps: see approach — prefer local / no-signup / no-Docker

## Fit vs baseline
- baseline_ref: `Research/baselines/media-skills.md`
- Kimi-style pass emphasizes checkable acceptance and baseline delta clarity.

## Integrate decision (proposed)
- decision: `vendor_skill`
- paid_or_signup: false
- docker_required: false
- constraints_ok: true
- Rationale: Vendor skill next to gpt-image-2-style-library. Local runtime only — no Docker, no cloud. Document ffmpeg host prerequisite.

## Spec outline
- Goal: land a Phase-1 handoff that implements the decision without crossing the human money gate
- Non-goals: ao/execute, confirm:true, Herdr/DayRing product adoption where decision is watch/reverse_engineer patterns only
