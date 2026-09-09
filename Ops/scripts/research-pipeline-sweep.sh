#!/bin/bash
# Allternit Brain — mechanical research pipeline weekday sweep
#
# Runs export → ingest → integrity check → dashboard, then writes a sweep
# summary under Research/sweeps/YYYY-MM-DD.md. Does NOT spawn paid executors
# or agent-orchestrator (ao).
#
# Env:
#   AGENT_SWEEP=1              Optional. Enable multi-harness agent advancement
#                              (default OFF so launchd stays safe/cheap).
#   AGENT_SWEEP_HARNESS=auto|grok|kimi|claude|dual
#                              Default **auto**: prefer whichever of grok/kimi/claude
#                              is on PATH; if both grok+kimi exist, use **dual**;
#                              else first available among grok, kimi, claude.
#   AGENT_SWEEP_N              Max items for optional agent advancement (default 3).
#   CLAUDE_CODE_SWEEP=1        Deprecated compat alias → AGENT_SWEEP=1 + harness=claude
#                              (still honored). Prefer AGENT_SWEEP_*.
#   CLAUDE_CODE_SWEEP_N        Deprecated compat alias for AGENT_SWEEP_N when using
#                              the CLAUDE_CODE_SWEEP=1 path.
#   BRAIN_ROOT                 Override brain root (default: derived from script path).
#
# Usage:
#   bash Ops/scripts/research-pipeline-sweep.sh
#   AGENT_SWEEP=1 AGENT_SWEEP_HARNESS=dual bash Ops/scripts/research-pipeline-sweep.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRAIN_ROOT="${BRAIN_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
SCRIPTS="$BRAIN_ROOT/Ops/scripts"
NODE="${NODE:-$(command -v node)}"
TODAY="$(date +%Y-%m-%d)"
SWEEP_DIR="$BRAIN_ROOT/Research/sweeps"
SWEEP_REPORT="$SWEEP_DIR/${TODAY}.md"
QUEUE="$BRAIN_ROOT/Research/queue.json"

mkdir -p "$SWEEP_DIR"
mkdir -p "$BRAIN_ROOT/Research/specs"
mkdir -p "$BRAIN_ROOT/Research/drafts"
mkdir -p "$BRAIN_ROOT/Research/baselines"

echo "== research-pipeline-sweep $TODAY =="
echo "brain: $BRAIN_ROOT"

EXPORT_OUT="$("$NODE" "$SCRIPTS/export-link-ingest-to-research.js")"
echo "$EXPORT_OUT"
INGEST_OUT="$("$NODE" "$SCRIPTS/ingest-research.js")"
echo "$INGEST_OUT"

set +e
INTEGRITY_JSON="$("$NODE" "$SCRIPTS/research-queue-integrity.js" --json)"
INTEGRITY_RC=$?
set -e
echo "integrity_rc=$INTEGRITY_RC"
echo "$INTEGRITY_JSON" | "$NODE" -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{try{const j=JSON.parse(s);console.log(`integrity: ok=${j.ok} errors=${j.errors} warnings=${j.warnings}`)}catch(e){console.log("integrity: parse_error")}})'

# --- Multi-harness agent hook (OFF by default) ---
# Compat: CLAUDE_CODE_SWEEP=1 → AGENT_SWEEP=1 + harness=claude (unless AGENT_SWEEP_HARNESS already set)
if [[ "${CLAUDE_CODE_SWEEP:-0}" == "1" ]]; then
  export AGENT_SWEEP="${AGENT_SWEEP:-1}"
  if [[ -z "${AGENT_SWEEP_HARNESS:-}" ]]; then
    export AGENT_SWEEP_HARNESS="claude"
  fi
  if [[ -z "${AGENT_SWEEP_N:-}" && -n "${CLAUDE_CODE_SWEEP_N:-}" ]]; then
    export AGENT_SWEEP_N="$CLAUDE_CODE_SWEEP_N"
  fi
fi

AGENT_NOTE="skipped (AGENT_SWEEP not set; launchd default)"
AGENT_SWEEP_ENABLED="${AGENT_SWEEP:-0}"
AGENT_HARNESS="${AGENT_SWEEP_HARNESS:-auto}"
N="${AGENT_SWEEP_N:-3}"

has_cmd() { command -v "$1" >/dev/null 2>&1; }

resolve_harness() {
  local want="$1"
  local have_grok=0 have_kimi=0 have_claude=0
  has_cmd grok && have_grok=1
  has_cmd kimi && have_kimi=1
  has_cmd claude && have_claude=1

  case "$want" in
    auto)
      if [[ "$have_grok" -eq 1 && "$have_kimi" -eq 1 ]]; then
        echo "dual"
      elif [[ "$have_grok" -eq 1 ]]; then
        echo "grok"
      elif [[ "$have_kimi" -eq 1 ]]; then
        echo "kimi"
      elif [[ "$have_claude" -eq 1 ]]; then
        echo "claude"
      else
        echo "none"
      fi
      ;;
    grok|kimi|claude|dual)
      echo "$want"
      ;;
    *)
      echo "invalid"
      ;;
  esac
}

