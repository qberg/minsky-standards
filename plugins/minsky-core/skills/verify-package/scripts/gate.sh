#!/usr/bin/env bash
# Quiet gates: run a package's gates, keep the verdict, send the log to a file.
# Usage: gate.sh <pnpm-filter> [gate ...]        gates default: typecheck lint test check:tokens
#        gate.sh run "<label>" "<command>"        any command, same summary
# Prints at most ~20 lines: PASS/FAIL per gate with seconds, then the first 15 telling lines of
# the first failure. Full logs: /tmp/gate/<label>.log. Exit 1 if any gate failed.
set -uo pipefail
mkdir -p /tmp/gate
TELL='error|Error|FAIL|×|✗|violation|RED|failed|Cannot|not found'
summarise() {
  local label="$1" code="$2" secs="$3" log="$4"
  if [ "$code" -eq 0 ]; then
    printf 'PASS  %-28s %3ss\n' "$label" "$secs"
  else
    printf 'FAIL  %-28s %3ss  (log: %s)\n' "$label" "$secs" "$log"
  fi
}
run_one() {
  local label="$1"; shift
  local log="/tmp/gate/$(printf '%s' "$label" | tr '/@: ' '____').log"
  local start=$(date +%s)
  "$@" >"$log" 2>&1
  local code=$?
  summarise "$label" "$code" "$(( $(date +%s) - start ))" "$log"
  if [ "$code" -ne 0 ] && [ -z "${SHOWN:-}" ]; then
    SHOWN=1
    echo "----- first telling lines of $label"
    (grep -E "$TELL" "$log" | head -15; [ "$(grep -cE "$TELL" "$log")" -eq 0 ] && tail -15 "$log") | cut -c1-200
    echo "-----"
  fi
  return "$code"
}
failed=0
if [ "${1:-}" = "run" ]; then
  run_one "$2" bash -c "$3" || failed=1
else
  pkg="${1:?pnpm filter, e.g. @apm/vertex}"; shift
  gates=("$@"); [ ${#gates[@]} -eq 0 ] && gates=(typecheck lint test check:tokens)
  dir=$(pnpm -F "$pkg" exec pwd 2>/dev/null | tail -n 1)
  for g in "${gates[@]}"; do
    if [ -n "$dir" ] && ! node -e "process.exit(require('$dir/package.json').scripts?.['$g'] ? 0 : 1)"; then
      printf 'SKIP  %-28s (no script)\n' "$pkg $g"; continue
    fi
    run_one "$pkg $g" pnpm -F "$pkg" run "$g" || failed=1
  done
fi
exit "$failed"
