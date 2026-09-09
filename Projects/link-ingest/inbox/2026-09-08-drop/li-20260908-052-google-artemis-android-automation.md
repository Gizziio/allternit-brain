---
doc: project
updated: 2026-09-08
status: draft
id: li-20260908-052
title: google/artemis — Android NL automation (MCP)
url: https://github.com/google/artemis
source: chat
batch: 2026-09-08-drop
stage: inbox
bucket: allternit
product_hint: Platform
value_hypothesis: Apache-2.0 Android agent/MCP that drives real devices via NL — candidate for Allternit mobile/browser-automation adjacent capability and IDE harness integration.
next: research
paid_or_signup: null
docker_required: null
constraints_ok: null
decision: null
baseline_ref: null
rq_id: rq-20260909-002
---

## Notes

- raw: https://github.com/google/artemis
- ARTEMIS: natural-language → reliable Android automation; MCP for Antigravity/Codex/Claude Code/Cursor/etc.; AndroidWorld 99%+ claim.
- License: Apache-2.0. Language: Python 3.12+. Local start via `./start.sh` / `uv`; needs Android device or emulator + ADB (not Docker-first from README skim).
- Multimodal models (Gemini/Claude/GPT-4o/Qwen-VL) used for vision/locating — **runtime may need model API keys** even if repo is free; flag in research for paid_or_signup on the *model* path vs core FOSS tree.
- Fit: agent tooling / mobile computer-use; compare to existing browser-automation baseline and Allternit computer-use stack.