SHARED_PROMPT_BODY() {
  local n="$1"
  local harness_label="$2"
  cat <<PROMPT
You are running a research-pipeline pre-gate sweep on Allternit Brain at ${BRAIN_ROOT}.

Follow:
- Projects/link-ingest/PIPELINE.md (canonical stages)
- research-pipeline skill (synced under .claude/skills, ~/.grok/skills, ~/.kimi-code/skills — same content)
- Satellites: baseline-capability, integrate-decision, dual-draft-cherry, spec-to-goal

Harness label for this run: ${harness_label}

Advance up to ${n} inbox or researched queue items through baseline → research → decision → dual drafts (when dual) → spec_ready only.

Hard stop at human gate — never approve, never spawn ao/executors, never confirm:true brain apply. Do not invent fake specs. Honor hard vetoes (paid/signup/Docker/closed license).

For dual harness: write Research/drafts/<slug>--grok.md and --kimi.md for each item (or complete research+decision first if missing), then cherry to --CHERRY.md and promote one Research/specs/<slug>.md + queue status spec_ready.
PROMPT
}

run_grok() {
  local prompt="$1"
  # -p/--single = non-interactive; --cwd brain; auto-approve edits
  if grok -p "$prompt" --cwd "$BRAIN_ROOT" --always-approve </dev/null; then
    return 0
  fi
  # fallback permission mode if --always-approve unsupported in older builds
  grok -p "$prompt" --cwd "$BRAIN_ROOT" --permission-mode acceptEdits </dev/null
}

run_kimi() {
  local prompt="$1"
  if kimi -p "$prompt" -y --add-dir "$BRAIN_ROOT" </dev/null; then
    return 0
  fi
  kimi -p "$prompt" --auto --add-dir "$BRAIN_ROOT" </dev/null
}

run_claude() {
  local prompt="$1"
  (cd "$BRAIN_ROOT" && claude -p "$prompt" --allowedTools "Read,Edit,Write,Bash,Glob,Grep" </dev/null)
}

if [[ "$AGENT_SWEEP_ENABLED" == "1" ]]; then
  RESOLVED="$(resolve_harness "$AGENT_HARNESS")"
  echo "agent_sweep: requested=${AGENT_HARNESS} resolved=${RESOLVED} N=${N}"

  case "$RESOLVED" in
    none)
      AGENT_NOTE="AGENT_SWEEP=1 but no grok/kimi/claude CLI on PATH"
      ;;
    invalid)
      AGENT_NOTE="AGENT_SWEEP_HARNESS invalid (${AGENT_HARNESS}); use auto|grok|kimi|claude|dual"
      ;;
    dual)
      if ! has_cmd grok || ! has_cmd kimi; then
        AGENT_NOTE="harness=dual but grok and/or kimi missing on PATH"
      else
        PROMPT_GROK="$(SHARED_PROMPT_BODY "$N" "grok-dual-pass"). Write only Research/drafts/<slug>--grok.md drafts (and baseline/decision fields as needed). Do not promote specs; cherry comes next."
        PROMPT_KIMI="$(SHARED_PROMPT_BODY "$N" "kimi-dual-pass"). Write only Research/drafts/<slug>--kimi.md drafts (and baseline/decision fields as needed). Do not promote specs; cherry comes next."
        PROMPT_CHERRY="$(SHARED_PROMPT_BODY "$N" "cherry"). For each dual pair under Research/drafts/, write <slug>--CHERRY.md picking winners per section, promote one Research/specs/<slug>.md, set queue status spec_ready. Prefer merging the stronger sections from both drafts."
        set +e
        run_grok "$PROMPT_GROK"
        GROK_RC=$?
        run_kimi "$PROMPT_KIMI"
        KIMI_RC=$?
        # Cherry: prefer grok if available, else kimi
        CHERRY_RC=1
        if has_cmd grok; then
          run_grok "$PROMPT_CHERRY"
          CHERRY_RC=$?
        elif has_cmd kimi; then
          run_kimi "$PROMPT_CHERRY"
          CHERRY_RC=$?
        fi
        set -e
        AGENT_NOTE="dual grok_rc=${GROK_RC} kimi_rc=${KIMI_RC} cherry_rc=${CHERRY_RC} (N=${N})"
      fi
      ;;
    grok)
      if ! has_cmd grok; then
        AGENT_NOTE="harness=grok but grok CLI not found"
      else
        PROMPT="$(SHARED_PROMPT_BODY "$N" "grok")"
        set +e
        run_grok "$PROMPT"
        RC=$?
        set -e
        AGENT_NOTE="grok exit=${RC} (N=${N})"
      fi
      ;;
    kimi)
      if ! has_cmd kimi; then
        AGENT_NOTE="harness=kimi but kimi CLI not found"
      else
        PROMPT="$(SHARED_PROMPT_BODY "$N" "kimi")"
        set +e
        run_kimi "$PROMPT"
        RC=$?
        set -e
        AGENT_NOTE="kimi exit=${RC} (N=${N})"
      fi
      ;;
    claude)
      if ! has_cmd claude; then
        AGENT_NOTE="harness=claude but claude CLI not found"
      else
        PROMPT="$(SHARED_PROMPT_BODY "$N" "claude")"
        set +e
        run_claude "$PROMPT"
        RC=$?
        set -e
        AGENT_NOTE="claude exit=${RC} (N=${N})"
      fi
      ;;
  esac
