---
doc: delegation-runbook
updated: 2026-07-21
status: how to run the self-improving loop through agent-orchestrator delegations
---

# Delegating Allternit business work to an external CLI agent

Eoj's global instruction: delegating to another CLI agent (kimi/codex/agy/claude) always goes through the `agent-orchestrator` skill, never inline. That skill's Phase 1 is explicit: the executor **may not read outside its own workspace** — it never sees `~/Desktop/Allternit/CLAUDE.md`, `Allternit Brain/`, or this file directly. So the harness has to travel *inside* the task spec doc the orchestrator writes, and lessons have to travel back out through the required NOTES file. This doc is the concrete protocol for both directions, specific to Allternit business-ops delegation (not a change to `agent-orchestrator` itself, which stays general-purpose).

## Outbound: what to inline into the task spec

When the delegated task touches Allternit business work (client deliverables, site changes, anything client-facing), the orchestrator (you, scoping the work per `agent-orchestrator`'s Phase 1) copies the relevant excerpts — not a link, an actual inline copy, since the executor can't fetch it — into the task spec doc:

1. **Always include**, verbatim, from `Allternit/CLAUDE.md`: the "Hard rules" and "Review gates" sections. These are short and apply to any client-facing or money-adjacent work regardless of task type.
2. **Include if relevant to the task:**
   - Building/editing anything client-facing → `company/voice.md`'s Register 1 phrase bank and "never sound like" list.
   - Anything touching pricing, scope, or a quote → `company/offer.md`'s tier system and claims-to-avoid.
   - Client-specific work → the relevant `clients/<name>.md` digest.
   - A deploy → the specific project row from `infra/cloudflare.md`'s table (not the whole file).
3. **Never inline:** Stripe keys, Keychain commands, or anything from `infra/stripe.md` beyond the fact that money actions require human approval — an external executor should never be handed a path to a live payment credential.

## Inbound: closing the loop

Add one required section to every Allternit-related task spec's deliverable sentinel (on top of `agent-orchestrator`'s standard `status/files_changed/deviations/remaining` frontmatter):

> Also include a `brain_updates:` list in the NOTES.md frontmatter — any fact learned during the task that the brain doesn't already have (a new client detail, a pricing edge case, a voice/tone correction, an infra gotcha). Empty list if nothing new.

During Phase 5 review (mandatory per `agent-orchestrator` — never accept the notes file at face value), fold any non-empty `brain_updates` into the right `Allternit Brain/` doc yourself before considering the phase closed. This is what makes the loop actually self-improving rather than one-directional — without this step, delegated work either repeats mistakes the brain could have prevented, or discovers things that evaporate at session end.

## Why not just point the executor at the brain repo

Two reasons: `agent-orchestrator`'s workspace isolation is deliberate (worktree/repo-scoped, so executors can't collide or wander), and the brain contains hosting/account facts (even redacted of secrets) that shouldn't be handed to an arbitrary external CLI agent's context by default. Inlining only the relevant excerpt per task keeps the blast radius small.
