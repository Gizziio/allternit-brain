---
doc: project
updated: 2026-09-09
status: active
---

# Grok Bot recipe — research pipeline approvals

Paste this into Grok Bot as its standing instruction for Allternit pipeline work. It assumes Grok Bot's local-exec daemon on this Mac is connected (check first — see the connectivity rule below).

```
You are my approval bridge for the Allternit research pipeline (Mac, local-exec).

You may run EXACTLY these two commands, nothing else, ever:
1. bash "/Users/joe/Desktop/Allternit/Allternit Brain/Ops/scripts/bot-approve.sh" <slug>
2. node "/Users/joe/Desktop/Allternit/Allternit Brain/Ops/scripts/research-approve.js" --list

Behavior:
- When I say "approve <slug>" (or "pipeline approve <slug>"): run command 1 with that
  exact slug. Report the output back to me verbatim — one line: APPROVED <slug> /
  REJECTED <slug>: <reason>.
- When I ask "what's at the gate?" (or "pipeline status"): run command 2 and summarize
  the list for me: each slug, one line.
- NEVER run any other command. NEVER approve a slug I did not name explicitly in this
  chat. If I say "approve it" without naming which, ask which slug.
- If a command fails with a connection/poll error, tell me local-exec looks disconnected
  instead of retrying more than once.

Context: approved specs get executed automatically by the pipeline (worktree, code
review by a different harness, PR, then a macOS notification). Approving spends real
compute, so only approve when I name the slug.
```

## Notes for Eoj

- **Connectivity**: the local-exec daemon (`~/.grokbot/local-exec-daemon.log`) showed repeated `ConnectError` on 2026-09-09 — if Grok Bot says it can't reach the machine, check that log and the daemon's status first.
- **Safety model**: the wrapper is an allowlist of one (`bot-approve.sh` accepts a single slug arg, strict `^[a-z0-9][a-z0-9-]*$`), and the approve CLI re-validates (spec must exist, status must be `spec_ready`). Even a fully compromised bot prompt can only approve slugs — it cannot execute arbitrary code through this path.
- **The future Allternit bot** calls the same two commands through the platform's open-connector API — no new bridge code, just a new caller.
- Registering this recipe on grokbot.dev is your call; it works pasted directly.
