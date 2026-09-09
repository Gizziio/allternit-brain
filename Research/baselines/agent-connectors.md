---
doc: project
updated: 2026-09-08
status: active
---

# Baseline: agent-connectors

## What we already have
- Multi-harness agents (Claude / Grok / Kimi / Cursor / Codex) via harness-sync
- No first-party Slack/Teams/Discord bridge product for Allternit agents yet
- Grok Bot / box agents exist separately from team chat connectors

## Gaps
- Team chat ↔ coding agent connector not owned in-tree
- Need self-hostable, no-Docker-preferred path if adopting

## Related products / paths
- `Ops/harness-sync.js`, harness skills
- Research INDEX Switch row

## Delta log
- 2026-09-08 — rq-20260908-009 / switch: open-source Slack/Teams/Discord agent connector candidate
