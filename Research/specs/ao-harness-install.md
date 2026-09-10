---
doc: project
updated: 2026-09-10
status: draft
---

# ao-harness-install (P7)

## Goal

P7 of the ao v3 plan (`Products/AgentOrchestratorRuntime.md` §5): port the
first-run installer (HarnessRouter CE's entrypoint install scripts,
version-pinned per backend) to `ao harness install <tool>` — one managed dir,
verify-by-doctor, per-tool license gate (Anthropic-terms and
license-undeclared backends require explicit opt-in). Then the onboarding
lifecycle: install CLI → ao registers it as an executor → P4 harness-sync
fans skills/rules/MCP to it → native-sessions adapter (gizzi 27-adapter
pattern) picks up its session format.

**Verify (plan, verbatim):** clean machine (or clean HOME prefix):
`ao harness install kimi codex` → `ao doctor` green → `ao harness sync`
reaches the new tools → a session started in the installed CLI appears in
native-session listing.

## Source link(s)

- Plan: `Products/AgentOrchestratorRuntime.md` §5 P7, §2.6, §7 (gut list:
  ao update via harness), §8 (license gate row)
- Positioning note: `Research/drafts/prep-p6-p7-positioning.md` — **wins
  over this spec on disagreement** (update this spec if so)
- Prereq spec (landed): `Research/specs/ao-harness-port.md` (P4 — owns the
  16-tool manifest SoT, `ao harness sync|status|uninstall`, byte-parity)
- Native listing (lands with P5): `Research/specs/ao-visibility-peers.md`
  §Binding 3 (catalog list-half port into the `ao` crate)

## Affected repo / surface

- Repo: `Gizziio/allternit-platform` (checkout
  `~/Desktop/allternit-workspace/allternit`)
- Crate: `ao` (`infrastructure/executor/`, sources under `src/ao/`) —
  new `harness/install.rs` (+ doctor checks) beside the P4-landed
  `ao-core/src/harness/` sync machinery
- Manifest: `Ops/harness.json` (Brain) + the repo's verbatim copy — **both
  get new fields; see Binding 2**

## Integrate decision

reverse_engineer (continues queue `rq-20260909-004`; same decision as P6 —
port the installer *logic* to Rust, no shipped Python; HR CE entrypoint
scripts are the reference, version pins are data).

## Binding decisions

