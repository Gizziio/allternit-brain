---
doc: product
updated: 2026-09-09
status: active
---

# Computer Use Synthesis & Roadmap

Synthesis of the 2026-09-08 deep audit: internal codebase grading, Perplexity Computer research, OpenAI/Astra deep dive, and industry landscape. Companion to [BROWSER_CAPABILITY.md](../Divisions/Compute/BROWSER_CAPABILITY.md) (browser tool design) — this doc is the computer-use control plane.

## 1. Where we are (audited, graded)

Full audit with file:line evidence by subagent; grades below. One live vertical stack exists: surface → Rust ACI gateway → Python ACU planning loop → adapters (extension → CDP → playwright → desktop), with approvals and recording.

| Component | Grade | Verdict |
|---|---|---|
| ACI gateway (Rust `/api/aci/*`) | B+ | Solid; in-memory run buffers lost on restart |
| TS SDK + protocol package | B | Complete, tested, but engine doesn't consume BrowserProvider |
| ACU engine (planning loop, adapters) | B- | Runs; canonical DB empty; record works, replay dead |
| Extension browser-agent | B | Real safety layer (allowlist, circuit breaker) |
| Sandbox VM routes | B | Real, no pooling |
| Computer Cloud (Incus/Tart) | C+ | Infra real; one example integration |
| allternit-sdk computer capability | C | Swallows errors, no postcondition checks |
| chrome-stream trajectory→skill compiler | C | Orphaned — nothing consumes BrowserWorkflowSpec |
| Canonical SQLite persistence | D | All 7 tables 0 rows — scaffolding |
| Record-and-teach | D | Records JSONL+GIF; replay is uncalled dead code; `/replay` 404s after stop |
| gizzi-code `@ant/computer-use-mcp` subtree | F | Dependency missing — unbuildable |

**Confirmed suspicion (user was right):** record-and-teach is NOT deterministically connected. Recording is on by default; deterministic replay (`action_recorder.py:288`) has zero call sites; the detached `/record` endpoint captures nothing; "teach" survives only in orphaned chrome-stream code. A recorded flow cannot be replayed by an agent anywhere in the product today.

**Rebrand/upstream (both cheap):**
- `anthropicType: computer_20250124` is inert metadata (3 source files + docs). Rebrand = vendor-neutral tool-type field + keep the action schema (models are trained on it). ~1 day.
- Upstream newest: `computer_20251124` types already in gizzi-code `messages.ts:2573`; Anthropic's newest is `computer_toolset_20260801` (17 member tools, `toolset_name`, zoom, batch-halt sentinel, no beta header) — support toolset shape + keep 20251124 as legacy adapter.

## 2. What the industry proved (research)

**OpenAI (the benchmark for product/safety architecture):**
- Layered safety stack is the differentiator: risky-action taxonomy + trained confirmations (92% recall, ~90% mistake-risk cut), separate monitor model watching screenshots (99% recall / 90% precision, retrained in a day), stacked outside the acting model so it can't be talked out of it; takeover mode + watch mode; detection-pipeline feedback loop (hours).
- API contract: environment state ≠ conversation state; `computer_call` → executor → `computer_call_output`; batch actions halting at first failure.
- 2026 shift: **code-execution integration is the recommended mode** (model writes PyAutoGUI/Playwright snippets — loops/conditionals per call, fewer round trips). Generic frontier models replace the dedicated CUA checkpoint.
- **GPT-6 Astra (Sept 3, 2026)**: best computer-use model — OSWorld 2.0 72.6% (Sol 65.7%, Opus 5 70.2%), ~47% faster, ScreenSpot-Pro 92.7% with no tools. Caveats: vendor-run numbers; first "Critical for cyber" model — misalignment monitor can pause/stop API tasks.

