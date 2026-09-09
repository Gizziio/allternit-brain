#!/bin/bash
# Allternit Brain — research pipeline autonomy cycle
#
# Picks up queue items past the human gate (status `approved`) and runs them
# through execute → review → land using the agent-orchestrator transport.
#
# Modes (Ops/config/research-pipeline.json → autonomy.mode):
#   shadow  (default)  List what WOULD execute; never spawns anything.
#   active             Spawn capped executors, review, merge, land.
#   off                Idle.
#
# Hard boundaries that hold in every mode:
#   - Research/gate/HALT (kill switch) → no-op exit 0.
#   - Specs with UNCHECKED gate items about money/Stripe, client comms, or
#     deploy-confirm are parked, never executed (standing harness gates are
#     never auto-crossed).
#   - brain_updates from executor NOTES go to .incoming/ as drafts only —
#     never auto-applied.
#   - Reviewer independence: the review pass runs on a DIFFERENT harness than
#     the implementer whenever one is on PATH (autonomy.reviewer_preference).
#   - Terminal failures QUARANTINE: worktree + tmux session are preserved for
#     human recovery (ao-send back, or ao-kill --rm-worktree to discard).
#
# Env:
#   BRAIN_ROOT                     Override brain root (default: script location).
#   RESEARCH_CYCLE_IGNORE_HOURS=1  Run outside the 07:00–22:00 local window
#                                  (the launchd job uses StartInterval 1800, so
#                                  the script self-limits by `date +%H`).
#
# Usage:
#   bash Ops/scripts/research-pipeline-cycle.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRAIN_ROOT="${BRAIN_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
SCRIPTS="$BRAIN_ROOT/Ops/scripts"
QJS="$SCRIPTS/research-cycle-queue.js"
NODE="${NODE:-$(command -v node)}"
TODAY="$(date +%Y-%m-%d)"
SWEEP_DIR="$BRAIN_ROOT/Research/sweeps"
SWEEP_REPORT="$SWEEP_DIR/${TODAY}.md"
QUEUE="$BRAIN_ROOT/Research/queue.json"
GATE_DIR="$BRAIN_ROOT/Research/gate"
LOCK_FILE="$BRAIN_ROOT/Research/.run.lock"
NOTIFY="$SCRIPTS/notify.sh"
APPROVE="$SCRIPTS/research-approve.js"
DASHBOARD="$SCRIPTS/research-dashboard.js"
INCOMING="$BRAIN_ROOT/.incoming"

mkdir -p "$SWEEP_DIR" "$GATE_DIR" "$INCOMING"

notify() { # fire-and-forget; a broken notifier never fails the cycle
  if [[ -x "$NOTIFY" ]]; then
    "$NOTIFY" "$1" "$2" >/dev/null 2>&1 || true
  fi
}

# --- single-instance lock (fd 200) -----------------------------------------
# Held by another cycle → exit 0 silently. macOS has no flock(1): fall back to
# an atomic mkdir lock; the fd-200 form is used when flock exists so the
# instruction-level contract (flock -n 200 on Research/.run.lock) holds there.
exec 200>"$LOCK_FILE"
if command -v flock >/dev/null 2>&1; then
  flock -n 200 || exit 0
  LOCK_HELD=fd
  LOCK_DIR=""
else
  LOCK_DIR="$LOCK_FILE.d"
  if ! mkdir "$LOCK_DIR" 2>/dev/null; then
    exit 0
  fi
  LOCK_HELD=dir
fi

CYCLE_SECTION="$(mktemp "${TMPDIR:-/tmp}/research-cycle.XXXXXX")"
cleanup() {
  rm -f "$CYCLE_SECTION"
  if [[ "$LOCK_HELD" == "dir" && -n "$LOCK_DIR" ]]; then
    rmdir "$LOCK_DIR" 2>/dev/null || true
  fi
}
trap cleanup EXIT

report() { # append a line to today's cycle section
  printf '%s\n' "$1" >> "$CYCLE_SECTION"
}

finish_report() { # stamp the section header and append to today's sweep report
  {
    printf '\n## Cycle %s\n\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    cat "$CYCLE_SECTION"
  } >> "$SWEEP_REPORT"
}

# --- kill switch ------------------------------------------------------------
if [[ -f "$GATE_DIR/HALT" ]]; then
  report "- halted: Research/gate/HALT present; cycle no-op"
  finish_report
  exit 0
fi

