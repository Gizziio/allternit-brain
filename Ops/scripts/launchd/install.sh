#!/bin/bash
# Install the nightly brain audit launchd job.

PLIST_SRC="/Users/joe/Desktop/Allternit/Allternit Brain/Ops/scripts/launchd/com.allternit.brain-audit.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/com.allternit.brain-audit.plist"

mkdir -p "$HOME/Library/LaunchAgents"
cp "$PLIST_SRC" "$PLIST_DEST"

launchctl unload "$PLIST_DEST" 2>/dev/null || true
launchctl load "$PLIST_DEST"

# Run once now to verify.
launchctl start com.allternit.brain-audit

echo "Installed and started com.allternit.brain-audit."
echo "Logs: /Users/joe/Desktop/Allternit/Allternit Brain/Ops/scripts/launchd/brain-audit.log"