**Perplexity Computer:** closed source, not worth reversing (no published wire teardown exists; the moat is connectors + post-trained local model + harness co-design, none of which reverse). Design-reversible and worth stealing: Firecracker microVM **per task** (~150ms start, auto-pause, self-destruct), short-lived injected proxy tokens (never raw OAuth grants), **fail-closed sandbox** (no sandbox → tools disabled, never downgrade), task-graph DAG with parallel specialist sub-agents, MCP connectors rewritten as compact CLI tools for small models, cloud escalation as text-only "advisers" (never see files/tools), folder-scoped access.

**Grok Bot (xAI, Aug 2026):** cloud VMs, connectors, MCP. No published benchmarks — quality claims unverifiable. Not a reference.

**Landscape:** Anthropic `computer_toolset_20260801` is GA with the finest action vocabulary (best self-host brain); Google's Mariner died, tech lives on as Gemini computer-use API tool (browser/Android-first, preview). OSS: **browser-use (MIT, ~108k stars) is the reference architecture** for self-hosted browser agents — hybrid DOM+vision, record 97% Online-Mind2Web (cloud). UI-TARS-2 (open weights, 88.2%), Skyvern (auth/TOTP patterns, AGPL), Agent S3 (Behavior Best-of-N, 72.6% OSWorld). Honest OSS ceiling on auth-heavy flows ~64%; auth is the load-bearing failure mode (design human handoff from day one). Open-weight GUI models trail frontier by 15–20 pts on desktop tasks.

## 3. Target architecture (synthesized)


## Locked decisions (2026-09-08)

**D1 — Environments: use OUR microVMs.** Computer Cloud (Incus/Tart) is the environment layer. No Firecracker/E2B adoption. Revisit only if benchmarking shows we need <150ms cold start or density Incus/Tart can't hit — then evaluate, don't preempt.

**D2 — One branded product: Allternit Computer Use.** The CUA driver, ACU engine, and ACI gateway are internal engines — implementation details. Today approvals/permissions are scoped to the CUA driver, which is wrong: permission, approval, safety policy, identity, audit, and packaging all belong to **Allternit Computer Use** the product, spanning every engine and provider (CUA loop, BrowserProvider, desktop adapters). Nothing user-facing may say "CUA."

**D3 — Port the OpenAI/Anthropic packaging model.** How they package it is the template:
- **Branded, versioned tool contract**: our own toolset (analogous to `computer_toolset_20260801`) — Allternit-named member tools, versioned, with legacy adapters for upstream shapes (20250124 / 20251124 / toolset) so any frontier model can drive us.
- **One SDK package**: `@allternit/computer-use` becomes the single public surface (capability client, approvals API, environments, sessions, recording/teaching). The duplicate/placeholder computer tools (allternit-sdk capability, gizzi `capabilities/computer.ts`, dead MCP subtree) collapse into it.
- **Safety stack as product features**: risky-action taxonomy, confirmation gate, monitor model, takeover/watch mode — shipped, documented, and branded like OpenAI's system card (publish our measured recall numbers).
- **Environment lifecycle API**: provision/pool/destroy microVMs per task, proxy tokens, fail-closed (Perplexity pattern) — all behind the product API.
- **Docs parity**: public docs structured like OpenAI's computer-use guide (integration modes, action space, safety, environments).

## Packaging spec (what "ported" concretely means)

| Layer | OpenAI/Anthropic reference | Allternit Computer Use equivalent |
|---|---|---|
| Tool contract | `computer` tool / `computer_toolset_20260801` (17 members, versioned) | `allternit.computer` toolset v1; legacy adapters translate upstream tool types so Claude/GPT/Gemini-native calls work unmodified |
| Integration modes | atomic actions AND code-execution mode | both: action batching (halt-at-first-failure sentinel) + sandboxed code mode in the microVM |
| Safety | risky-action taxonomy, confirmations, monitor model, takeover/watch | same architecture, product-scoped, measured + published |
| Environments | developer-provisioned; stateful containers | Computer Cloud microVMs (D1), pooled, per-task, proxy tokens, fail-closed |
| SDK | openai computer-use client | `@allternit/computer-use` (the one package, D2/D3) |
| Session/recording | — (their gap) | our differentiator: record → deterministic replay → teach → skill |