fi

DASH_OUT="$("$NODE" "$SCRIPTS/research-dashboard.js")"
echo "$DASH_OUT"

export BRAIN_ROOT TODAY EXPORT_OUT INGEST_OUT INTEGRITY_JSON AGENT_NOTE SWEEP_REPORT
python3 - <<'PYREPORT'
import json, os
from pathlib import Path

brain = Path(os.environ["BRAIN_ROOT"])
today = os.environ["TODAY"]
export_out = os.environ.get("EXPORT_OUT", "")
ingest_out = os.environ.get("INGEST_OUT", "")
agent_note = os.environ.get("AGENT_NOTE", "")
report_path = Path(os.environ["SWEEP_REPORT"])

try:
    integrity = json.loads(os.environ.get("INTEGRITY_JSON") or "{}")
except Exception:
    integrity = {"ok": False, "errors": 0, "warnings": 0, "issues": []}

queue = json.loads((brain / "Research" / "queue.json").read_text())
items = queue.get("items") or []
counts = {}
for it in items:
    counts[it.get("status") or "?"] = counts.get(it.get("status") or "?", 0) + 1

def needing(field, statuses):
    return [i["id"] for i in items if not i.get(field) and i.get("status") in statuses]

need_baseline = needing("baseline_ref", {"inbox", "researched"})
need_decision = needing("decision", {"inbox", "researched"})
need_spec = [i["id"] for i in items if not i.get("spec") and i.get("status") in {"inbox", "researched"}]

try:
    j = json.loads(export_out)
    export_summary = (
        f"scanned={j.get('scanned')} appended={j.get('appended')} "
        f"skippedNoUrl={j.get('skippedNoUrl')} skippedBucket={j.get('skippedBucket')} "
        f"skippedDup={j.get('skippedDup')}"
    )
except Exception:
    export_summary = export_out.replace("\n", " ")[:300]

inbox = brain / "Projects" / "link-ingest" / "inbox"
new_inbox = 0
if inbox.exists():
    for p in inbox.rglob("li-*.md"):
        if today in str(p):
            new_inbox += 1

dangling = [
    i for i in integrity.get("issues") or []
    if i.get("kind") in ("dangling_spec", "status_spec_disagree")
]

lines = [
    "---",
    "doc: project",
    f"updated: {today}",
    "status: active",
    "---",
    "",
    f"# Research pipeline sweep — {today}",
    "",
    "Mechanical weekday sweep (`Ops/scripts/research-pipeline-sweep.sh`). Does **not** spawn paid executors.",
    "",
    "## Export / ingest",
    "",
    f"- Export: {export_summary}",
    f"- Ingest: {ingest_out}",
    f"- Inbox cards with today in path: {new_inbox}",
    "",
    "## Queue status counts",
    "",
    "| status | count |",
    "|---|---|",
]
for s in sorted(counts):
    lines.append(f"| {s} | {counts[s]} |")
lines += [
    "",
    f"_Total: {len(items)}_",
    "",
    "## Needs attention",
    "",
    f"- Missing baseline_ref (inbox/researched): {', '.join(need_baseline) if need_baseline else '—'}",
    f"- Missing decision (inbox/researched): {', '.join(need_decision) if need_decision else '—'}",
    f"- Missing spec (inbox/researched): {', '.join(need_spec) if need_spec else '—'}",
    "",
    "## Integrity",
    "",
    f"- ok={integrity.get('ok')} errors={integrity.get('errors', 0)} warnings={integrity.get('warnings', 0)}",
]
if dangling:
    for d in dangling:
        lines.append(f"- [{d.get('severity')}] {d.get('id')}: {d.get('message')}")
else:
    lines.append("- No dangling spec / status-spec disagreements.")
lines += [
    "",
    "## Agent hook",
    "",
    f"- {agent_note}",
    "- Multi-harness opt-in: `AGENT_SWEEP=1` with `AGENT_SWEEP_HARNESS=auto|grok|kimi|claude|dual` (default auto→dual when grok+kimi present).",
    "- Compat: `CLAUDE_CODE_SWEEP=1` still maps to AGENT_SWEEP + harness=claude.",
    "- Prefer interactive `/research-pipeline` for agent stages unless you knowingly enable AGENT_SWEEP.",
    "",
]
report_path.write_text("\n".join(lines), encoding="utf-8")

inbox_n = counts.get("inbox", 0)
researched_n = counts.get("researched", 0)
spec_ready_n = counts.get("spec_ready", 0)
err_n = integrity.get("errors", 0)
print(
    f"sweep {today}: queue={len(items)} inbox={inbox_n} researched={researched_n} "
    f"spec_ready={spec_ready_n} integrity_errors={err_n} report={report_path}"
)
PYREPORT