# --- quiet hours -------------------------------------------------------------
# launchd fires every 30 min via StartInterval; the script no-ops outside
# 07:00–22:00 local. (SetCalendarInterval bounds in the plist are best-effort.)
if [[ -z "${RESEARCH_CYCLE_IGNORE_HOURS:-}" ]]; then
  HOUR=$((10#$(date +%H)))
  if (( HOUR < 7 || HOUR >= 22 )); then
    exit 0
  fi
fi

has_cmd() { command -v "$1" >/dev/null 2>&1; }

# --- config ------------------------------------------------------------------
# Ops/scripts/lib/pipeline-config.js (parallel-built shared contract). Missing
# or broken config degrades to safe shadow defaults — never to active.
CFG_JSON="$("$NODE" -e '
const root = process.argv[1];
let cfg = {};
try {
  cfg = require(root + "/Ops/scripts/lib/pipeline-config.js").loadConfig(root);
} catch (e) {
  cfg = {};
}
process.stdout.write(JSON.stringify(cfg && typeof cfg === "object" ? cfg : {}));
' "$BRAIN_ROOT" 2>/dev/null || printf '{}')"

cfg_field() { # $1 dotted path, $2 default
  FIELD="$1" DEFAULT="$2" CFG_JSON="$CFG_JSON" "$NODE" -e '
    let v;
    try { v = JSON.parse(process.env.CFG_JSON); } catch (e) { v = {}; }
    for (const k of process.env.FIELD.split(".")) v = (v == null) ? undefined : v[k];
    if (v === undefined || v === null || v === "") v = process.env.DEFAULT;
    process.stdout.write(String(v));
  '
}

MODE="$(cfg_field autonomy.mode shadow)"
HARNESS="$(cfg_field autonomy.harness auto)"
SWEEP_MAX_ITEMS="$(cfg_field autonomy.sweep_max_items 3)"
EXEC_MAX_DAY="$(cfg_field autonomy.execute_max_per_day 2)"
EXEC_MAX_CONC="$(cfg_field autonomy.execute_max_concurrent 1)"
REVIEW_SEND_LIMIT="$(cfg_field autonomy.review_sendback_limit 1)"
EXEC_TIMEOUT_MIN="$(cfg_field autonomy.execution_timeout_minutes 60)"
RESUME_MAX="$(cfg_field autonomy.resume_max 2)"
# reviewer_preference arrives as a JSON array (or comma-joined string) — normalize
REVIEWER_PREF="$(cfg_field autonomy.reviewer_preference 'codex claude grok' | tr ',' ' ')"
read -r -a REVIEWER_PREF_ARR <<< "$REVIEWER_PREF"
case "$MODE" in off|shadow|active) ;; *) MODE="shadow";; esac
IMPLEMENTER_HARNESS="claude"

qjs() {
  BRAIN_ROOT="$BRAIN_ROOT" QUEUE="$QUEUE" "$NODE" "$QJS" "$@"
}

# --- mode=off -----------------------------------------------------------------
if [[ "$MODE" == "off" ]]; then
  report "- mode=off: cycle idle"
  finish_report
  exit 0
fi

report "- config: mode=$MODE harness=$HARNESS sweep_max_items=$SWEEP_MAX_ITEMS execute_max_per_day=$EXEC_MAX_DAY execute_max_concurrent=$EXEC_MAX_CONC review_sendback_limit=$REVIEW_SEND_LIMIT execution_timeout_minutes=$EXEC_TIMEOUT_MIN"

if [[ ! -f "$QUEUE" ]]; then
  report "- no queue at $QUEUE; nothing to do"
  finish_report
  exit 0
fi

# --- approvals (human gate output) --------------------------------------------
if [[ -f "$APPROVE" ]]; then
  set +e
  APPROVE_OUT="$("$NODE" "$APPROVE" --consume-all --json 2>/dev/null)"
  APPROVE_RC=$?
  set -e
  # rc 1 = consumed with rejections (still valid output); only treat missing/
  # unparseable output as failure.
  if [[ -n "$APPROVE_OUT" && "$APPROVE_OUT" == *'"approved"'* ]]; then
    read -r APPR_N REJ_N <<<"$(APPROVE_JSON="$APPROVE_OUT" "$NODE" -e '
      let j; try { j = JSON.parse(process.env.APPROVE_JSON); } catch (e) { j = {}; }
      console.log(`${(j.approved || []).length} ${(j.rejected || []).length}`);
    ')"
    report "- approvals consumed: approved=${APPR_N:-0} rejected=${REJ_N:-0}$([[ $APPROVE_RC -ne 0 ]] && printf ' (consumer rc=%s — rejections present)' "$APPROVE_RC")"
    notify "research pipeline: approvals consumed" "approved=${APPR_N:-0} rejected=${REJ_N:-0}"
  else
    report "- approvals consumer failed (rc=$APPROVE_RC); continuing with current queue"
  fi
