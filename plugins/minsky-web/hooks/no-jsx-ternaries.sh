#!/usr/bin/env bash
# PostToolUse hook: WARN on ternaries inside JSX return blocks.
# Heuristic (imperfect): a `? ... :` expression on a line that also carries a
# JSX tag, or that sits next to a JSX-tag line, inside a return(...) region.
set -euo pipefail

input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')
[ -z "$file" ] && exit 0

case "$file" in
*.tsx) ;;
*) exit 0 ;;
esac
[ -f "$file" ] || exit 0

grep -q '@ternary-ok' "$file" && exit 0

hits=$(awk '
  function is_jsx(l) { return l ~ /<[A-Za-z]/ }
  function is_ternary(l,    t) {
    t = l
    gsub(/\?\./, "", t)
    gsub(/\?\?/, "", t)
    return t ~ /\?/ && t ~ /:/
  }
  { lines[NR] = $0; total = NR }
  END {
    inregion = 0
    for (i = 1; i <= total; i++) {
      l = lines[i]
      if (!inregion && l ~ /return[ \t]*\(/) inregion = 1
      if (inregion && is_ternary(l)) {
        prev = (i > 1) ? lines[i - 1] : ""
        nxt = (i < total) ? lines[i + 1] : ""
        if (is_jsx(l) || is_jsx(prev) || is_jsx(nxt)) print i ":\t" l
      }
      if (inregion && l ~ /^[ \t]*\)/) inregion = 0
    }
  }
' "$file" || true)

[ -z "$hits" ] && exit 0

{
  echo "Possible ternary branch inside JSX in $file (heuristic, may be a false positive):"
  echo "$hits"
  echo "Hoist the branch to a named const or an early return instead of an inline ternary;"
  echo "&& presence-rendering is fine. Escape: '/* @ternary-ok: reason */' anywhere in the file."
}
exit 0
