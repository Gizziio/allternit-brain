#!/bin/bash
# Local, model-free redundant leg for Allternit site monitoring.
# Runs independently of any AI vendor (Claude, kimi, Moonshot) or subscription —
# pairs with the cloud routine (trig_01BewC5EtpeQtKAioSDNAZWZ) so a single
# vendor outage can't take down monitoring entirely. Plain curl, no LLM needed
# for a deterministic status-code check.
#
# DEPLOYMENT NOTE: this file (under ~/Desktop, a TCC-protected folder) is the
# source of truth for editing, but launchd cannot execute scripts or write logs
# under Desktop/Documents/Downloads — confirmed by testing (works fine from
# /tmp, fails under Desktop with "Operation not permitted", no GUI prompt).
# The actually-scheduled copy lives at
# ~/Library/Application Support/Allternit/site-monitor-local.sh (LOG_DIR
# patched to a path under that same directory). After editing THIS file,
# re-copy it there and reapply the LOG_DIR patch, or the deployed job will
# keep running the old version.

set -uo pipefail

LOG_DIR="$HOME/Desktop/Allternit/Allternit Brain/Ops/logs"
LOG_FILE="$LOG_DIR/site-monitor-local.log"
mkdir -p "$LOG_DIR"

TS="$(date '+%Y-%m-%d %H:%M:%S %Z')"
SITES=("https://allternit.com" "https://labs.allternit.com" "https://services.allternit.com")

FAILURES=()
RESULTS=()

for url in "${SITES[@]}"; do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$url" 2>/dev/null || echo "ERR")"
  RESULTS+=("$url [$code]")
  if [[ "$code" != "200" ]]; then
    FAILURES+=("$url [$code]")
  fi
done

SUMMARY="${RESULTS[*]}"
echo "$TS  $SUMMARY" >> "$LOG_FILE"

if [ ${#FAILURES[@]} -gt 0 ]; then
  echo "$TS  ALERT: ${#FAILURES[@]} site(s) unhealthy: ${FAILURES[*]}" >> "$LOG_FILE"
  osascript -e "display notification \"${FAILURES[*]}\" with title \"Allternit site check FAILED\"" 2>/dev/null || true
  exit 1
fi

exit 0