```
Surfaces (web/desktop/iOS)
        │
┌───────▼──────────────────────────────────────────┐
│ CUA driver / ACU gateway (control plane, ours)    │
│  • risky-action taxonomy + confirmation gate      │  ← port from OpenAI
│  • monitor model (screenshot watcher, pauses run) │  ← port from OpenAI
│  • takeover / watch mode, approval receipts       │
└───┬───────────────┬────────────────┬───────────────┘
    │               │                │
┌───▼─────┐  ┌──────▼──────┐  ┌──────▼──────┐
│ Browser │  │ Pixel loop  │  │ Record&Teach│
│ provider│  │ (ACI, CUA   │  │ • record    │
│ (DOM/   │  │  models,    │  │ • determin- │
│ a11y,   │  │  screenshots│  │  istic replay│
│ primary)│  │  fallback)  │  │  + deviation│
│ browser-│  │             │  │ • trajectory│
│ use ref │  │             │  │  →skill     │
└─────────┘  └─────────────┘  └─────────────┘
Environments: microVM-per-task (Incus/Tart, fail-closed),
proxy tokens, env pooling   ← Perplexity patterns
Brains: multi-model routing (A:// tiers) — frontier API models
for hard tasks, open-weight local for cheap/high-volume
```

Key decisions baked in:
- **Hybrid observation**: DOM/a11y primary for web (industry direction, cheap), pixel loop fallback for non-web. CUA models stay — they're the best general control.
- **No reversing**: browser-act rejected earlier; Perplexity not worth it; OpenAI/Anthropic patterns are documented — we port designs, not code.
- **Safety is the product**: the OpenAI stack (taxonomy + monitor + takeover) is what makes this sellable; it's Phase-1 work, not polish.

## 4. Roadmap (phased, each phase independently shippable)


## Post-ship re-grade + bug-fix round (2026-09-08, same day)

Re-audit after the Phase 0+1 ship found 6 correctness bugs (cross-PR contract drift — each item had been verified in isolation). All fixed and merged:

| Bug | Severity | Fix | PR |
|---|---|---|---|
| gizzi engine adapter 422'd every call (SDK posted `{mode:'direct',actions}` w/o task; router required task, ignored mode) | High | real direct-actions execution path in router; SDK aligned to shipped contract | #152 + #154 |
| GIF export 404'd after stop (ActionRecorder.load dropped gif_path; /record append never fed GIF buffer) | Medium | load preserves gif_path; append feeds GIF buffer | #152 |
| No machine-readable approval-needed signal on streams | Low | approval.required / approval.resolved SSE events, run status awaiting_approval | #152 |
| SDK EventStream subscribed to a nonexistent route; approvals watchRun dead | Medium | route → /computer-use/runs/{id}/events, real envelope parsing, waitForApproval works | #154 |
| 10 of 17 advertised actions silently stubbed in /v1/execute; capability screenshot parse always threw | Medium | dispatch handlers added (zoom = explicit unsupported); screenshot parsed from artifacts[] | #155 |

Verified on merged main: direct-mode execute 2/2 actions ok (was 422); cargo 698 pass (4 pre-existing env fails); pytest 101 pass (4 env-dependent desktop-input fails). Ledger: summaries 2026-09-08-1150-cu{6,7,8}-*.md.

### Post-fix grades
ACI gateway A- · ACU engine B+ · TS SDK B · sandbox/computer routes B+ · Computer Cloud B- · allternit-sdk capability B- · chrome-stream B- · record-and-teach B- (chain: record→replay→teach closed; teach→run-as-skill still open) · gizzi subtree B- (builds + real adapter; runtime path now unblocked) · canonical persistence D (untouched) · extension B.

