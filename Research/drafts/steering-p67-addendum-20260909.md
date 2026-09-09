---
doc: project
updated: 2026-09-09
status: active
---

# Steering: P6/P7 addendum to the ao v3 spec — for the ao orchestrator session

From: kimi interactive session (Allternit Brain vault work)
To: ao orchestrator (session_47865698-2bc2-49b4-b5d6-ae36d2deb2a3) + P2 TUI/machines executor
Date: 2026-09-09

## What changed in the spec/plan today (all committed in Allternit Brain)

1. **P6 + P7 added to `Products/AgentOrchestratorRuntime.md` §5** (pointer bullets in `Research/specs/allternit-runtime-fork.md` phased plan):
   - **P6 — UHP execution layer, Rust port.** Implement the HarnessRouter CE capability in Rust inside the ao binary (new workspace crate, home at P6 gate; recommended `infrastructure/executor/uhp-gateway/`). HR CE (`github.com/HarnessRouter/harnessrouter`, Apache-2.0) is the **reference implementation + parity oracle only** — protocol docs, per-backend pytest suite, and the UHP conformance suite run against our server. **No shipped Python.** Phased P6a (core + kimi/claude/codex drivers) / P6b (remaining backends, each gated on pytest parity).
   - **P7 — harness auto-install + onboarding:** `ao harness install <tool>` from HR's first-run installer; license-gated per tool (Claude Code = Anthropic terms, Hermes = undeclared → explicit opt-in).
2. **Both are future phases with their own named specs and gates. P0–P2 scope is unchanged** — nothing in the landed P0/P1 work or the in-flight P2 needs redoing.
3. **Credential model (§2.6, human-clarified):** two legitimate homes — (1) native authed CLI runtimes (the user's own logins/subscriptions; how ao drives kimi/claude/codex today), (2) Allternit cloud credentials on the platform plan (platform.allternit.com) via the Allternit gateway + A:// policy. The UHP layer owns no keys. Do **not** build key storage/management UI for it.

## P2-relevant right now

- **Design reference (§2.6):** HR's console UX for the system-harness catalog — per-backend status/model chips and live telemetry per harness (turn stream: commands run, files touched, tokens, cost) — is the reference for the **TUI face (P2)** and the P5 visibility panel. Console *code* is not ported; the patterns are.
- **Icons harvested:** the brains' actual marks (claude, codex, gemini, qwen, deepseek, opencode, cline, pi, omp, hermes, cursor) now live at `~/Desktop/Allternit/Allternit Assets/Brand/Third-Party/harness-brains/` with a provenance README (trademark/nominative-use note; Hermes identify-only until license clears). **Use these icons on harness/agent surfaces in the TUI** so a Claude harness reads as Claude everywhere.

## Why you're getting this

The human asked to confirm the spec edits reached the work. P1 landed (PR #205) after the spec/plan edits were committed, so the landed work already read the current docs — this note is so the orchestrator and P2 executor explicitly account for the addendum (icons + UX reference in P2; P6/P7 in phase sequencing) rather than discovering it incidentally.

## Action

- Orchestrator: acknowledge in the next checkpoint; make sure the P2 spec (written at its gate) references §2.6 design notes and the icon assets; keep P6/P7 as separate gated phases behind P2–P5 per the plan's own ordering.
- No interruption to in-flight P2 work is needed beyond reading this.
