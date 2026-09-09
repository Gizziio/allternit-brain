---
doc: ops
updated: 2026-09-08
status: active
---

# Research gate

Human approval surface for the research pipeline. Nothing here executes anything — these are signals a human (or the approval CLI) leaves for the pipeline.

- `HALT` — kill switch. If this file exists, all pipeline advancement stops; remove it to resume.
- `approvals/` — drop a file named `<slug>.approve` (optional one-line note as its content) to approve that queue item. `Ops/scripts/research-approve.js --consume-all` applies every dropped file and moves it to `approvals/applied/<slug>.<ts>.approve`.
- `notifications.log` — append-only log of pipeline notifications (one ISO-timestamped line per event). Never edit or truncate.
