#!/usr/bin/env bash
# PostToolUse hook: BLOCK comment blocks longer than the repo's threshold.
# Threshold = integer in <repo>/.claude/comment-policy (max consecutive comment
# lines); missing file = 1. Escape: '@comment-block-ok' marker anywhere in file.
set -euo pipefail

input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')
[ -z "$file" ] && exit 0

case "$file" in
*.ts | *.tsx | *.js | *.css | *.sh) ;;
*) exit 0 ;;
esac
[ -f "$file" ] || exit 0

grep -q '@comment-block-ok' "$file" && exit 0

repo_root=$(git -C "$(dirname "$file")" rev-parse --show-toplevel 2>/dev/null || echo "")
threshold=1
if [ -n "$repo_root" ] && [ -f "$repo_root/.claude/comment-policy" ]; then
  policy=$(tr -d '[:space:]' < "$repo_root/.claude/comment-policy")
  case "$policy" in
  '' | *[!0-9]*) ;;
  *) threshold=$policy ;;
  esac
fi

case "$file" in
*.sh)
  runs=$(awk -v max="$threshold" '
    function flush() {
      if (run > max && !exempt) print start ":\t" firsttext
      run = 0; exempt = 0
    }
    {
      line = $0; sub(/^[ \t]+/, "", line)
      if (line ~ /^#/ && NR > 1) {
        if (run == 0) { start = NR; firsttext = $0 }
        run++
        if (run == 1 && line ~ /SPDX|[Cc]opyright|[Ll]icen[sc]e/) exempt = 1
      } else if (line ~ /^#!/) {
        flush()
      } else flush()
    }
    END { flush() }
  ' "$file" || true)
  ;;
*)
  runs=$(awk -v max="$threshold" '
    function flush() {
      if (run > max && !exempt) print start ":\t" firsttext
      run = 0; exempt = 0
    }
    {
      line = $0; sub(/^[ \t]+/, "", line); iscomment = 0
      if (inblock) {
        iscomment = 1
        if (line ~ /\*\//) inblock = 0
      } else if (line ~ /^\/\//) {
        iscomment = 1
      } else if (line ~ /^\/\*/) {
        iscomment = 1
        if (line !~ /\*\//) inblock = 1
      }
      if (iscomment) {
        if (run == 0) { start = NR; firsttext = $0 }
        run++
        if (run == 1 && line ~ /SPDX|[Cc]opyright|[Ll]icen[sc]e/) exempt = 1
      } else flush()
    }
    END { flush() }
  ' "$file" || true)
  ;;
esac

[ -z "$runs" ] && exit 0

{
  echo "Comment block(s) exceeding $threshold consecutive line(s) in $file:"
  echo "$runs"
  echo "Code over comments -- trim to the threshold, or one line for a genuinely non-obvious WHY."
  echo "Escape: '@comment-block-ok' marker anywhere in the file."
} >&2
exit 2
