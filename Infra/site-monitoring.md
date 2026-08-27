---
doc: infra/site-monitoring
updated: 2026-08-27
status: active
---

# Site monitoring — two independent legs

**Status note:** Two independent monitoring legs are live.

Built deliberately redundant across vendors after Eoj flagged that relying solely on a Claude subscription/Anthropic cloud infra for business monitoring is a single point of failure.

## Leg 1 — Cloud (Anthropic), model-driven

Routine `trig_01BewC5EtpeQtKAioSDNAZWZ` (RemoteTrigger/`schedule` skill), daily `7 12 * * *` UTC (7:07am America/Chicago). Model `claude-haiku-4-5-20251001` (Phase 5's model-routing policy — a monitoring/report task is the `classification` task class → A://H tier). Self-contained prompt (not the local `.claude/skills/site-monitor` file — the cloud sandbox can't load it), checks `allternit.com`, `labs.allternit.com`, `services.allternit.com` via curl. `Bash`-only tool access, zero credentials. View output: `https://claude.ai/code/routines/trig_01BewC5EtpeQtKAioSDNAZWZ`.

## Leg 2 — Local (this Mac), model-free

`~/Desktop/Allternit/Allternit Brain/Ops/site-monitor-local.sh` (source of truth) → deployed to `~/Library/Application Support/Allternit/site-monitor-local.sh` (the copy launchd actually runs — see the deployment note in the source file's header for why). Registered as `com.allternit.site-monitor` (`~/Library/LaunchAgents/com.allternit.site-monitor.plist`), daily at 19:13 local — deliberately offset ~12h from the cloud leg so a transient outage between checks is caught by whichever leg is due next, not just a shared blind spot. Plain `curl`, zero AI/LLM involvement at all — the task is a deterministic status check, so removing the model dependency entirely is strictly more robust than routing it through any vendor, open-source or not. Logs to `~/Library/Application Support/Allternit/logs/site-monitor-local.log`; sends a macOS notification on any non-200.

**Real macOS gotcha hit and fixed:** launchd-spawned processes do not inherit Terminal's TCC (privacy) grant for the Desktop folder — a script/log path under `~/Desktop` fails with "Operation not permitted" when run by launchd, no GUI prompt, no error until you actually test it. Confirmed by isolating the failure (same setup works from `/tmp`, fails under Desktop). Fix: anything launchd needs to execute or write to must live outside Desktop/Documents/Downloads.

## Why not kimi + a local open-source model as the second leg

Investigated first, per Eoj's ask. `kimi -p` (true one-shot headless) categorically refuses `--yolo`/`--auto` (confirmed firsthand: `error: Cannot combine --prompt with --yolo`) — matches `agent-orchestrator`'s own documented pitfall. Without one of those flags, `-p` hangs indefinitely waiting for tool-approval with no TTY to answer. So kimi can't run as a simple scheduled one-shot; the only autonomous kimi path is a persistent tmux TUI session kept alive plus `ao-send` on a timer — real infrastructure to maintain (surviving reboots, tmux/kimi updates), not a one-line cron entry. kimi does already have a local Ollama provider configured (`ollama/bonsai`, confirmed responsive, ~6s) fully independent of any subscription — worth revisiting if a future monitoring task actually needs reasoning/judgment rather than a deterministic status check, where the added complexity would be justified.

## Also found: this Mac is memory-constrained for concurrent local inference

32GB RAM (M1 Pro), observed at 31GB used / 86MB free with active compression during this investigation — one orphaned `llama-server` process alone was holding 12.6GB idle (0% CPU) from an apparently unrelated `gizzi-code` session. Loading any of the larger pulled models (`qwen-reap-coder` variants, Qwen3-Coder-30B/25B, all 15-18GB) under this pressure would be slower than the already-loaded small `bonsai` (1.2GB), not faster — bonsai being slow was a symptom of system-wide memory contention, not the model choice. Worth freeing idle model processes before assuming a "faster model" is the fix.
