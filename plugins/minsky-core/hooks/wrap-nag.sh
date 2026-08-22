#!/usr/bin/env bash
# Stop hook: remind to run /wrap when code changed since the last ceremony.
# Quiet unless BOTH hold: stamp older than 3h AND a code file modified after it.
set -euo pipefail

input=$(cat)
# Never re-block within the same stop cycle (prevents infinite loops).
if [ "$(printf '%s' "$input" | jq -r '.stop_hook_active // false')" = "true" ]; then
  exit 0
fi

git_dir=$(git rev-parse --git-dir 2>/dev/null) || exit 0
stamp="$git_dir/wrap-stamp"

# First run in a repo: baseline silently.
if [ ! -f "$stamp" ]; then
  date +%s > "$stamp"
  exit 0
fi

now=$(date +%s)
last=$(cat "$stamp" 2>/dev/null || echo 0)
case "$last" in (*[!0-9]*|"") last=0;; esac
age=$(( now - last ))
[ "$age" -lt 10800 ] && exit 0

changed=$(find apps packages src 2>/dev/null \
  -name node_modules -prune -o \
  -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' -o -name '*.sql' \) \
  -newer "$stamp" -print -quit)
[ -z "$changed" ] && exit 0

jq -n --arg r "Code changed since the last /wrap ($(( age / 3600 ))h ago). Run the wrap skill (closing ceremony: NOTES.md, debts, gotchas, ADRs, handback), or if nothing needs recording refresh the stamp: date +%s > \"\$(git rev-parse --git-dir)/wrap-stamp\"" \
  '{decision:"block",reason:$r}'
