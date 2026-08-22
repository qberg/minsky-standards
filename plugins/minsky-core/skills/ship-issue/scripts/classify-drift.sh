#!/usr/bin/env bash
# Pre-stage triage. The working tree may hold changes that predate this issue.
# Tag each changed path so `git add` stays explicit and pre-existing drift never
# sweeps into the issue's commits. Prints "DRIFT?  <path>" (likely not this
# issue, leave out) or "CODE    <path>" (likely this issue's work).
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel)" || exit 1
cd "$ROOT" || exit 1

is_drift() {
  # $1 = changed file path. Return 0 if it looks like pre-existing drift that
  # should be LEFT OUT of the issue commits; return 1 if it is this issue's code.
  local f="$1"
  case "$f" in
    # Lockfile + workspace/catalog/build config: entangled churn the user owns.
    pnpm-lock.yaml|pnpm-workspace.yaml|turbo.json|*/turbo.json) return 0 ;;
    # Doc artifacts: stale notes, generated explainers, never an issue's code.
    docs/*|*.md|*.html) return 0 ;;
  esac
  return 1
}

git status --short | while read -r _ path; do
  if is_drift "$path"; then echo "DRIFT?  $path"; else echo "CODE    $path"; fi
done
