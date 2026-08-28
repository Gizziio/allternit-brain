#!/usr/bin/env python3

"""
Allternit Brain — session sync

Bidirectional sync between a chat session and the Brain vault.

--start : reads Dashboard/Now.md and active project docs into a context block.
--end   : writes a session summary to Sessions/ and updates Dashboard/Ships.md.

Usage:
    python3 scripts/session-sync.py --start
    python3 scripts/session-sync.py --end --summary "what we accomplished"
"""

import argparse
import os
import re
from datetime import datetime, timezone
from pathlib import Path

BRAIN_ROOT = Path("/Users/joe/Desktop/Allternit/Allternit Brain")
DASHBOARD_DIR = BRAIN_ROOT / "Dashboard"
SESSIONS_DIR = BRAIN_ROOT / "Sessions"


def read_dashboard_now() -> str:
    path = DASHBOARD_DIR / "Now.md"
    if not path.exists():
        return "_No Dashboard/Now.md yet. Run `make brain-pipeline`."
    text = path.read_text(encoding="utf-8")
    # Strip frontmatter
    text = re.sub(r"^---\s*\n.*?\n---\s*\n", "", text, count=1, flags=re.DOTALL)
    return text.strip()


def start_session() -> None:
    now = read_dashboard_now()
    print("# Allternit Brain — Session Start Context\n")
    print(now)
    print("\n## How to use this\n")
    print("- Read the active work above.")
    print("- Ask the human what they want to focus on.")
    print("- When you finish, run: python3 scripts/session-sync.py --end --summary \"...\"")


def end_session(summary: str | None) -> None:
    SESSIONS_DIR.mkdir(exist_ok=True)
    ts = datetime.now(timezone.utc)
    filename = ts.strftime("%Y-%m-%d_%H%M%S_session.md")
    session_path = SESSIONS_DIR / filename

    summary_text = summary or "_No summary provided. Add one with --summary."

    content = f"""---
doc: session
updated: {ts.strftime("%Y-%m-%d")}
status: active
---

# Session {ts.strftime("%Y-%m-%d %H:%M:%S UTC")}

## Summary

{summary_text}

## Outputs

_List docs created, decisions made, or code shipped._

## Next steps

_What should happen next._
"""
    session_path.write_text(content, encoding="utf-8")

    # Append to Ships dashboard
    ships_path = DASHBOARD_DIR / "Ships.md"
    if ships_path.exists():
        ships_text = ships_path.read_text(encoding="utf-8")
        entry = f"\n## {ts.strftime("%Y-%m-%d")}\n\n- {summary_text}\n"
        ships_text = ships_text.rstrip() + entry
        ships_path.write_text(ships_text, encoding="utf-8")

    print(f"Wrote session log: {session_path}")
    print("Updated Dashboard/Ships.md")


def main():
    parser = argparse.ArgumentParser(description="Allternit Brain session sync")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--start", action="store_true", help="Start a session")
    group.add_argument("--end", action="store_true", help="End a session")
    parser.add_argument("--summary", type=str, help="Session summary (for --end)")
    args = parser.parse_args()

    if args.start:
        start_session()
    elif args.end:
        end_session(args.summary)


if __name__ == "__main__":
    main()
