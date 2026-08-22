#!/usr/bin/env bash
# ship-issue session guard, wired as a PreToolUse:Bash hook in SKILL.md.
# Converts the two most-repeated NEVER rules from prose into enforcement:
# no blanket staging (sweeps unrelated drift in), no branch creation (commit
# to the current branch unless the user asked). Exit 2 blocks the call and
# feeds the reason back to Claude.
set -uo pipefail
INPUT="$(cat)"
if command -v jq >/dev/null 2>&1; then
  CMD="$(jq -r '.tool_input.command // empty' <<<"$INPUT")"
else
  CMD="$(grep -oE '"command"[[:space:]]*:[[:space:]]*"[^"]*"' <<<"$INPUT" \
        | head -1 | sed -E 's/.*:[[:space:]]*"(.*)"/\1/')"
fi

block() { echo "ship-issue guard: $1" >&2; exit 2; }

# Blanket staging defeats the explicit-path commit rule (references/shipping.md).
if echo "$CMD" | grep -qE '\bgit[[:space:]]+add[[:space:]]+(-A|--all|\.|:/)([[:space:]]|$)'; then
  block "no 'git add -A/.'; stage explicit paths so unrelated drift stays out."
fi

# Branch creation: ship-issue commits to the CURRENT branch (SKILL phase 6).
if echo "$CMD" | grep -qE '\bgit[[:space:]]+(checkout[[:space:]]+-b|switch[[:space:]]+-c|branch[[:space:]]+[^-])'; then
  block "no new branch; commit to the current branch unless the user asked for one."
fi

exit 0