else
  report "- approvals consumer not found ($APPROVE); skipping"
fi

# --- spec section extraction ---------------------------------------------------
spec_section() { # $1 spec file, $2 heading pattern → body of matching "## <pat>" section
  awk -v pat="$2" '
    /^## / { h = substr($0, 4); insec = (h ~ pat) ? 1 : 0; next }
    insec { print }
  ' "$1"
}

# --- shadow mode ---------------------------------------------------------------
if [[ "$MODE" == "shadow" ]]; then
  SHADOW_OUT="$(qjs shadow --max-day "$EXEC_MAX_DAY" --max-conc "$EXEC_MAX_CONC")"
  WOULD="$(printf '%s\n' "$SHADOW_OUT" | grep '^would_execute ' || true)"
  AWAITING="$(printf '%s\n' "$SHADOW_OUT" | grep '^awaiting_approval ' || true)"
  report "- $(printf '%s\n' "$SHADOW_OUT" | grep '^spawned_today=' || true)"
  if [[ -n "$AWAITING" ]]; then
    report "- awaiting approval: $(printf '%s\n' "$AWAITING" | awk '{printf "%s(%s) ", $2, $3}')"
  fi
  if [[ -n "$WOULD" ]]; then
    SLUGS="$(printf '%s\n' "$WOULD" | awk '{printf "%s ", $3}')"
    report "- shadow: would execute $SLUGS"
    notify "research pipeline cycle (shadow)" "would execute: $SLUGS"
  else
    report "- shadow: would execute (none — no approved items within caps)"
  fi
  if [[ -f "$DASHBOARD" ]]; then
    "$NODE" "$DASHBOARD" >/dev/null 2>&1 || report "- dashboard regen failed"
  fi
  finish_report
  exit 0
fi

# ================= active mode below — executors spawn past this line =================

report "- mode=active: evaluating approved items"

# extract an unchecked gate checklist line mentioning a standing harness gate
gate_blockers() { # $1 spec file → matching unchecked lines (may be empty)
  spec_section "$1" 'Gate checklist' | grep -E '^- \[ \]' | grep -iE 'money|stripe|payment|invoice|client|deploy|comm' || true
}

# first absolute or ~/ path in the spec's "Affected repo / surface" section
spec_repo() { # $1 spec file → absolute repo path or empty
  spec_section "$1" 'Affected repo / surface' \
    | grep -oE '(~/|/)[^ )>,;`]+' \
    | head -1 \
    | sed -e 's/[),.;:]*$//' -e "s|^~|$HOME|" \
    || true
}

write_task_files() { # $1 worktree, $2 slug, $3 spec abs path, $4 repo root
  local wt="$1" slug="$2" spec="$3" repo="$4"
  local acceptance goal_body
  acceptance="$(spec_section "$spec" 'Acceptance criteria')"
  goal_body="$(spec_section "$spec" '/goal')"
  if [[ -z "$goal_body" ]]; then
    goal_body="$(spec_section "$spec" 'Goal')
$acceptance"
  fi
  mkdir -p "$wt/docs"
  {
    printf -- '---\ndoc: project\nupdated: %s\nstatus: active\n---\n\n' "$TODAY"
    printf '# Repo map: %s\n\n' "$slug"
    printf -- '- Generated by `research-pipeline-cycle.sh` (do not hand-edit).\n'
    printf -- '- Repo: `%s`\n- Spec: `%s`\n\n' "$repo" "$spec"
    printf '## Layout (top two levels)\n\n```\n'
    (cd "$wt" && find . -maxdepth 2 -not -path './.git*' -not -path '*/node_modules*' | sort | head -120)
    printf '```\n'
  } > "$wt/docs/research-${slug}-MAP.md"
  {
    printf -- '---\ndoc: project\nupdated: %s\nstatus: active\n---\n\n' "$TODAY"
    printf '# Phase 1 task: %s\n\n' "$slug"
    cat <<'RULES'
## Hard rules (non-negotiable)

No Stripe writes or money actions. No sending client communications. No deploy confirmations. Do not commit or push — the orchestrator handles git.

## Constraints

- no git operations, no builds unless listed, match repo idiom

## Deliverable sentinel protocol

When done, write `docs/research-PLACEHOLDER-NOTES.md` with YAML frontmatter containing exactly these keys:

status: complete | partial | blocked
files_changed: [ ... ]
deviations: [ ... ]
remaining: [ ... ]
brain_updates: [ ... ]

Follow with a short body: what changed, how it was verified, what remains.
Do NOT create the sentinel file yourself — the orchestrator touches
`docs/research-PLACEHOLDER-NOTES.sentinel` when your run ends.

## Milestones

Append milestones to `.allternit/shared-context.md` when that file exists in this repo.

## Goal

RULES
    printf '%s\n' "$goal_body"
  } > "$wt/docs/research-${slug}-PHASE_1_TASK.md"
  # slug is safe (kebab) but keep the placeholder substitution explicit; written
  # portably (no BSD sed -i) so the VPS path keeps working
  tmp_task="$wt/docs/.research-task-tmp"
  sed "s/PLACEHOLDER/$slug/g" "$wt/docs/research-${slug}-PHASE_1_TASK.md" > "$tmp_task" \
    && mv "$tmp_task" "$wt/docs/research-${slug}-PHASE_1_TASK.md"
}