1. **Install source of truth:** HarnessRouter CE's per-backend entrypoint
   install scripts, ported to Rust as data + logic: each manifest tool entry
   gains an `install` block — `{ method, pinnedVersion, installArgs,
   verifyCmd }` (exact shape executor's call; keep serde permissive like P4).
   Do NOT shell out to Python. Version pins are explicit data, never
   "latest" — bumping a pin is a manifest edit + doctor surfaces drift.
2. **License tags are missing today (verified 2026-09-10: zero license
   fields in `Ops/harness.json`). Adding them IS a P7 deliverable** — the
   gate input the positioning note flagged. Each tool entry gets
   `license: apache|mit|bsd|proprietary-terms|undeclared` (class
   assignment must cite the upstream license URL in `_convention`-style
   notes; `hermes` and `dsh` start `undeclared` until upstream evidence).
   Gate rule (plan §8): only apache/mit/bsd-class tools install without
   ceremony. `proprietary-terms` (claude — Anthropic terms; also verify
   codebuddy/workbuddy/qoder/antigravity at exec time) and `undeclared`
   require `--accept-terms <tool>` on the command line; the acceptances are
   recorded in the managed dir state file (`accepted-terms.json` — tool,
   license class, pin, timestamp) and doctor re-flags if the pin/class
   changes after acceptance.
3. **One managed dir:** everything P7 installs lives under one root,
   default `~/.ao/harness/` (env override `AO_HARNESS_HOME`; the clean-HOME
   verify uses a mktemp prefix via that env — no real HOME mutation).
   Binaries go in `<root>/bin/`; the dir is prepended to PATH only inside
   ao-spawned subprocesses (executor env), never the user's shell rc.
   Doctor checks: dir exists, each expected binary present + `--version`
   output matches the manifest pin.
4. **No network in unit tests; real network only in the demo.** Install
   fetch is behind a trait so tests inject fixtures; the hard-gate demo does
   the real `kimi` + `codex` installs into the mktemp prefix (whatever HR's
   scripts do — npm global into the managed dir or curl|sh per pin — port
   faithfully, record which in NOTES).
5. **Executor registration is P4 machinery, not new code:** after a
   successful install, the tool's `installed()` check flips true and
   `ao harness sync` fans skills/rules/MCP to it — P4's existing verbs, P7
   just makes more tools pass `installed()`. Do not fork the manifest.
6. **Native-session pickup is P5 machinery:** the verify tail ("session
   started in the installed CLI appears in native-session listing") runs
   against the P5-landed catalog port (`ao native-sessions`-equivalent
   listing). P7 executes **after P5 lands** (positioning note; sequencing
   P4 → P5 → P7 keeps each verify criterion on machinery that exists).
   gizzi-code / Desktop onboarding surfacing stays a follow-on spec per
   plan.
7. **`ao doctor` is the verify surface:** new verb (or P2-era doctor
   extension — whichever exists at exec time) that aggregates: managed dir
   health, per-tool binary+pin match, license acceptance state, and
   sync-reachability of installed tools. "Green" is the plan's gate word.
8. **Fork-diff guardrail applies:** install code is additive `src/ao/`
   surface + manifest data; no engine (herdr crate) edits.

## Explicit non-goals

- gizzi-code / Allternit Desktop onboarding surfacing (follow-on spec after
  P7 proves out locally — plan says this verbatim).
- Auto-update of installed CLIs: pins are static data; updating = manifest
  edit + re-run install. (ao's own self-update via harness is the P0 gut
  list's `src/update.rs` replacement — separate future phase.)
- Installing anything not in the 16-tool manifest; adding tools = manifest
  edit first.
- Windows install methods (macOS/Linux for the demo; note in NOTES if a
  tool's HR script is POSIX-only).

## Verify plan

1. Unit: license-gate matrix — apache-class installs without opt-in;
   `proprietary-terms`/`undeclared` refuse without `--accept-terms` (clear
   error naming the terms), succeed with it; acceptance invalidated when
   the pin changes. Managed-dir layout tests with fixture fetcher.
2. Manifest: both copies (Brain `Ops/harness.json` + repo copy) carry
   `license` + `install` for all 16 tools; conformance test like P4's #7
   catches drift between copies.
3. **Hard gate (plan verify line):** mktemp HOME prefix (`AO_HARNESS_HOME`)
   → `ao harness install kimi codex` (real network, real pins) →
   `ao doctor` green → `ao harness sync` lists kimi+codex as reached →
   start a session in the installed `kimi` binary → it appears in the ao
   native-session listing (P5 catalog). Evidence + screenshots to
   `~/.agent-orchestrator/evidence/ao-harness-install/`.
4. Honest NOTES sentinel `docs/AO_HARNESS_INSTALL_NOTES.md`; ledger
   attestation on land.

## Goal body (paste into /goal when human-approved)

Drive P7 of the ao v3 runtime plan (Allternit Brain/Products/
AgentOrchestratorRuntime.md §5) to a merged PR. Spec:
Research/specs/ao-harness-install.md; positioning note:
Research/drafts/prep-p6-p7-positioning.md (note wins on disagreement).
Implement in the ao crate (infrastructure/executor/, src/ao/): (1)
`ao harness install <tool>` — a Rust port of HarnessRouter CE's
version-pinned per-backend entrypoint install scripts (no shipped Python;
install = `{method, pinnedVersion, installArgs, verifyCmd}` data per tool
added to the 16-tool manifest), everything under one managed dir
(~/.ao/harness/, AO_HARNESS_HOME override, PATH injected only into
ao-spawned subprocesses); (2) per-tool license tags ADDED to the manifest
(verified absent today) with a hard gate: only apache/mit/bsd-class tools
install without `--accept-terms <tool>`; proprietary-terms (claude et al.)
and undeclared (hermes, dsh) require it, recorded in the managed dir with
pin+class+timestamp and re-flagged on pin change; (3) `ao doctor` extended
to verify managed-dir health, binary+pin match, license state, sync
reachability. Executor registration = existing P4 installed() machinery;
native-session pickup = P5 catalog machinery — reuse both, no forks. Hard
gate = the plan verify line: clean HOME prefix (mktemp + AO_HARNESS_HOME),
`ao harness install kimi codex` → doctor green → harness sync reaches them
→ a session started in the installed kimi appears in ao native-session
listing. Network behind a trait (fixtures in unit tests; real install only
in the demo). No engine (herdr crate) changes. Evidence to
~/.agent-orchestrator/evidence/ao-harness-install/. Honest NOTES sentinel
docs/AO_HARNESS_INSTALL_NOTES.md; ledger attestation on land. Harness
rules: no secrets in commits, no rm -rf (mktemp -d), honest failure
reporting.

## Model route

Task class `client_coding_work` → A://C tier (per model-routing.json).
Executor: orchestrated CLI agent in own tmux session + worktree
(`allternit-ao-harness-install`, branch `ao/harness-install`), following
the P0–P5 executor pattern. Execute AFTER P5 lands (Binding 6 sequencing).
