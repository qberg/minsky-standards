#!/usr/bin/env bash
# Gate baseline. The close bar is "no NEW red", never "all green": a brownfield
# repo is partly red on purpose. Capture the inherited red BEFORE touching code,
# compare at close. Without the snapshot you cannot tell inherited red from yours.
#   baseline.sh capture [pkg...]   snapshot each gate's current PASS|FAIL
#   baseline.sh compare            re-run, flag gates that were PASS but are now FAIL
# SCOPE IT. Root gates in a monorepo are often ALL red, and compare only fires on a
# PASS->FAIL flip: zero PASS gates = a compare that cannot fail = no gate at all.
# Pass the packages you will touch (baseline.sh capture @pm/worker @pm/ai) to get a
# gate with real resolution. The scope is recorded, so compare re-runs the same set.
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel)" || exit 1
SNAP="$ROOT/.git/ship-issue-baseline.txt"   # under .git, so never committed

run_gate() {
  # $1 = label, $2.. = command. Emits "<label> PASS" or "<label> FAIL".
  local label="$1"; shift
  if (cd "$ROOT" && "$@") >/dev/null 2>&1; then echo "$label PASS"; else echo "$label FAIL"; fi
}

snapshot() {
  run_gate typecheck pnpm typecheck
  run_gate lint      pnpm check
  run_gate test      pnpm test
  # Per-package gates: the only ones with enough resolution to separate YOUR red
  # from inherited red when the root gates are already failing.
  local pkg
  for pkg in "$@"; do
    run_gate "typecheck:$pkg" pnpm -F "$pkg" exec tsc --noEmit
    run_gate "test:$pkg"      pnpm -F "$pkg" test
  done
}

warn_if_no_gate() {
  grep -q ' PASS$' "$SNAP" && return 0
  echo "WARNING: every gate is FAIL at baseline, so compare can never flag new red." >&2
  echo "Re-run scoped: baseline.sh capture <pkg>... for the packages you will touch." >&2
}

case "${1:-}" in
  capture)
    shift
    { printf '# scope %s\n' "$*"; snapshot "$@"; } | tee "$SNAP"
    warn_if_no_gate
    echo "baseline saved to $SNAP" >&2
    ;;
  compare)
    [ -f "$SNAP" ] || { echo "no baseline; run: baseline.sh capture" >&2; exit 2; }
    # Re-run the SAME scope the capture used, else compare comes back vacuously green.
    scope="$(awk '/^# scope /{ $1=""; $2=""; print; exit }' "$SNAP")"
    now="$(snapshot $scope)"
    new_red=0
    while read -r label state; do
      [ "$label" = "#" ] && continue
      was="$(awk -v l="$label" '$1==l{print $2}' "$SNAP")"
      if [ "$was" = PASS ] && [ "$state" = FAIL ]; then
        echo "NEW RED: $label (was PASS at baseline)"
        new_red=1
      fi
    done <<< "$now"
    [ "$new_red" = 0 ] && echo "no new red vs baseline"
    exit "$new_red"
    ;;
  *)
    echo "usage: baseline.sh capture|compare" >&2
    exit 64
    ;;
esac
