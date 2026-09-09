---
doc: project
updated: 2026-09-08
status: active
---

# Link → feature pipeline (canonical design)

Durable shape for turning saved links into Allternit features. JSON holds **state**; brain markdown holds **knowledge**. This doc is the stage contract Grok and Kimi (and any other agent) implement against — do not invent alternate stages.

**Companion state store:** [`Research/queue.json`](../../Research/queue.json) (`rq-*` ids).  
**Companion knowledge:** [`Research/INDEX.md`](../../Research/INDEX.md), baselines, specs, drafts.  
**Skills pack:** `.claude/skills/research-pipeline/` (+ satellites) — implements this design; it does **not** remove the human money gate. See [Skills pack](#skills-pack) and [WORKFLOW.md](WORKFLOW.md).

```
ingest → baseline → link research → integrate decision → spec
       → dual review (preferred) → human gate → execute → land
```

---

## Hard constraints (impossible to miss)

These are **hard vetoes** on any integration path. If any fire, the item may only be `watch` or `drop` (or a docs-only / vendor-skill path that never calls the paid/signup/Docker surface at runtime).

| Veto | Meaning |
|------|---------|
| **Paid API / SaaS required** | Core path needs a paid dependency or metered commercial API. |
| **Account signup required** | Core path needs creating an account / API key with a third party to function. |
| **Docker required** | Build or run path requires Docker/containers. |
| **Closed license** | License blocks Allternit use, redistribution, or reskin. |

**Prefer:** MIT / Apache-2.0 / BSD (or equivalent) self-hostable code; local runtime without containers; an Allternit-owned code path (fork+reskin or reverse-engineer).

Agents must record `paid_or_signup`, `docker_required`, and `constraints_ok` on the card / queue item. `constraints_ok: false` → cannot advance to `execute`.

---

## Stage map ↔ skill phases

| Canonical stage | Skill phase | Queue / card status |
|-----------------|-------------|---------------------|
| 1. ingest | A | `inbox` |
| 2. baseline | (new, before B depth) | still `inbox` or `baselined` |
| 3. link research | B | `researched` or `watch` |
| 4. integrate decision | B→C bridge | `decided` (or keep `researched` + `decision` field) |
| 5. spec | C | `spec_ready` |
| 6. dual review | C extension | drafts present; merged spec → `spec_ready` |
| 7. human gate | D | stays `spec_ready` until human sets `approved` |
| 8. execute | E–F | `executing` → `pr_open` |
| 9. land | G | `landed` |

**Mechanical** weekday launchd (`com.allternit.research-pipeline-sweep`, 09:05 Mon–Fri) runs export→ingest→integrity→dashboard only — it does **not** run agent stages. Agent pre-gate (stages **1–7 prep**) is interactive `/research-pipeline` or opt-in multi-harness `AGENT_SWEEP=1` (`AGENT_SWEEP_HARNESS=auto|grok|kimi|claude|dual`; auto→dual when grok+kimi on PATH) on the sweep script; those runs **always stop at the human gate**. Deprecated compat: `CLAUDE_CODE_SWEEP=1` → AGENT_SWEEP + harness=claude. Never spawn an executor without explicit approval of the **named spec slug**.

### Production autonomy (2026-09-08 design)

Full detail lives in the `research-pipeline` skill ("Production autonomy" section). Summary:

- **Single config** `Ops/config/research-pipeline.json` drives everything; `autonomy.mode: "shadow"` ships as default (cycle reports, never spawns), `"active"` lands PRs unattended within caps (`execute_max_per_day`, `execute_max_concurrent`, `tier_ceiling: "A://C"`).
- **launchd is the only scheduler**: mechanical 09:05 weekdays, agent-sweep daily 21:37 (stages 1–7 prep, capped), cycle every 30 min 07:00–22:00 (consume approvals → execute → review → land → notify). VPS mirror units ship at `Ops/deploy/vps/systemd/` (not activated).
- **Approval paths**: `research_approve` MCP tool · `node Ops/scripts/research-approve.js <slug>` (Grok Bot / any terminal) · `Research/gate/approvals/<slug>.approve` file drop. Slug-level, validated, idempotent.
- **Park boundary**: money/Stripe, client comms, and deploy-confirm steps are never auto-executed — they park (`status: parked`) with a notification. Standing harness gates are never overridden.
- **Reviewer independence + quarantine**: the review pass always runs on a different harness than the implementer when one is available; terminal failures quarantine (`status: quarantined`, worktree preserved) instead of blocking — human recovery required.
- **Kill switch**: `Research/gate/HALT` file (cycle no-ops while present). Notifications via `Ops/scripts/notify.sh` (macOS banner + `Research/gate/notifications.log` + rails mail share).

---

## 1. Ingest

Two complementary entry points (both valid):

### A. Safari / dump → link cards

1. Create `Projects/link-ingest/inbox/YYYY-MM-DD-<source>/`.
2. Write one card per link per [SCHEMA.md](SCHEMA.md) (`li-YYYYMMDD-NNN`).
3. Write `_BATCH.md` with counts + high-leverage picks.
4. Cards start at `stage: inbox` / `next: research`.

### B. URL drop → research queue

1. Append URLs (one per line, optional note) to `Research/.incoming/links.md`, **or** use `research_ingest` MCP.
2. Run `node Ops/scripts/ingest-research.js` — dedupes by normalized URL, creates `rq-*` in `Research/queue.json` at `status: inbox`, archives consumed inputs to `Research/.incoming/applied/`.
3. Regenerate dashboard: `node Ops/scripts/research-dashboard.js`.

### Bridge: `li-*` → `rq-*`

Cards are **knowledge + triage**; the queue is **execution state**.

| Action | How |
|--------|-----|
| Export candidates | For each inbox card with a non-empty `url` that should enter the research queue, append `url` + note (`li-…` id + title) to `Research/.incoming/links.md`. |
| Ingest | Run `ingest-research.js` → new `rq-*` rows. |
| Cross-link | On the card: set optional `rq_id: rq-YYYYMMDD-NNN`. On the queue item: set optional `li_id: li-YYYYMMDD-NNN` (and/or note field). |
| Dedup | Same normalized URL must not create a second `rq-*`. If a card has no URL, research must resolve one before queue export, or keep it card-only (`watch` / clarify). |

Export script (glue — not yet required to exist): prefer `Projects/link-ingest/inbox/**/li-*.md` with `url` + `bucket: allternit|website` (or explicit allowlist) → `.incoming/links.md`. Personal/osint/unclear stay card-only unless Joe promotes them.

---

## 2. Baseline (Allternit-first)

**Before deep link research**, map what Allternit already has for this capability.

1. Use Allternit MCP + Brain (and known codebase shape) — **not** a fresh full-repo crawl every time.
2. First time a capability **area** is touched, write a short baseline:

   `Research/baselines/<area>.md`

   Areas are kebab-case capability labels, e.g. `agent-memory`, `browser-automation`, `ui-skills`, `lead-intake`, `local-model-serving`, `division-sites`.

3. Later items for the same area **only append deltas** (new surfaces, gaps closed, “already covered by X”).
4. Record `baseline_ref: Research/baselines/<area>.md` on the card / queue item.
5. Research after baseline is **incremental**: what the link adds vs the baseline map.

Baseline doc shape (minimal):

```markdown
---
doc: project
updated: YYYY-MM-DD
status: active
---

# Baseline: <area>

## What we already have
- …

## Gaps
- …

## Related products / paths
- …

## Delta log
- YYYY-MM-DD — <slug / rq-id>: …
```

---

## 3. Link research

For each `inbox` / exported item:

1. One identification pass (WebSearch / fetch) — do not re-research what `Research/INDEX.md` already covers.
2. Capture: what it offers; license; dependencies; **signup / paid / Docker flags**.
3. Append/update the watchlist row in `Research/INDEX.md` when useful.
4. Triage: feature candidate vs `watch` (reference only).
5. Queue status → `researched` or `watch`; append `history` event.

Required research outputs (on card Notes and/or a short research note linked from the queue `spec`/notes):

- Offer summary (1–3 sentences)
- License
- Deps summary
- `paid_or_signup: bool`
- `docker_required: bool`
- Fit vs baseline gaps

---

## 4. Integrate decision

### Decision tree (required)

Walk in order. Stop at the first hard veto that cannot be avoided without changing the approach.

```
Is the capability useful vs baseline gaps?
  NO  → watch | drop
  YES → Does core path require paid API, signup, or Docker?
          YES → Can we reverse-engineer / rebuild without those?
                  YES → reverse_engineer
                  NO  → Is there a vendor-skill / docs-only value with zero runtime paid/signup/Docker?
                          YES → vendor_skill (docs/skill only)
                          NO  → drop (or watch)
          NO  → Is upstream open (MIT/Apache/BSD-class) and forkable?
                  YES → Prefer fork_reskin (Allternit branding) when the product shape is mostly right
                     → Else reverse_engineer when shape differs or license/branding make fork awkward
                  NO  → thin_adapter only if upstream is free, no-signup, no-Docker CLI/API we can wrap locally
                     → else watch | drop
```

### Candidate approaches (checklist)

| Approach | `decision` value | When |
|----------|------------------|------|
| Fork and reskin | `fork_reskin` | Open license; mostly-right product; we own the tree under Allternit branding |
| Reverse engineer | `reverse_engineer` | Rebuild the capability ourselves (preferred when fork is awkward or we need a different shape) |
| Vendor skill / docs only | `vendor_skill` | Skill or docs artifact only; no paid/signup/Docker runtime dependency |
| Thin adapter | `thin_adapter` | Wrap a free local/no-signup tool; adapter is Allternit-owned |
| Watch | `watch` | Useful reference; no build now |
| Drop | `drop` | Vetoed or no fit; keep history, one-line reason |

Agents may propose variants, but every proposal must map to one of the rows above and pass hard vetoes.

### Required decision output fields

On card frontmatter (and mirrored onto queue item when present):

| Field | Values |
|-------|--------|
| `decision` | `fork_reskin` \| `reverse_engineer` \| `vendor_skill` \| `thin_adapter` \| `watch` \| `drop` |
| `constraints_ok` | bool — false if any hard veto remains on the chosen path |
| `paid_or_signup` | bool |
| `docker_required` | bool |
| `baseline_ref` | path to `Research/baselines/<area>.md` |
| `rq_id` | optional cross-link |
| Rationale | short paragraph in Notes / decision memo: why this approach, what we reject |

`decision` ∈ {`watch`,`drop`} → do not write an execution spec; update INDEX/watchlist only.  
`constraints_ok: false` → cannot proceed to human gate for execute.

---

## 5. Spec

1. Create `Research/specs/<slug>.md` from [`Templates/spec.md`](../../Templates/spec.md).
2. Fill: goal, source link(s), affected repo/surface, Phase 1 scope only (handoff), gate checklist, acceptance criteria, executor model tier via `model_route` (never guess).
3. **Embed the integrate decision** (approach + constraint flags + baseline_ref).
4. Include a **`/goal` body** section the coding agent can run verbatim (outcome, constraints, acceptance, non-goals).
5. Queue → `spec_ready`; regenerate `Research/Dashboard.md`.
6. Report: `spec ready for approval: <paths>`.

Suggested extra sections beyond the template (add when writing the spec):

```markdown
## Integrate decision
- Approach: …
- constraints_ok / paid_or_signup / docker_required: …
- baseline_ref: …

## /goal
<paste-ready goal for the executor>
```

---

## 6. Dual review (optional but preferred)

Allows **fresh eyes** (e.g. Grok + Kimi terminals) before the gate.

### Protocol

1. Both agents independently produce drafts:
   - `Research/drafts/<slug>--grok.md`
   - `Research/drafts/<slug>--kimi.md`
2. A cherry-pick pass writes `Research/drafts/<slug>--CHERRY.md` (or `Research/specs/<slug>--CHERRY.md` during review) that **picks winners per section** (goal, decision, scope, acceptance, `/goal`, risks).
3. Only the **merged** doc is promoted to `Research/specs/<slug>.md` and advances to the human gate.
4. Do not send two competing specs to the human gate. One named slug, one approved path.

Cherry memo minimal shape:

```markdown
---
doc: project
updated: YYYY-MM-DD
status: draft
---

# Cherry-pick: <slug>

| Section | Winner | Notes |
|---------|--------|-------|
| Goal | grok \| kimi \| merge | |
| Integrate decision | … | |
| Phased scope | … | |
| Acceptance | … | |
| /goal body | … | |

## Merged result path
- `Research/specs/<slug>.md`
```

If only one agent drafts, skip dual review and proceed with a single spec (still subject to the human gate).

---

## 7. Human gate

**Never proceed past this stage without the human explicitly approving the specific spec by slug in the conversation.**

- This gate exists because **execute spends executor money**.
- It holds under “just do it” pressure.
- Scheduled sweeps **always terminate here** with a gate report of `spec_ready` items.
- Approval sets queue status → `approved` for that `rq-*` / named slug only.

Harness gates inside the spec still apply (voice Register 1, dry-run defaults, preview-before-deploy). The pipeline never overrides them.

---

## 8. Execute

Only for `approved` items:

1. Per `agent-orchestrator` Phase 1: write `docs/<TOPIC>_MAP.md` + `docs/<TOPIC>_PHASE_1_TASK.md` **inside the target repo** (executors may not read outside their workspace). Inline excerpts per `delegation-runbook.md` — never pointers; never Stripe credentials.
2. Coding agent runs the spec’s **`/goal`** to completion (orchestrator / worktree): `ao-spawn --worktree <slug> …`, sentinel chain, `ao-watch`.
3. Status → `executing`.
4. Review (skill Phase F): real git footprint, scope check, claim verification, syntax gate. Status → `pr_open`.

---

## 9. Land

1. Repo ritual per target repo `.allternit/AGENTS.md` (merge/push, delete worktree, clean scratch, verify `git status`).
2. Fold `brain_updates:` from executor NOTES into brain docs (draft → human confirm separately; **this pipeline design does not auto-`confirm:true`**).
3. Update `Dashboard/Ships.md` as needed.
4. Queue → `landed`; regenerate research dashboard.
5. Link-ingest card (if any): `stage` → shipped equivalent / `status: done`; keep history.

---

## State vs knowledge

| Store | Role |
|-------|------|
| `Research/queue.json` | Execution state (`rq-*`, status, history, spec path, worktree) |
| `Research/Dashboard.md` | Regenerated gate view — do not hand-edit |
| `Research/INDEX.md` | Watchlist knowledge |
| `Research/baselines/*.md` | Capability maps + delta log |
| `Research/specs/*.md` | Approved-path specs (knowledge + handoff) |
| `Research/drafts/*` | Dual-agent drafts + CHERRY memos |
| `Projects/link-ingest/inbox/**` | Ingest cards (`li-*`), batch indexes |

Every status transition on a queue item **appends a `history` event**.

---

## Ownership

| Stage | Owner |
|-------|-------|
| ingest (cards) | Link ingestion bot |
| ingest (queue) | `ingest-research.js` / `research_ingest` / pipeline sweep |
| baseline + link research + decision | Research/spec agent(s); dual drafts allowed |
| dual review / CHERRY | Second agent or designated cherry-picker |
| human gate | Joe (explicit named-slug approval) |
| execute + land | Coding agent + orchestrator; human for brain apply confirms |

---

## Skills pack

Operational skills (SoT: `/Users/joe/Desktop/Allternit/.claude/skills/`). Operator runbook: [WORKFLOW.md](WORKFLOW.md). Distribute with `Ops/harness-sync.js`.

| Skill | Role |
|-------|------|
| [`research-pipeline`](../../../.claude/skills/research-pipeline/SKILL.md) | End-to-end orchestrator (`/research-pipeline`); stages 1–9; scheduled pre-gate sweeps |
| [`link-ingest`](../../../.claude/skills/link-ingest/SKILL.md) | Safari/URL → inbox cards and/or `.incoming` → `ingest-research.js`; `li-*`↔`rq-*` |
| [`baseline-capability`](../../../.claude/skills/baseline-capability/SKILL.md) | `Research/baselines/<area>.md` before deep research; deltas after |
| [`integrate-decision`](../../../.claude/skills/integrate-decision/SKILL.md) | Decision tree + hard vetoes; set `decision` / constraint flags |
| [`dual-draft-cherry`](../../../.claude/skills/dual-draft-cherry/SKILL.md) | Grok + Kimi drafts → CHERRY → one merged spec |
| [`spec-to-goal`](../../../.claude/skills/spec-to-goal/SKILL.md) | Spec + paste-ready `/goal` + `model_route`; stop at human gate |
| [`repo-ritual-land`](../../../.claude/skills/repo-ritual-land/SKILL.md) | Post-PR ritual; draft brain fold (no `confirm:true`); `landed` |

Execute handoff after approval: **`agent-orchestrator`** (not reimplemented here).

## Glue status / remaining

- Exporter: `Ops/scripts/export-link-ingest-to-research.js` (li-* with url + allternit|website → `.incoming/links.md`) — **exists**. Cross-link `rq_id` / `li_id` via sweep repair / agents.
- Optional queue fields on items: `li_id`, `decision`, `constraints_ok`, `paid_or_signup`, `docker_required`, `baseline_ref`, `area` (default null) — **in schema**.
- Integrity: `Ops/scripts/research-queue-integrity.js`; weekday mechanical sweep + launchd — **exists**.
- Dual-draft folder convention (created: `Research/drafts/`).
- Wire `/goal` body from merged spec into orchestrator Phase E task files automatically.
- Copy/sync `Templates/spec.md` onto Box Brain if missing (Mac is source of truth today).

---

## Related

- [INDEX.md](INDEX.md) — project index (points here)
- [SCHEMA.md](SCHEMA.md) — card frontmatter
- [Research/PIPELINE.md](../../Research/PIPELINE.md) — pointer + queue note
- [Research/baselines/README.md](../../Research/baselines/README.md) — baseline convention
- [WORKFLOW.md](WORKFLOW.md) — operator runbook
- Skills pack `research-pipeline` + satellites — see above
