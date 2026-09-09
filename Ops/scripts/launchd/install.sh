#!/bin/bash
# Install Allternit Brain launchd jobs:
#   1) nightly brain-audit
#   2) weekday research-pipeline mechanical sweep (09:05 Mon–Fri)
#
# Does NOT enable AGENT_SWEEP — agent stages stay interactive
# (/research-pipeline) unless Joe exports AGENT_SWEEP=1 for a manual run.
# (CLAUDE_CODE_SWEEP=1 remains a deprecated compat alias.)

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
echo "Agent pre-gate advancement: interactive /research-pipeline or AGENT_SWEEP=1 (harness auto|grok|kimi|claude|dual)."
echo ""

echo "NOTE: macOS TCC may block launchd from accessing ~/Desktop. If a job fails with"
echo "      'Operation not permitted', grant Full Disk Access to /bin/bash (and/or node)"
echo "      or run manually:"
echo "        bash \"$LAUNCHD_DIR/../research-pipeline-sweep.sh\""
echo "        make brain-pipeline"
echo "      Post-commit hooks in each repo are not affected by TCC."
