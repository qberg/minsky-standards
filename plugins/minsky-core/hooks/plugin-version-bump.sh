#!/usr/bin/env bash
# Installs resolve to a version-keyed cache copy, so an unbumped plugin edit reaches nobody.
set -euo pipefail

cmd=$(jq -r '.tool_input.command // empty' 2>/dev/null || true)
[ -z "$cmd" ] && exit 0

echo "$cmd" | grep -qE '(^|[[:space:]]|&&|;)git[[:space:]]+commit([[:space:]]|$)' || exit 0
if echo "$cmd" | grep -qE '(^|[[:space:]])[-][-]amend'; then exit 0; fi

git rev-parse --git-dir >/dev/null 2>&1 || exit 0
root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
[ -d "$root/plugins" ] || exit 0

# `git commit -a` bypasses the index, so widen the diff to the whole worktree.
range="--cached"
if echo "$cmd" | grep -qE '[[:space:]]-[a-zA-Z]*a[a-zA-Z]*([[:space:]]|$)'; then range="HEAD"; fi

changed=$(git -C "$root" diff $range --name-only 2>/dev/null || true)
[ -z "$changed" ] && exit 0

# Plugins whose content changed, ignoring the manifest itself.
plugins=$(printf '%s\n' "$changed" \
  | grep -E '^plugins/[^/]+/' \
  | grep -v '/\.claude-plugin/plugin\.json$' \
  | cut -d/ -f2 | sort -u || true)
[ -z "$plugins" ] && exit 0

stale=""
for p in $plugins; do
  manifest="plugins/$p/.claude-plugin/plugin.json"
  [ -f "$root/$manifest" ] || continue

  now=$(jq -r '.version // empty' "$root/$manifest" 2>/dev/null || true)
  was=$(git -C "$root" show "HEAD:$manifest" 2>/dev/null | jq -r '.version // empty' 2>/dev/null || true)

  # New plugin, or an unreadable manifest: nothing to compare against.
  [ -z "$was" ] && continue
  [ -z "$now" ] && continue

  [ "$now" = "$was" ] && stale="$stale $p($now)"
done

[ -z "$stale" ] && exit 0

echo "BLOCKED: plugin content changed without a version bump:$stale" >&2
echo "Installs resolve to ~/.claude/plugins/cache/<marketplace>/<plugin>/<version>, so an unbumped edit never reaches a project. Bump the version in plugins/<name>/.claude-plugin/plugin.json and stage it in the same commit." >&2
exit 2