with_timeout() { # $1 secs; rest = command — kills on deadline, returns cmd rc
  local secs=$1
  shift
  "$@" &
  local pid=$! killer
  ( sleep "$secs"; kill "$pid" >/dev/null 2>&1 || true ) &
  killer=$!
  local rc=0
  wait "$pid" 2>/dev/null || rc=$?
  kill "$killer" >/dev/null 2>&1 || true
  wait "$killer" 2>/dev/null || true
  return $rc
}

run_reviewer() { # $1 harness, $2 prompt — runs in the caller's cwd
  case "$1" in
    codex)  with_timeout 600 codex exec "$2" </dev/null ;;
    claude) with_timeout 600 claude -p "$2" --allowedTools "Read,Bash,Glob,Grep" </dev/null ;;
    grok)   with_timeout 600 grok -p "$2" --always-approve </dev/null ;;
    *)      return 127 ;;
  esac
}

review_item() { # $1 worktree, $2 slug, $3 spec abs → sets REVIEW_VERDICT / REVIEW_FINDINGS / REVIEW_HARNESS
  local wt="$1" slug="$2" spec="$3"
  REVIEW_VERDICT="PASS"
  REVIEW_FINDINGS=""
  REVIEW_HARNESS=""
  local porcelain
  porcelain="$(git -C "$wt" status --porcelain 2>/dev/null || true)"
  if [[ -z "$porcelain" ]]; then
    REVIEW_VERDICT="FAIL"
    REVIEW_FINDINGS="worktree has no changes"
  fi
  # syntax gate on changed .js files (node --check does not apply to .ts)
  local changed_js f
  changed_js="$(printf '%s\n' "$porcelain" | awk '$1 != "D" {print $2}' | grep '\.js$' | grep -v node_modules || true)"
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    if ! "$NODE" --check "$wt/$f" >/dev/null 2>&1; then
      REVIEW_VERDICT="FAIL"
      REVIEW_FINDINGS="${REVIEW_FINDINGS}node --check failed: $f. "
    fi
  done <<< "$changed_js"
  # diff footprint vs NOTES files_changed (warn-only)
  local notes files_changed
  notes="$wt/docs/research-${slug}-NOTES.md"
  if [[ -f "$notes" ]]; then
    files_changed="$(awk '/^files_changed:/{f=1;next} /^[A-Za-z_]+:/{f=0} f && /^[[:space:]]*-/{gsub(/^[[:space:]]*-[[:space:]]*/,"");print}' "$notes")"
    if [[ -n "$files_changed" ]]; then
      local diff_names
      diff_names="$( (cd "$wt" && { git diff --name-only HEAD 2>/dev/null; git ls-files --others --exclude-standard 2>/dev/null; }) | sort -u || true)"
      local claimed
      while IFS= read -r claimed; do
        [[ -z "$claimed" ]] && continue
        if ! printf '%s\n' "$diff_names" | grep -qxF "$claimed"; then
          REVIEW_FINDINGS="${REVIEW_FINDINGS}warn: NOTES files_changed lists '$claimed' but no such change in git footprint. "
        fi
      done <<< "$files_changed"
    fi
  else
    REVIEW_FINDINGS="${REVIEW_FINDINGS}warn: NOTES file missing at $notes. "
  fi
  # reviewer harness: pick the first preference entry that is on PATH and
  # differs from the implementer — same-harness review is a collusion blind spot
  local want
  for want in "${REVIEWER_PREF_ARR[@]}"; do
    if [[ "$want" != "$IMPLEMENTER_HARNESS" ]] && has_cmd "$want"; then
      REVIEW_HARNESS="$want"
      break
    fi
  done
  if [[ -z "$REVIEW_HARNESS" ]]; then
    if has_cmd "$IMPLEMENTER_HARNESS"; then
      REVIEW_HARNESS="$IMPLEMENTER_HARNESS"
      report "  - WARNING: same-harness review (no alternate harness on PATH); implementer=$IMPLEMENTER_HARNESS"
      REVIEW_FINDINGS="${REVIEW_FINDINGS}WARNING: same-harness review (no alternate harness on PATH). "
    fi
  fi
  # headless reviewer agent (best effort; scripted gates above are authoritative)
  if [[ -n "$REVIEW_HARNESS" ]]; then
    local rprompt rout rverdict rrc=0 acceptance_txt goal_txt
    # mandated independence line — kept in a variable because a literal
    # apostrophe inside this $(… <<EOF) heredoc breaks bash 3.2 tokenization
    local independ_line="You are the independent reviewer. The implementing agent was a different harness. Verify claims against the actual diff; do not assume the implementer's NOTES are truthful."
    acceptance_txt="$(awk -v pat='Acceptance criteria' '/^## /{h=substr($0,4);insec=(h~pat)?1:0;next} insec{print}' "$spec")"
    goal_txt="$(awk -v pat='^(/)?goal|^Goal' '/^## /{h=substr($0,4);insec=(h~pat)?1:0;next} insec{print}' "$spec")"
    rprompt="$(cat <<REVIEW_EOF
$independ_line

You are reviewing research execution "$slug" in the repo at your current working directory (a scratch git worktree).

## Acceptance criteria from the approved spec
$acceptance_txt

## Task goal
$goal_txt

Steps:
1. Inspect the git diff (git status / git diff). The executor was forbidden from committing, so changes may be uncommitted.
2. Verify the changes actually satisfy every acceptance criterion. Run targeted checks or the fast tests shipped with the repo where feasible; do NOT run builds or installs unless the spec explicitly listed them.
3. Verify docs/research-${slug}-NOTES.md exists with frontmatter keys status, files_changed, deviations, remaining, brain_updates.

Output format: the FIRST line must be exactly PASS or FAIL. Then a short findings list (one per line). Any unmet acceptance criterion → FAIL.
REVIEW_EOF
)"
    rout="$( (cd "$wt" && run_reviewer "$REVIEW_HARNESS" "$rprompt") 2>&1 )" || rrc=$?
    rverdict="$(printf '%s\n' "$rout" | grep -m1 -E '^(PASS|FAIL)\b' || true)"
    if [[ "$rverdict" == "FAIL" ]]; then
      REVIEW_VERDICT="FAIL"
      REVIEW_FINDINGS="${REVIEW_FINDINGS}reviewer($REVIEW_HARNESS): $(printf '%s\n' "$rout" | head -20 | tr '\n' ' '). "
    elif [[ "$rverdict" != "PASS" ]]; then
      REVIEW_FINDINGS="${REVIEW_FINDINGS}warn: reviewer($REVIEW_HARNESS) gave no PASS/FAIL marker (rc=$rrc); scripted gates only. "
    fi
  else
    REVIEW_FINDINGS="${REVIEW_FINDINGS}warn: no reviewer harness on PATH; scripted gates only. "
  fi
}

