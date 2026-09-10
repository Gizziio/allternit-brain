---
doc: project
updated: 2026-09-10
status: draft
---

# P6 prep — HarnessRouter CE / UHP gateway (explore findings)

Prep research for the P6 spec (`Research/specs/ao-uhp-gateway.md`). Read the
plan doc (`Products/AgentOrchestratorRuntime.md` §2.6 + §5 P6) verbatim before
gating. Findings from a local + web explore, 2026-09-10.

## License — CONFIRMED Apache-2.0

`github.com/HarnessRouter/harnessrouter` LICENSE @ HEAD reads "Apache License
Version 2.0, January 2004"; README: *"HarnessRouter Community Edition is
licensed under Apache 2.0. Agent harness CLIs are installed on first launch
and remain subject to their respective upstream licenses."* Vendoring for
reference/oracle is clean; THIRD_PARTY_NOTICES.md attribution still a to-do at
vendor time (repo currently has zero HR mentions).

## NOT vendored anywhere local

No clone under the workspace, Desktop, Downloads, or Documents; repo `vendor/`
only has `session-migrate`. **P6 cannot spec pytest-layout/config-schema
detail from local disk — the spec's vendor step must clone first** (or the
executor's first task is vendor + inventory, with the spec gate on
architecture, not file-level detail).

## Upstream layout (via GitHub API, 341 files)

- `gateway/` — Python+Next.js console + API; `gateway/tests/` ~46 pytest
  files (sessions, workspaces, files, bus, pricing, sql plane).
- `runner/` — per-backend drivers; `runner/tests/` ~29 per-backend files
  (`test_claude_base_url.py`, `test_codex_*`, `test_gemini_build.py`,
  `test_hermes_relay.py`, `test_pi_normalize.py`, `test_qwen_build.py`…).
  This is the per-backend parity oracle the plan references.
- **`protocol/conformance/`** — the UHP conformance suite: pip package
  `uhp_conformance` with a `uhp-conformance` CLI that runs **against any
  server over HTTP**, `--class core|extended|full`, 64 checks, exit 0/1 for
  CI; versioned reports (`harnessrouter-ce-0.3.0.json` … `0.9.0-rc.json`).
  This is the hard-gate oracle: it needs our server over HTTP, no Python
  shipped inside ao.

**UHP = Unified Harness Protocol** (unifiedharnessprotocol.org): OpenAPI 3.1
schemas, versioned spec, OpenAI **Responses-compatible** contract (tasks/runs,
sessions, SSE streaming, files/artifacts, cancellation/recovery,
errors/traces). NOT the internal A:// tier policy — different thing.

## Two-mode credential model → existing gateway code (both modes exist)

The gateway lives in the **main repo**: `cmd/allternit-api/src/llm_gateway/`
(27 modules, ~17.7k LOC; proxy.rs 2967 LOC hot path, provider_routing.rs 644
LOC Hermes-style policy, route_credentials.rs 266 LOC).

- **Mode 1 — user-provided keys: ALREADY LANDED (v1.1 / PR #150).**
  `V134__user_route_credentials.sql`: per-(user,provider) keys sealed
  AES-256-GCM (`token_crypto`, `'plain:'` fallback). Hot-path decrypt in
  route_credentials.rs:131-149; attach at proxy.rs:1737-1743; gizzi turn-level
  only, never persisted on the session.
- **Mode 2 — Allternit-hosted relay keys: exists via Gizzi providers.**
  Request path: ao UHP layer → allternit-api LLM gateway `/v1` (virtual-key
  `ak-…` auth) → Gizzi runtime's configured providers hold upstream keys.
  A:// policy side: `Allternit Brain/Infra/model-routing.md` +
  `Ops/model-routing.json`, mutable via the `model_route` MCP tool.
- P6's "UHP layer owns no keys" therefore means: UHP drivers resolve
  credentials by **reference** (mode selector + provider/user id), never
  storage. No key storage/management UI (human-clarified in
  `steering-p67-addendum-20260909.md`).

## Driver substrate

P1's headless engine (spawn/send/watch over the socket API) is the natural
driver substrate — a UHP turn over a backend is engine semantics with a
protocol face. P6 should reuse the engine's pane/session machinery, not
re-implement it. (Same recommendation as the positioning note.)

## Open decisions for the spec (positioning note + explore)

1. **Crate home:** plan recommends `infrastructure/executor/uhp-gateway/`
   (sibling of crate `ao` at `infrastructure/executor/src/` and `ao-engine`).
   Explore supports sibling crate: in-binary module would bloat the `ao`
   crate and fork-diff guardrail prefers additive workspace members. **Spec
   recommendation: sibling workspace crate, in-process under `ao serve`.**
2. **Vendor location + CI oracle:** recommend `vendor/harnessrouter-ce/`
   (repo already has `vendor/session-migrate` precedent), oracles only, no
   shipped Python; CI step runs `uhp-conformance --class core` over HTTP
   against a booted ao server (P6a gate), Full at P6b end; per-backend pytest
   oracles run in a separate CI job (reference comparison, allowed to be
   advisory at P6a).
3. **PR slicing:** P6a = one PR (UHP core + kimi/claude/codex drivers) gated
   on conformance core-class green + the plan's stream/cancel/resume verify;
   P6b = per-driver PRs behind per-backend pytest parity, conformance class
   rising extended → full.

## Non-goals confirmed

Next.js console code, container entrypoint/per-session-user sandbox,
hosted-service couplings, Python/Node relay internals, key storage UI.
Console UX patterns (per-backend status/model chips, live telemetry) are the
P2 TUI/P5 panel design reference — code not ported.
