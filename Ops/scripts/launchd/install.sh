#!/bin/bash
# Install Allternit Brain launchd jobs:
#   1) nightly brain-audit
#   2) weekday research-pipeline mechanical sweep (09:05 Mon–Fri)
#   3) daily research-pipeline agent sweep (21:37; config-driven agent stages)
#   4) research-pipeline autonomy cycle (every 30 min, 07:00–22:00 self-limited)
#
# Idempotent: each plist is unloaded-if-loaded, re-copied, then loaded.
#
# Safety: the autonomy cycle ships in autonomy.mode=shadow by default — it
# lists what WOULD execute and never spawns executors until the config is
# deliberately switched to active. Agent pre-gate stages are driven by
# Ops/config/research-pipeline.json (AGENT_SWEEP* env vars remain manual
# overrides). (CLAUDE_CODE_SWEEP=1 remains a deprecated compat alias.)

set -euo pipefail

LAUNCHD_DIR="/Users/joe/Desktop/Allternit/Allternit Brain/Ops/scripts/launchd"
AGENTS_DIR="$HOME/Library/LaunchAgents"
LOG_DIR="$HOME/.allternit/logs"

mkdir -p "$AGENTS_DIR" "$LOG_DIR"

install_plist() {
  local label="$1"
  local src="$LAUNCHD_DIR/${label}.plist"
  local dest="$AGENTS_DIR/${label}.plist"
  if [[ ! -f "$src" ]]; then
    echo "Missing plist: $src" >&2
    exit 1
  fi
  cp "$src" "$dest"
  launchctl unload "$dest" 2>/dev/null || true
  launchctl load "$dest"
  echo "Installed $label → $dest"
}

echo "=== brain-audit (nightly 06:17) ==="
install_plist "com.allternit.brain-audit"
# Run once now to verify (existing behavior).
launchctl start com.allternit.brain-audit || true
echo "Logs: $LOG_DIR/brain-audit.log (+ .error.log)"
echo ""

echo "=== research-pipeline-sweep (weekdays 09:05) ==="
install_plist "com.allternit.research-pipeline-sweep"
echo "Logs: $LOG_DIR/research-pipeline-sweep.log (+ .error.log)"
echo "Mechanical only by default (export→ingest→integrity→dashboard)."
echo "Agent pre-gate advancement: interactive /research-pipeline, config"
echo "autonomy.mode=active, or AGENT_SWEEP=1 (harness auto|grok|kimi|claude|dual)."
echo ""

echo "=== research-pipeline-agent-sweep (daily 21:37) ==="
install_plist "com.allternit.research-pipeline-agent-sweep"
echo "Logs: $LOG_DIR/research-pipeline-agent-sweep.log (+ .error.log)"
echo "Same sweep script; config autonomy.mode drives whether agent stages run:"
echo "off = mechanical only, shadow = agent stages skipped (note in report),"
echo "active = pre-gate advancement via config harness/sweep_max_items."
echo ""

echo "=== research-pipeline-cycle (every 30 min, self-limited 07:00–22:00) ==="
install_plist "com.allternit.research-pipeline-cycle"
echo "Logs: $LOG_DIR/research-pipeline-cycle.log (+ .error.log)"
echo "Approvals → execute → review → land. Ships shadow (never spawns) until"
echo "autonomy.mode=active is set deliberately in Ops/config/research-pipeline.json."
echo "Kill switch: touch 'Research/gate/HALT' in the brain vault."
echo ""

echo "NOTE: macOS TCC may block launchd from accessing ~/Desktop. If a job fails with"
echo "      'Operation not permitted', grant Full Disk Access to /bin/bash (and/or node)"
echo "      or run manually:"
echo "        bash \"$LAUNCHD_DIR/../research-pipeline-sweep.sh\""
echo "        bash \"$LAUNCHD_DIR/../research-pipeline-cycle.sh\""
echo "        make brain-pipeline"
echo "      Post-commit hooks in each repo are not affected by TCC."
