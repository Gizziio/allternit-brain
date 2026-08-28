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
echo "Logs: /Users/joe/.allternit/logs/brain-audit.log"
echo ""
echo "NOTE: macOS TCC may block launchd from accessing ~/Desktop. If the job fails with"
echo "      'Operation not permitted', grant Full Disk Access to /usr/bin/python3 or run"
echo "      the pipeline manually with: make brain-pipeline"
echo "      The post-commit hooks in each repo are the primary automation and are not"
echo "      affected by TCC."
