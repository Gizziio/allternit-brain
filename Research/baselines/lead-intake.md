---
doc: project
updated: 2026-09-08
status: active
---

# Baseline: lead-intake

## What we already have
- `lead-intake-agent` skill: read-only D1 bookings from `services.allternit.com`, draft follow-ups, never contact customer
- Live channel: Stripe checkout → Cloudflare Worker → D1 `bookings`
- No general inbound-email watcher (Gmail OAuth not configured)

## Gaps
- No multi-agent “who needs you / field status” overlay like Herdr Lantern
- Skill not scheduled; narrow to bookings table only
- Herdr ecosystem would add a second agent-orchestration surface overlapping ao / harness

## Related products / paths
- `.claude/skills/lead-intake-agent/SKILL.md`
- `services.allternit.com` worker + D1
- Research INDEX herdr-lantern / herdr v0.9.0 rows

## Delta log
- 2026-09-08 — rq-20260908-005 / herdr-lantern: evaluate merge vs replace vs watch against lead-intake-agent (Herdr plugin path)