### Top remaining gaps (ranked)
1. Workflow-spec executor — closes teach→run-as-skill, the last open link (single highest leverage).
2. Canonical SQLite persistence for runs/grants/receipts (audit trail dies with process today).
3. Monitor model + measured conformance (replace self-graded adapter_grades.json).
4. Environment pooling on Computer Cloud.
5. Two parallel approval systems (Rust hash-grants vs Python approval_future) need one user-facing surface.


## Shipped 2026-09-08 (Phase 0+1, swarm of 5 sessions, all merged to main)

| Audit item | Was | Now | PR |
|---|---|---|---|
| gizzi computerUse subtree | F (missing dep) | Buildable, typed, backed by @allternit/computer-use (adapter chosen over removal — live DCE'd consumers) | #143 |
| Deterministic replay | D (dead code) | ReplayEngine: disk-backed /recordings, /replay executes completed recordings, screenshot-diff deviation pause → approve/resume or abandon; 22 tests + live smoke | #142 |
| Recording→skill (teach) | C (orphaned) | ACU JSONL → BrowserTrajectory → BrowserWorkflowSpec via POST /v1/browser-skills/from-recording; target-aware redaction (password targets) | #138 |
| Tool contract rebrand | — | `allternitToolType`/`computerToolVersion` emitted; computer_20251124 supported (17 actions, zoom, region); 5 docs rebranded | #137 |
| Approvals | CUA-scoped, client-side strings | Product-scoped, server-side, action-hash-bound single-use expiring grants with receipts, across ACU loop + direct tool + REST + tool routes | #144 |

Ledger attestations: agent-ledger/summaries/2026-09-08-1022-cu{1..5}-*.md + LEDGER.md entries.
Follow-ups for Phase 2+:
- Planning-loop consumption of BrowserWorkflowSpec (record → replay → teach → run-as-skill loop not yet closed in ACU).
- Monitor model + risky-action taxonomy UI (taxonomy classifier exists in aci_safety.rs; no monitor model yet).
- Canonical SQLite persistence still empty (deferred from Phase 0 — decide light-up vs cut).
- Environment pooling on Computer Cloud (D1: Incus/Tart stays).

**Phase 0 — Stabilize (week 1, small):**
1. Fix gizzi-code computerUse subtree (vendor dep or migrate to `@allternit/computer-use`) — it's an F today.
2. Rebrand tool contract: vendor-neutral tool-type + emit both during transition; add `computer_20251124` action set.
3. Persist run buffers + light up canonical SQLite (or cut it). Decide, don't leave scaffolding.

**Phase 1 — Record & teach actually works (the user's #1 gap):**
4. Wire `ActionRecorder.replay` into a real endpoint loading from disk; after-screenshot deviation detection → pause → ask.
5. Connect chrome-stream's `compileBrowserTrajectoryToSkill` to the ACU recording pipeline so a recorded flow becomes an agent-executable skill (BrowserWorkflowSpec → planning loop).
6. Close the loop in the UI: record → replay → teach → run-as-skill, all from ACI.

**Phase 2 — Safety architecture (port OpenAI):**
7. Risky-action taxonomy + confirmation gate bound to action hashes (types already exist, `canonical.ts:210`).
8. Monitor model: screenshot-watching classifier with pause; stacked outside the acting model.
9. Takeover/watch mode UX on all three surfaces (extension path partially exists).

**Phase 3 — Browser provider (the web fast-path):**
10. Implement BrowserProvider for the engine (interface exists at `packages/@allternit/computer-use-protocol/src/index.ts:370`; engine currently uses a separate Python provider hierarchy — bridge or migrate). Reference: browser-use MIT codebase.
11. Environment pooling + microVM-per-task hardening on Computer Cloud (Incus/Tart), fail-closed, proxy tokens.

**Phase 4 — Brains & benchmarking:**
12. Multi-model routing: Astra-class frontier for hard/desktop, open-weight for volume; measured conformance (replace self-graded `adapter_grades.json` with real suites).
13. Support `computer_toolset_20260801` upstream shape as legacy adapter target.

## 5. Open questions



### Packaging sprint + follow-ups shipped (2026-09-08/09, PRs #174/#171/#173/#177/#185/#186/#187)
All 5 packaging gaps closed or reframed-shipped: (1) one-command Docker-free demo (demo.py + /demo UI) #174; (2) cost OBSERVABILITY not pricing (per-run tokens/est_cost on receipts, /cost/summary) #174; (3) docs spine (quickstart/guide/recipes/changelog) #171; (4) published measured eval/safety system card docs/public/aci/safety.md — every number reproduced live (playwright 8/8, cdp 8/8 vs live Chrome, crawler 5/5, hybrid 3/3, routing 6/6, cargo aci_ 40/40) #185; (5) recordings as product surface — remote-control RecordingsPanel #173 + gateway detail/file/GIF routes #186 + credential vault #177 with Python-side sandbox_env consumption #187 (leak-proofed, canary-tested).
Deferred honestly: browser-use/pyautogui desktop adapter grades pending measurement; monitor-model recall not yet measured; concurrent-run os.environ overlap (v1 tradeoff); Python VM-side /etc/environment channel does not exist (Rust-side only).
Ledger: summaries 2026-09-08-1400-cu{14..17}-*.md, 2026-09-09-0057-cu{18..20}-*.md.

### New spec flagged (2026-09-09): Research/specs/bot-identity-computer.md
Nick Vasile Codex+Orgo demo → product intent: Create Bot = one atomic object (bot identity + persistent computer bind), joining Bot packaging + Computer Cloud. Not yet tasked.


### A-grade wave 1 shipped (2026-09-08, PRs #161/#164/#160)
Top-5 gaps addressed:
1. WORKFLOW EXECUTOR DONE — record→replay→teach→run fully closed: POST /v1/browser-skills/run, {{input}} parameterization, approval pause on missing params; live-verified 3/3 via CDP (#161).
2. PERSISTENCE DONE — runs.sqlite3 + recordings index + canonical EventLedger fed from all 4 paths; Rust receipts JSONL + run-buffer snapshots; kill+restart verified on both sides (#161/#164).
3. CONFORMANCE MEASURED — adapter_grades.json real numbers: browser.playwright 8/8=100% (real headless Chromium), mock 8/8, routing-policy 6/6; honest nulls for unmeasured suites (#161).
4. ENV POOLING DONE — warm fail-closed VM pool (min_idle/max_total/idle_ttl, boot reclamation, durable state) in front of /sandbox/execute (#164).
5. APPROVALS UNIFIED — GET /api/aci/approvals/{id} single status across grant/handoff/ACU-future; TTL 120s aligned; monitor hook landed (pluggable, heuristic default) (#164/#161).
Plus: gizzi engine adapter live-proven 12/12 against the real gateway (4 bugs fixed); sdk/computer-use ESM packaging fixed; allternit-sdk no longer fakes success (#160).
Remaining to true-A: browser.cdp vocabulary gap (1/8), suites B/C/E + extension/desktop conformance unmeasured, VLM monitor classifier (interface ready), canonical skill repository Python-side, idempotency test flake. Ledger: summaries 2026-09-08-1245-cu{9,10,11}-*.md.

1. Monitor model: build on open-weight VLM or route through a cheap API model? (Cost vs data-residency — joe's self-host bias suggests local, but recall numbers matter.)
2. Does Phase 3 bridge TS BrowserProvider into the Python engine, or migrate engine providers to the canonical TS contract? (Bridge first, migrate later — leaning.)
3. Astra's misalignment monitor can stop API tasks — do we surface that as a feature ("guardian pause") in our UX?
