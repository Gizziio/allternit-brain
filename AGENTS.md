---
doc: agents
updated: 2026-09-08
status: active
---

# Allternit Brain — Agent Operating Manual

This file is for Kimi, Codex, Claude, and any future agent working on Allternit. Read this file after `BRAIN.md` and before editing anything.

## The Brain is your workspace, not a chat log

Chat sessions end. The Brain persists. Treat `Allternit Brain/` as the shared Obsidian-style vault where you and the human co-author docs. Every meaningful thing you learn, decide, or ship should land here.

## Entry points

1. `INDEX.md` — daily dashboard. Read this first in a session.
2. `BRAIN.md` — canonical operator's manual and source-of-truth pointers.
3. `Dashboard/Now.md` — active work this week.
4. `Dashboard/Decisions.md` — open and resolved decisions.

## Frontmatter rules (mandatory)

Every markdown doc in the Brain must start with:

```yaml
---
doc: <type>
updated: YYYY-MM-DD
status: active | draft | stable | archived
---
```

- `doc` — the doc type: `index`, `company`, `division`, `product`, `surface`, `client`, `infra`, `real-world`, `agents`, `ops`, `project`.
- `updated` — last meaningful edit date. Use today's date when you change substance (not typos).
- `status` — `draft` (unstable), `active` (current), `stable` (rarely changes), `archived` (superseded).

## How to add knowledge

1. Pick a template from `Templates/`.
2. Copy it to the right location (see `BRAIN.md` "How to add to this brain").
3. Fill it in. Link it from the relevant `INDEX.md`.
4. Run the audit: `node Ops/scripts/audit-brain.js`
5. Commit.

Or submit a structured update via the `brain_update_draft` MCP tool:

```json
{
  "source": "agent-name / session / reason",
  "updates": [
    {
      "doc": "path/from/brain/root.md",
      "action": "append | ensure-section | replace-field | create-or-replace",
      "section": "Section title (for ensure-section)",
      "field_regex": "regex (for replace-field)",
      "content": "Markdown content to add or replace with",
      "template": "company.md (for create-or-replace)"
    }
  ]
}
```

## Session sync routine

At the start of every Allternit work session:

```bash
cd "/Users/joe/Desktop/Allternit/Allternit Brain"
make session-start
# or: python3 scripts/session-sync.py --start
```

At the end:

```bash
make session-end
# or: python3 scripts/session-sync.py --end --summary "what we did"
```

This reads `Dashboard/Now.md` into context and writes learned facts + decisions back to the vault.

## Model routing

When spawning a subagent or autonomous worker, check `model-routing.json` via the `model_route` MCP tool. Do not guess which model to use.

## What to do when you finish work

1. Update the relevant Brain doc(s).
2. Update `Dashboard/Ships.md` if something shipped.
3. Update `Dashboard/Decisions.md` if a decision was made.
4. Run `make brain-pipeline` and fix any audit failures.
5. Commit with a clear message.

## Forbidden

- Do not duplicate legal/financial records from `Allternit LLC/`. Point to them.
- Do not commit secrets, `.env` files, or Stripe keys.
- Do not re-litigate standing facts in `company/business.md` without human approval.
- Do not leave new docs unlinked from an `INDEX.md`.

## GPT-Image-2 production prompts (marketing / series stills)

Deterministic prompt library for ChatGPT Plus image gen (not the upstream website / APIMart).

| Item | Path / skill |
|------|----------------|
| Agent contract | Box: `/home/box/agent-data/libraries/gpt-image-2-production/AGENTS.md` |
| Library | Box: `/home/box/agent-data/libraries/gpt-image-2-production/` |
| Upstream clone | Box: `/home/box/agent-data/libraries/awesome-gpt-image-2` |
| Skill | `allternit-gpt-image-prompt-layer` |
| Generate | `chatgpt-images-in-the-grok-bot-browser` |
| Clay identity | `character-lock-on-higgsfield` |

**Rules:** follow `AGENTS.md` exactly (gates → classify → variant → case → fill → pitfalls → prompt record → ChatGPT). Never generate the Allternit wordmark in-model; stamp after. Do not use third-party image backends unless the human named them.

