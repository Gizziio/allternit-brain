---
doc: project
updated: 2026-09-10
status: draft
---

# ao-uhp-gateway (P6)

## Goal

P6 of the ao v3 plan (`Products/AgentOrchestratorRuntime.md` §5, §2.6): the
UHP execution layer — implement the HarnessRouter CE capability in Rust
inside the ao binary, as a new workspace crate. UHP Responses surface
(turns, SSE streaming, cancellation, idempotency, harness CRUD, sessions),
per-session workspaces with checkpoint/rehydrate, SQLite+files backing, and
per-backend drivers as Rust modules over subprocess CLIs. HR CE is vendored
**for reference + as test oracle only** (Apache-2.0, confirmed 2026-09-10).
Credentials resolve through the §2.6 two-mode model — **the UHP layer owns
no keys**. "Choose a brain" semantics land here: a harness object is a
runnable brain in a registry; picking one = `harness_id` (+ model per
`model_route`) at call time; UHP session ids give resumable headless
sessions.

- **P6a — core + kimi/claude/codex drivers.** **Verify (plan):** UHP
  conformance suite green on the implemented surface; an ao-spawned task run
  through the UHP layer streams, cancels, and resumes identically across
  those backends; HR's pytest cases for those backends re-run against our
  server as the behavioral oracle.
- **P6b — remaining backends** (gemini, qwen, opencode, cline, pi, dsh,
  driver-by-driver; omp/hermes only if their relay re-implementation is
  justified; hermes stays license-gated). **Verify:** conformance class rises
  to Full; per-backend pytest parity per driver.

## Source link(s)

- Plan: `Products/AgentOrchestratorRuntime.md` §2.6 (architecture, ports,
  drops, credential model), §5 P6a/P6b
- Binding prep memo: `Research/drafts/prep-p6-uhp-gateway.md` — **wins over
  this spec on disagreement** (update this spec if so); includes the
  upstream repo layout, conformance-suite mechanics, and credential-code
  mapping found 2026-09-10
- Positioning note: `Research/drafts/prep-p6-p7-positioning.md`
- Steering addendum: `Research/drafts/steering-p67-addendum-20260909.md`
  (no key-storage UI; console UX = design reference only)
- Queue: `rq-20260909-004` (reverse_engineer, final 2026-09-09)
- HR CE: `github.com/HarnessRouter/harnessrouter` (Apache-2.0, LICENSE
  verified at HEAD 2026-09-10)

## Affected repo / surface

- Repo: `Gizziio/allternit-platform` (checkout
  `~/Desktop/allternit-workspace/allternit`)
- **New workspace crate: `infrastructure/executor/uhp-gateway/`** (sibling
  of crate `ao` and `ao-engine` — Binding 1)
- Vendor: `vendor/harnessrouter-ce/` (reference + oracles only)
- `ao` crate: `ao serve` verb (start/stop the UHP surface + health)
- Engine crate (`herdr` at `infrastructure/executor/ao-engine/`): **NO
  changes** — drivers reuse the P1 headless engine substrate
- `THIRD_PARTY_NOTICES.md`: Apache-2.0 attribution entry at vendor time
- CI: conformance job (+ advisory per-backend pytest oracle job)

## Integrate decision