extract_brain_updates() { # $1 notes abs path, $2 slug → writes .incoming draft, prints note
  local notes="$1" slug="$2"
  NOTES_PATH="$notes" SLUG="$slug" OUT_DIR="$INCOMING" "$NODE" -e '
    const fs = require("fs");
    const path = require("path");
    const notes = process.env.NOTES_PATH;
    const slug = process.env.SLUG;
    if (!fs.existsSync(notes)) { console.log("no NOTES file; no brain_updates extracted"); return; }
    const text = fs.readFileSync(notes, "utf8");
    const m = text.match(/^---\n([\s\S]*?)\n---/);
    let raw = null;
    if (m) {
      const fm = m[1];
      const idx = fm.indexOf("brain_updates:");
      if (idx >= 0) {
        const rest = fm.slice(idx);
        const end = rest.slice(1).search(/\n[A-Za-z_]+:/);
        raw = end >= 0 ? rest.slice(0, end + 1) : rest;
      }
    }
    if (raw == null) { console.log("no brain_updates in NOTES frontmatter"); return; }
    const out = path.join(process.env.OUT_DIR, `research-${slug}-brain-updates.json`);
    fs.writeFileSync(out, JSON.stringify({
      slug,
      extracted_at: new Date().toISOString(),
      source: notes,
      auto_applied: false,
      brain_updates_yaml: raw.trim(),
    }, null, 2) + "\n");
    console.log(`brain_updates drafted to ${out} (NOT auto-applied)`);
  '
}

