---
doc: project
updated: 2026-09-10
status: active
---

# Baseline: bot-computers

Source of truth for the area: [Products/ComputerUse.md](../../Products/ComputerUse.md) (control plane, locked decisions D1–D3) + [Research/specs/bot-identity-computer.md](../specs/bot-identity-computer.md) (atomic Create Bot, Phases 1–2 landed via PRs #190/#195).

## What we already have

- **Atomic Bot create**: Identity + Instructions + Tools + persistent Computer Cloud desktop bound via `bot_id` (one submit; bots rail shows live computer status; reopen reuses same computer)
- **Environments**: Computer Cloud on Incus/Tart (locked D1 — no Firecracker/Orgo), warm fail-closed VM pool in front of `/sandbox/execute`
- **Safety**: risky-action taxonomy (`aci_safety.rs`), product-scoped approvals (server-side, action-hash-bound single-use expiring grants + receipts), unified approval status route, heuristic monitor hook (VLM classifier pending)
- **Audit**: runs.sqlite3 + canonical EventLedger fed from all 4 paths; Rust receipts JSONL + run-buffer snapshots (restart-verified)
- **Secrets**: credential vault (#177) with Python-side `sandbox_env` consumption (#187), leak-proofed + canary-tested
- **Watch/takeover**: UX exists (Phase 2 fixed `creating`-status crash in watch/takeover)
- **Record & teach**: record → deterministic replay → teach → run-as-skill loop closed (#138/#142/#161)
- **Skills**: personal/deployment skill system across harnesses (P4 harness-sync)

## Gaps (vs OpenBot, rq-20260910-001)

- **No declarative policy language**: OpenBot evaluates CEL rules (fail-closed, deny-before-allow, inspects tool/intent/page/file/mcp fields) before every action; we have taxonomy + per-action grants but no admin-editable rule layer
- **Audit ordering not guaranteed**: OpenBot writes the audit row *before* the action executes ("no path acts without the record existing first"); our ledger is fed from execution paths — ordering guarantee unverified
- **Handoff is UX, not a state machine**: OpenBot records `help_requested` / `control_taken` / `control_released` and refuses bot actions while a human drives; our watch/takeover lacks that formal event contract
- **No routines**: OpenBot bots run on schedules (15-min floor, 20-routine cap, 10-failure auto-off); we have no scheduled bot runs in-product
- **MCP governance**: OpenBot classifies catalogue tools read/write (unknown = write, advertised-unnamed = read); our connector catalog has no equivalent classification
- **Coworkers-as-config**: OpenBot ships example coworkers as `agents.yaml` (config, not code); our bot templates are code-side

## Delta log

- 2026-09-10 — rq-20260910-001 / CopilotKit OpenBot: baseline written. Decision **reverse_engineer** (MIT; adopting the runtime vetoed — Docker Compose + CopilotKit Intelligence account required). Port designs only, consistent with ComputerUse.md D3 ("we port designs, not code"). Port shortlist recorded on the queue item.
