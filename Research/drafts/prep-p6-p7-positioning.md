---
doc: project
updated: 2026-09-10
status: draft
---

# P6/P7 positioning note (post-P3, pre-P4)

Read the plan doc (`Products/AgentOrchestratorRuntime.md` §5) verbatim for
P6/P7 before gating. This note positions them against the landed P0–P3 state
so the human-gate discussion has current facts. **No implementation started.**

## P7 — Harness auto-install (`ao harness install <tool>`)

**What it is:** port the first-run installer (version-pinned per-backend entry
scripts) into `ao harness install <tool>` — one managed dir, verify-by-doctor,
per-tool license gate (Anthropic-terms + license-undeclared backends need
explicit opt-in). Then the onboarding lifecycle: install CLI → ao registers it
as an executor → P4 harness-sync fans skills/rules/MCP to it → native-sessions
adapter (gizzi 27-adapter pattern) picks up its session format.

**Position vs current state:**
- P4 (harness sync port) is the direct prerequisite — it owns the 16-tool
  manifest SoT that P7's "ao registers it as an executor" extends. P7 should
  not start before P4 lands; doing both at once would fork the manifest.
- Native-sessions pickup is the tail end of the lifecycle and overlaps P5's
  native-session port (§2.5). The P7 verify criterion ("a session started in
  the installed CLI appears in native-session listing") is actually P5's
  machinery — plan P7's verify to lean on whatever P5 lands, or scope P7's
  verify to "listed by ao native-sessions" and treat gizzi-code/Desktop
  surfacing as the documented follow-on (plan already defers gizzi onboarding
  surfacing).
- License gate: the manifest already tags tools; check whether Anthropic-terms
  tools (claude, cline?, others) and license-undeclared ones (dsh, hermes?)
  are marked — that marking is P7's gate input and can be added during P4
  spec'ing cheaply.

**Gate question for Eoj:** is P7 wanted immediately after P4, or after P5?
Sequencing P4 → P5 → P6/P7 keeps each verify criterion on machinery that
already exists; P4 → P7 → P5 front-loads the "clean machine installs a CLI and
joins the fleet" story but makes P7's verify depend on P5's port.

## P6 — UHP execution layer (Rust port of HarnessRouter CE)

**What it is (verbatim scope):** implement the HarnessRouter CE capability in
Rust inside the ao binary — new workspace crate (recommended
`infrastructure/executor/uhp-gateway/`; home decided at gate), UHP Responses
surface (turns, SSE streaming, cancellation, idempotency), harness CRUD,
sessions, per-session workspaces with checkpoint/rehydrate, SQLite+files
backing, per-backend drivers as Rust modules over subprocess CLIs. HR CE is
vendored for reference + as test oracle only (Apache-2.0 attribution in
THIRD_PARTY_NOTICES.md). Credentials via the two-mode model (native authed CLI
runtimes; platform-plan cloud credentials via the Allternit gateway) — the UHP
layer owns no keys. P6a = core + kimi/claude/codex drivers; P6b = remaining
backends driver-by-driver.

**Position vs current state:**
- This is the largest phase of the whole plan (a server + protocol + drivers),
  bigger than P0–P5 combined. It is the right next big bet only if the
  "choose a brain" semantics (harness object = runnable brain in a registry,
  pick = harness_id + model at call time, resumable headless UHP sessions) are
  product-priority.
- Existing machinery it builds on: P1's headless engine (spawn/send/watch over
  socket API) is the natural driver substrate — a UHP turn over a backend is
  engine semantics with a protocol face. P6 should reuse, not re-implement,
  the engine's pane/session machinery.
- Dependencies to nail at the gate: (1) crate home — `infrastructure/executor/
  uhp-gateway/` per plan, but note ao binary already lives in
  `infrastructure/executor/` (crate `ao`); an in-binary module vs sibling
  crate is the first architectural decision; (2) where HR CE gets vendored
  (oracles only) and how the pytest oracle suite runs in CI; (3) whether P6a
  lands as one PR or per-driver slices behind a conformance-suite gate.
- Known blockers to clear before starting: none technical; the clerk/identity
  story for the cloud-credentials mode depends on platform work outside this
  queue (same dependency class as P3's server enum — small, needs a named
  owner).

**Standing recommendation:** land P4 → P5 first (both close loops the user
has already asked about — harness byte-parity and the blocked-agent panel),
then gate P7 vs P6a on product priority. P6b is explicitly incremental and
can trail.