watch_with_resume() { # $1 id, $2 slug, $3 worktree → sets WATCH_OUT/WATCH_RC; on rc=4 (TIMEOUT)
                      # re-arms ao-watch up to RESUME_MAX times (session/worktree
                      # preserved, NO new instructions sent); each resume → history event
  local id="$1" slug="$2" wt="$3"
  local resumes=0
  set +e
  WATCH_OUT="$(ao-watch "$slug" "$wt/$SENTINELFILE" $(( EXEC_TIMEOUT_MIN * 60 )) 20 2>&1)"
  WATCH_RC=$?
  set -e
  while [[ "$WATCH_RC" -eq 4 && "$resumes" -lt "$RESUME_MAX" ]]; do
    resumes=$((resumes + 1))
    qjs event "$id" resume "note=watch TIMEOUT; resume $resumes/$RESUME_MAX (session+worktree preserved, no new instructions)"
    report "- $id $slug: watch TIMEOUT — resume $resumes/$RESUME_MAX (re-armed, checkpoint state may be in the session)"
    set +e
    WATCH_OUT="$(ao-watch "$slug" "$wt/$SENTINELFILE" $(( EXEC_TIMEOUT_MIN * 60 )) 20 2>&1)"
    WATCH_RC=$?
    set -e
  done
}

quarantine_item() { # $1 worktree, $2 slug, $3 id, $4 reason — terminal failure:
                    # preserve everything, report findings + NOTES excerpt, notify
  local wt="$1" slug="$2" id="$3" reason="$4"
  local notes="$wt/docs/research-${slug}-NOTES.md"
  report "- $id $slug: QUARANTINED — $reason"
  report "  - worktree preserved: $wt (branch ao/$slug, tmux session ao-$slug)"
  report "  - inspect: tmux attach -t ao-$slug | git -C $wt diff"
  report "  - recovery is manual: send back via ao-send, or discard via ao-kill $slug --rm-worktree"
  {
    printf -- '\n### Quarantine: %s (%s) — %s\n\n' "$slug" "$id" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf -- '- reason: %s\n' "$reason"
    printf -- '- worktree: `%s` (preserved)\n' "$wt"
    printf -- '- inspect: `tmux attach -t ao-%s` or `git -C %s diff`\n' "$slug" "$wt"
    printf -- '- recovery: human sends findings back via `ao-send %s "..."`, or discards with `ao-kill %s --rm-worktree`\n' "$slug" "$slug"
    if [[ -f "$notes" ]]; then
      printf -- '- last NOTES excerpt:\n\n```\n'
      head -40 "$notes"
      printf -- '```\n'
    fi
  } >> "$SWEEP_REPORT"
  qjs event "$id" quarantined status=quarantined "worktree=$wt" "note=$reason"
  notify "research-pipeline QUARANTINED $slug" "worktree: $wt — inspect: tmux attach -t ao-$slug or git -C $wt diff; recovery manual: ao-send back or ao-kill $slug --rm-worktree"
}

land_item() { # $1 worktree, $2 slug, $3 id, $4 repo root
  local wt="$1" slug="$2" id="$3" repo="$4"
  local note=""
  extract_brain_updates "$wt/docs/research-${slug}-NOTES.md" "$slug" | while IFS= read -r l; do report "  - $l"; done
  local merged=0 remote default_branch
  if git -C "$wt" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    remote="$(git -C "$repo" remote 2>/dev/null | head -1 || true)"
    if [[ -n "$remote" ]] && with_timeout 30 git -C "$repo" ls-remote "$remote" >/dev/null 2>&1; then
      # executor was forbidden from git ops — the orchestrator commits its work
      if [[ -n "$(git -C "$wt" status --porcelain 2>/dev/null)" ]]; then
        git -C "$wt" add -A
        git -C "$wt" commit -m "research(${slug}): pipeline cycle execution" >/dev/null
      fi
      if with_timeout 60 git -C "$wt" push -u "$remote" "ao/${slug}"; then
        default_branch="$(git -C "$repo" symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^[^/]*/||' || true)"
        if [[ -z "$default_branch" ]]; then
          if git -C "$repo" show-ref --verify --quiet refs/heads/main; then
            default_branch="main"
          else
            default_branch="master"
          fi
        fi
        if (cd "$repo" && git merge --no-ff "ao/${slug}" -m "merge research(${slug}) [pipeline cycle]" >/dev/null 2>&1) \
           && with_timeout 60 git -C "$repo" push "$remote" "$default_branch"; then
          merged=1
        else
          note="merge/push to ${default_branch} failed; branch ao/${slug} is pushed — leaving pr_open"
        fi
      else
        note="push of ao/${slug} failed (no force-push); status stays pr_open"
      fi
    else
      note="no clean remote setup; work left on branch ao/${slug} in ${wt}"
    fi
  else
    note="target is not a git repo; work left in ${wt}"
  fi
  if [[ "$merged" == "1" ]]; then
    set +e
    ao-kill "$slug" --rm-worktree >/dev/null 2>&1
    set -e
    qjs event "$id" landed status=landed "worktree=" "note=merged to default branch"
    report "- $id $slug: landed (merged, worktree removed)"
    notify "research pipeline: landed $slug" "$id merged to default branch"
  else
    qjs event "$id" land_deferred status=pr_open "note=$note"
    report "- $id $slug: pr_open ($note)"
  fi
}

