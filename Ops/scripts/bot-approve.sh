#!/bin/bash
# bot-approve.sh — scoped approval command for bots (Grok Bot via local-exec).
# This is an ALLOWLIST OF ONE: approve a named spec slug, nothing else.
# The approve CLI itself re-validates (spec exists, status spec_ready).
set -euo pipefail

usage() { echo "usage: bot-approve.sh <slug>   (approve a spec at the human gate)" >&2; exit 1; }

[ "$#" -eq 1 ] || usage
SLUG="$1"
[[ "$SLUG" =~ ^[a-z0-9][a-z0-9-]*$ ]] || { echo "bot-approve: invalid slug" >&2; usage; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRAIN_ROOT="${BRAIN_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"

exec node "$BRAIN_ROOT/Ops/scripts/research-approve.js" "$SLUG"
