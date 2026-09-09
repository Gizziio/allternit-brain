---
doc: ops
updated: 2026-09-08
status: draft
---

# VPS portability — research pipeline schedulers (shipped, not activated)

systemd units mirroring the Mac launchd jobs for the research pipeline.
These are **reference units**: nothing here is installed or enabled anywhere.
Adjust the marked placeholders before use.

## What must exist on the VPS

- **node** (the sweep + cycle scripts shell out to `node` for all queue/config ops).
- **The brain repo cloned** at the path used in the units (`/opt/allternit/brain` is a
  placeholder — set `BRAIN_ROOT` and `WorkingDirectory` to the real clone).
- **`bash`, `git`, `awk`, `sed`, `grep`, `tmux`** (tmux only if any agent stage ever runs there).
- **Harness CLIs for agent stages** (`grok` / `kimi` / `claude`) only if the VPS will run
  pre-gate agent advancement. **Execution (the cycle's active mode) should stay
  Mac-bound** unless the target repos and their credentials/SSH deploy keys are moved
  to the VPS — `ao-spawn --worktree`, `claude`, remotes, and notification hooks all
  assume the Mac setup today.
- The same hard rules travel with the scripts: `Research/gate/HALT` kills the cycle,
  `autonomy.mode=shadow` never spawns, and money/client-comms/deploy-confirm gate
  items park automatically.

## How the timers mirror the launchd jobs

| Mac (launchd) | VPS (systemd) |
|---|---|
| `com.allternit.research-pipeline-agent-sweep.plist` — daily 21:37 | `research-pipeline-agent-sweep.timer` — `OnCalendar=*-*-* 21:37:00` |
| `com.allternit.research-pipeline-cycle.plist` — `StartInterval` 1800 + 07:07–21:07 bounds | `research-pipeline-cycle.timer` — `OnCalendar=*-*-* *:0/30:00` |

- Both timers use `Persistent=true` (catch up a missed run after downtime), matching
  launchd's calendar semantics closely enough for a daily/30-min cadence.
- The cycle script self-limits to 07:00–22:00 local by checking `date +%H`, so the
  systemd timer can fire every 30 min around the clock without work leaking into
  quiet hours (same as the StartInterval plist on the Mac).

## Logs

- launchd (Mac): `~/.allternit/logs/<job>.log` + `.error.log`.
- systemd (VPS): journald — `journalctl -u research-pipeline-agent-sweep` and
  `journalctl -u research-pipeline-cycle` (add `-f` to follow).

## Activation checklist (human-driven)

1. Copy the units into `/etc/systemd/system/`, fix `User=` and the `/opt/allternit/brain`
   placeholders, then `systemctl daemon-reload`.
2. **Keep `autonomy.mode=shadow`** in `Ops/config/research-pipeline.json` until the VPS
   leg is verified end-to-end (sweep writes a report; cycle writes a `## Cycle` section
   listing what *would* execute).
3. `systemctl enable --now research-pipeline-agent-sweep.timer research-pipeline-cycle.timer`.
4. Only after shadow output is verified: consider `autonomy.mode=active` — and only if
   the target repos + credentials actually live on the VPS.