reverse_engineer (queue `rq-20260909-004`, human-final 2026-09-09: implement
in Rust; what doesn't port, drops).

## Binding decisions

1. **Crate home (decided, from prep memo):** sibling workspace crate
   `infrastructure/executor/uhp-gateway/`, built **in-process** under
   `ao serve` — the plan's "inside the ao binary, not a sidecar". An
   in-binary module inside crate `ao` was rejected: it bloats the ao crate
   and muddies the fork-diff guardrail.
2. **Vendor first, spec-detail second:** HR CE is not vendored locally
   today. Executor step 0: clone into `vendor/harnessrouter-ce/`, write an
   inventory (config schema, pytest layout, protocol docs) into
   `docs/UHP_VENDOR_INVENTORY.md`, and only then final-file the driver
   interfaces. Vendor dir is oracles/reference only — **no shipped Python**,
   no HR code compiled or invoked from the ao binary. Apache-2.0 attribution
   in `THIRD_PARTY_NOTICES.md`.
3. **Hard-gate oracle = the conformance CLI over HTTP:** the UHP conformance
   suite (`protocol/conformance/` upstream) is a pip package with a
   `uhp-conformance` CLI that runs **against any server over HTTP**,
   `--class core|extended|full`, 64 checks, exit 0/1. CI boots `ao serve`
   and runs it: **P6a gate = core class green; P6b end state = Full.**
   This needs no Python inside ao — the CLI is CI-side only. Pin the
   conformance package version in CI; record the report JSON as evidence.
4. **Per-backend oracle = HR pytest, advisory at P6a:** `runner/tests/`
   (~29 files upstream) re-run against our server in a separate CI job.
   P6a: advisory (report drift, don't block); P6b: per-driver gate, matching
   the plan's "each gated on its HR pytest behavior".
5. **Credentials by reference only (§2.6, human-clarified):** two modes —
   (a) native authed CLI runtimes (user's own logins/subs; how ao already
   drives kimi/claude/codex), (b) Allternit cloud credentials on the
   platform plan via the Allternit LLM gateway (`cmd/allternit-api/src/
   llm_gateway/`; BYO per-user keys already landed PR #150). UHP drivers
   take a mode selector + reference, resolve at call time, **never store
   keys**. No key storage/management UI. The A:// policy side stays in
   `Ops/model-routing.json` via the `model_route` MCP tool.
6. **Drivers over the engine substrate:** a UHP turn over a backend = P1
   engine semantics (spawn/send/watch over the socket API) with a protocol
   face. Reuse pane/session machinery; port from HR only the per-backend
   *logic* (reasoning-strip / schema-normalize / token-usage handling).
7. **Drops (do not port):** Next.js console code (UX patterns are the P2/P5
   design reference only), container entrypoint + per-session-user sandbox
   (owner-trust model instead), hosted-service couplings (push-to-cloud,
   marketplace), Python/Node relay internals of any backend we choose not
   to re-implement first pass.
8. **PR slicing:** P6a one PR (core + kimi/claude/codex) gated on
   conformance core-class green + the plan stream/cancel/resume verify;
   P6b per-driver PRs. SQLite+files backing and checkpoint/rehydrate are
   P6a scope.
9. **Sequencing:** executes after P5 lands and after P7 (positioning note:
   P4 → P5 → P7 → P6a; P6b trails). One cargo executor at a time.

## Explicit non-goals

- Shipping Python; porting the HR console; key storage/management UI.
- omp/hermes relay re-implementation (only if justified; hermes
  license-gated regardless).
- Interactive cross-harness session pickup (stays with native sessions §2.5
  + Fabric P3).
- Multi-tenancy/per-session-user sandboxing.

## Verify plan

1. `cargo test -p herdr` and workspace green; new crate tests for
   harness CRUD, session lifecycle, idempotency, checkpoint/rehydrate.
2. **Hard gate (P6a):** `uhp-conformance --class core` against a booted
   `ao serve` → all green, report JSON saved to
   `~/.agent-orchestrator/evidence/ao-uhp-gateway/`.
3. **Hard gate (P6a):** one ao-spawned task run through the UHP layer over
   kimi, claude, codex: streams (SSE), cancels mid-turn, resumes by UHP
   session id — identically across backends. Transcript evidence saved.
4. HR pytest for kimi/claude/codex re-run against our server; drift report
   in NOTES (advisory at P6a).
5. Honest NOTES sentinel `docs/AO_UHP_GATEWAY_NOTES.md`; ledger attestation
   on land. (P6b repeats 2–4 per driver with class rising extended→full.)

## Goal body (paste into /goal when human-approved)

Drive P6a of the ao v3 runtime plan (Allternit Brain/Products/
AgentOrchestratorRuntime.md §5, §2.6) to a merged PR. Spec:
Research/specs/ao-uhp-gateway.md; binding prep memo:
Research/drafts/prep-p6-uhp-gateway.md (memo wins on disagreement).
Step 0: vendor HarnessRouter CE (github.com/HarnessRouter/harnessrouter,
Apache-2.0 verified) into vendor/harnessrouter-ce/ for reference + test
oracles only (no shipped Python, no HR code invoked from ao; Apache-2.0
attribution in THIRD_PARTY_NOTICES.md) and write
docs/UHP_VENDOR_INVENTORY.md (config schema, pytest layout, protocol docs).
Implement a new workspace crate infrastructure/executor/uhp-gateway/, in-
process under `ao serve` (not a sidecar): UHP Responses surface (turns,
SSE streaming, cancellation, idempotency, harness CRUD, sessions),
per-session workspaces with checkpoint/rehydrate, SQLite+files backing,
kimi/claude/codex drivers as Rust modules over subprocess CLIs reusing the
P1 headless engine substrate (pane/session machinery; port only per-backend
reasoning-strip/schema-normalize/token-usage logic). Credentials by
reference only per §2.6 two-mode model (native authed CLI runtimes;
Allternit cloud credentials via the existing llm_gateway BYO machinery) —
the UHP layer owns no keys, no key-storage UI. NO engine (herdr crate)
changes. Hard gates: (1) uhp-conformance --class core green over HTTP
against a booted ao serve (CI-side pip CLI, report JSON as evidence); (2)
one ao-spawned task through the UHP layer streams, cancels, and resumes
identically across kimi/claude/codex (transcript evidence); (3) HR pytest
for those backends re-run against our server, drift report advisory.
Evidence to ~/.agent-orchestrator/evidence/ao-uhp-gateway/. Honest NOTES
sentinel docs/AO_UHP_GATEWAY_NOTES.md; ledger attestation on land. Harness
rules: no secrets in commits, no rm -rf (mktemp -d), honest failure
reporting.

## Model route

Task class `client_coding_work` → A://C tier (per model-routing.json).
Executor: orchestrated CLI agent in own tmux session + worktree
(`allternit-ao-uhp-gateway`, branch `ao/uhp-gateway`), following the
P0–P5 executor pattern. Execute AFTER P5 and P7 land (Binding 9
sequencing); P6b follows as per-driver PRs.