# --- active execution loop -----------------------------------------------------
SHADOW_OUT="$(qjs shadow --max-day "$EXEC_MAX_DAY" --max-conc "$EXEC_MAX_CONC")"
report "- caps: $(printf '%s\n' "$SHADOW_OUT" | grep '^spawned_today=' || true)"

while IFS= read -r LINE; do
  [[ -z "$LINE" ]] && continue
  ID="$(printf '%s\n' "$LINE" | awk '{print $2}')"
  SLUG="$(printf '%s\n' "$LINE" | awk '{print $3}')"
  SPEC_REL="$(printf '%s\n' "$LINE" | awk '{print $4}')"
  SPEC_ABS="$BRAIN_ROOT/$SPEC_REL"

  if [[ ! -f "$SPEC_ABS" ]]; then
    qjs event "$ID" blocked status=blocked "note=spec missing: $SPEC_REL"
    report "- $ID $SLUG: blocked (spec missing)"
    continue
  fi

  # standing harness gates: unchecked money/client-comms/deploy-confirm items park the spec
  BLOCKERS="$(gate_blockers "$SPEC_ABS")"
  if [[ -n "$BLOCKERS" ]]; then
    STEPS="$(printf '%s\n' "$BLOCKERS" | sed 's/^- \[ \] //' | tr '\n' '; ' )"
    qjs event "$ID" parked status=parked "note=unchecked harness gates: $STEPS"
    report "- $ID $SLUG: parked (unchecked harness gates: $STEPS)"
    notify "research pipeline: parked $SLUG" "unchecked gate steps: $STEPS"
    continue
  fi

  REPO="$(spec_repo "$SPEC_ABS")"
  if [[ -z "$REPO" ]]; then
    qjs event "$ID" blocked status=blocked "note=no absolute repo path in spec 'Affected repo / surface'"
    report "- $ID $SLUG: blocked (spec has no target repo path)"
    continue
  fi
  if [[ ! -d "$REPO" ]]; then
    qjs event "$ID" blocked status=blocked "note=target repo not found: $REPO"
    report "- $ID $SLUG: blocked (repo not found: $REPO)"
    continue
  fi
  REPO_ROOT="$(git -C "$REPO" rev-parse --show-toplevel 2>/dev/null || printf '%s' "$REPO")"
  WT_PRE="$(dirname "$REPO_ROOT")/$(basename "$REPO_ROOT")-ao-$SLUG"
  if [[ -d "$WT_PRE" ]] || tmux has-session -t "=ao-$SLUG:" >/dev/null 2>&1; then
    report "- $ID $SLUG: skipped (existing session/worktree; leaving for next cycle)"
    continue
  fi

  TASKFILE="docs/research-${SLUG}-PHASE_1_TASK.md"
  SENTINELFILE="docs/research-${SLUG}-NOTES.sentinel"
  # The worktree does not exist until ao-spawn creates it, and uncommitted task
  # files in the main checkout would not carry into a fresh worktree — so the
  # cmd waits (bounded) for the cycle to drop the task files into the worktree.
  HEADLESS_CMD="i=0; while [ \$i -lt 150 ]; do [ -f $TASKFILE ] && break; sleep 2; i=\$((i+1)); done; if [ ! -f $TASKFILE ]; then echo 'research cycle: task file never appeared' >&2; exit 1; fi; claude -p \"\$(cat $TASKFILE)\" --allowedTools 'Read,Edit,Write,Bash,Glob,Grep' --dangerously-skip-permissions </dev/null; touch $SENTINELFILE"

  report "- $ID $SLUG: spawning executor (repo: $REPO_ROOT)"
  set +e
  SPAWN_OUT="$(ao-spawn --worktree "$SLUG" "$REPO_ROOT" "$HEADLESS_CMD" 2>&1)"
  SPAWN_RC=$?
  set -e
  if [[ $SPAWN_RC -ne 0 ]]; then
    qjs event "$ID" blocked status=blocked "note=ao-spawn failed: $(printf '%s' "$SPAWN_OUT" | tail -1)"
    report "- $ID $SLUG: blocked (ao-spawn failed)"
    continue
  fi
  # ao-spawn's final line is "<session> <workdir> <logfile>", but newer git
  # prints "Preparing worktree…" chatter on stderr ahead of it — match the
  # session-prefixed line rather than assuming it comes first.
  SPAWN_LINE="$(printf '%s\n' "$SPAWN_OUT" | grep -E "^ao-${SLUG} " | tail -1 || true)"
  if [[ -z "$SPAWN_LINE" ]]; then
    qjs event "$ID" blocked status=blocked "note=ao-spawn gave no session line: $(printf '%s' "$SPAWN_OUT" | tail -1)"
    report "- $ID $SLUG: blocked (ao-spawn output unparsable)"
    continue
  fi
  read -r _SESSION WTDIR _LOGFILE <<< "$SPAWN_LINE"

  write_task_files "$WTDIR" "$SLUG" "$SPEC_ABS" "$REPO_ROOT"
  qjs event "$ID" spawned status=executing "worktree=$WTDIR" "branch=ao/$SLUG"
  notify "research pipeline: executing $SLUG" "$ID in $(basename "$WTDIR")"

  watch_with_resume "$ID" "$SLUG" "$WTDIR"
  if [[ "$WATCH_RC" -ne 0 ]]; then
    quarantine_item "$WTDIR" "$SLUG" "$ID" "watch: $WATCH_OUT"
    continue
  fi
  report "- $ID $SLUG: executor finished; reviewing"

  RETRIES=0
  while true; do
    review_item "$WTDIR" "$SLUG" "$SPEC_ABS"
    if [[ "$REVIEW_VERDICT" == "PASS" ]]; then
      qjs event "$ID" pr_open status=pr_open "reviewer=$REVIEW_HARNESS"
      report "- $ID $SLUG: review PASS (reviewer: $REVIEW_HARNESS) → pr_open"
      land_item "$WTDIR" "$SLUG" "$ID" "$REPO_ROOT"
      break
    fi
    report "- $ID $SLUG: review FAIL (reviewer: $REVIEW_HARNESS): $REVIEW_FINDINGS"
    if (( RETRIES >= REVIEW_SEND_LIMIT )); then
      quarantine_item "$WTDIR" "$SLUG" "$ID" "review failed after $RETRIES send-back(s): $REVIEW_FINDINGS"
      break
    fi
    RETRIES=$((RETRIES + 1))
    rm -f "$WTDIR/$SENTINELFILE"
    FIX_MSG="Review FAILED for $SLUG. Fix these findings, keep docs/research-${SLUG}-NOTES.md frontmatter current (status/files_changed/deviations/remaining/brain_updates), and complete the task. Findings: $REVIEW_FINDINGS"
    set +e
    ao-send "$SLUG" "$FIX_MSG" >/dev/null 2>&1
    SEND_RC=$?
    set -e
    if [[ $SEND_RC -ne 0 ]]; then
      quarantine_item "$WTDIR" "$SLUG" "$ID" "review failed; retry send-back could not reach session (pane dead?): $REVIEW_FINDINGS"
      break
    fi
    report "- $ID $SLUG: findings sent back (retry $RETRIES/$REVIEW_SEND_LIMIT); re-watching"
    watch_with_resume "$ID" "$SLUG" "$WTDIR"
    if [[ "$WATCH_RC" -ne 0 ]]; then
      quarantine_item "$WTDIR" "$SLUG" "$ID" "retry watch: $WATCH_OUT"
      break
    fi
  done
done < <(printf '%s\n' "$SHADOW_OUT" | grep '^would_execute ' || true)

# --- dashboard -------------------------------------------------------------------
if [[ -f "$DASHBOARD" ]]; then
  "$NODE" "$DASHBOARD" >/dev/null 2>&1 || report "- dashboard regen failed"
fi

finish_report
