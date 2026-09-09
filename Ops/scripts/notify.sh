#!/bin/bash
# Allternit Brain — research pipeline notifier
#
# Usage:
#   bash Ops/scripts/notify.sh "<title>" "<message>"
#
# Always exits 0 — notification failure must never fail the caller.
# Side effects, per Ops/config/research-pipeline.json notify.*:
#   - appends an ISO-ts line to Research/gate/notifications.log (always)
#   - macos banner via osascript            (notify.macos, fire-and-forget)
#   - POST to the rails mail share endpoint (notify.rails_mail, best-effort)
#
# BRAIN_ROOT overrides the brain root (default: derived from script path).

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRAIN_ROOT="${BRAIN_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
TITLE="${1:-research-pipeline}"
MESSAGE="${2:-}"
GATE_DIR="$BRAIN_ROOT/Research/gate"
LOG="$GATE_DIR/notifications.log"
CONFIG_LIB="$BRAIN_ROOT/Ops/scripts/lib/pipeline-config.js"

mkdir -p "$GATE_DIR"
printf '%s %s | %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$TITLE" "$MESSAGE" >> "$LOG"

# Read notify.* from the merged pipeline config (node require, CJS lib).
NOTIFY_JSON="$(node -e 'const {loadConfig}=require(process.argv[1]);process.stdout.write(JSON.stringify(loadConfig(process.argv[2]).notify))' "$CONFIG_LIB" "$BRAIN_ROOT" 2>/dev/null)"
MACOS_ENABLED="$(printf '%s' "$NOTIFY_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{try{process.stdout.write(String(JSON.parse(s).macos))}catch(e){process.stdout.write("true")}})' 2>/dev/null)"
RAILS_ENABLED="$(printf '%s' "$NOTIFY_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{try{process.stdout.write(String(JSON.parse(s).rails_mail))}catch(e){process.stdout.write("true")}})' 2>/dev/null)"

if [[ "$MACOS_ENABLED" == "true" ]]; then
  osascript -e "display notification \"$MESSAGE\" with title \"$TITLE\"" >/dev/null 2>&1 || true
fi

if [[ "$RAILS_ENABLED" == "true" ]]; then
  curl -s -m 3 -X POST http://127.0.0.1:8013/api/rails/mail/share \
    -H 'content-type: application/json' \
    -d "{\"thread\":\"wih:research-pipeline\",\"asset_ref\":\"$MESSAGE\"}" >/dev/null 2>&1 || true
fi

exit 0
