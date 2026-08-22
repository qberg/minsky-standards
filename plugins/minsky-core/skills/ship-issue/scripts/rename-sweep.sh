#!/usr/bin/env bash
# Rename-sweep backstop. A grep with optional-separator + camelCase coverage
# AND a compiler pass; neither alone is sufficient. The regex catches
# foo-bar/foo_bar/foo bar but a separatorless fooBar symbol slips it, so the
# typecheck (TS2724 "did you mean") is the backstop that catches the residue.
#   rename-sweep.sh <oldToken> <newToken>
set -uo pipefail
OLD="${1:?old token required}"
NEW="${2:?new token required}"
ROOT="$(git rev-parse --show-toplevel)" || exit 1
cd "$ROOT" || exit 1

# Insert an optional separator at every camelCase/Pascal boundary so the
# pattern spans fooBar, foo-bar, foo_bar and "foo bar".
to_pattern() { echo "$1" | sed -E 's/([a-z0-9])([A-Z])/\1[-_. ]?\2/g'; }
PAT="$(to_pattern "$OLD")"

echo "== textual residue for /$PAT/ (case-insensitive) =="
grep -rniE "$PAT" --include='*.ts' --include='*.tsx' \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.turbo . \
  || echo "  (none)"

echo "== compiler backstop (TS2724/TS2551 = stale symbol the grep can miss) =="
pnpm typecheck 2>&1 | grep -E 'TS2724|TS2551|error TS' || echo "  (no type errors)"
