---
doc: infra/model-routing
updated: 2026-07-21
status: v1 policy, one tier deliberately unbacked
---

# Model routing

Executable version of Allternit's A:// tier strategy lives at `Allternit Brain/Ops/model-routing.json`, queryable via the `model_route` MCP tool. Source strategy doc: `strategy/INDEX.md` → the entity/naming docs' A://H/C/Fe/Boson/Hadron competitor-tier mapping.

**Important scope limit:** this only fires for (a) subagents explicitly spawned via the Agent tool on Allternit's behalf, and (b) Phase 6 autonomous agents at spawn time. It does **not** and cannot change which model an already-running interactive Claude Code session uses — a skill is a prompt, not a model switch. Don't expect `/invoice` or `/quote` to "route" themselves; they run on whatever model the human's session is already on.

**Also distinct from `agent-orchestrator`'s vendor choice.** `agent-orchestrator` picks which *external CLI vendor* (kimi/codex/agy/claude) runs as executor — a different axis entirely. This policy only decides which *Claude model* backs an in-session Agent-tool subagent (`agent_tool_alias`: sonnet/opus/haiku/fable). If the chosen executor vendor is Claude, this policy's alias is relevant when spawning it; for kimi/codex/agy it isn't — those vendors have their own model.

## v1 mapping

| Tier | Concrete backend | Use for |
|---|---|---|
| A://H | Haiku 4.5 | classification, simple drafts |
| A://C | Sonnet 5 | routine client coding/execution, quotes that match a known catalog line |
| A://Fe | Fable 5 | architecture/system-design judgment, novel pricing/scoping calls |
| A://Boson | Fable 5 (same backend as Fe, for now) | creative/long-form, Register 2 voice work |
| A://Hadron | **none — deliberately unbacked** | guardrail/safety checks — flag, don't silently downgrade to another tier |

Re-check the A://Fe/Boson → Fable 5 pairing if the available model lineup changes; the policy file itself has a note explaining why Fable 5 was picked over Opus.

Related: [[../delegation-runbook.md]] for how this interacts with agent-orchestrator delegations.
