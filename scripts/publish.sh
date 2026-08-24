#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/publish.sh patch|minor [plugin-name]

BUMP="${1:?Usage: publish.sh patch|minor [plugin-name]}"
SPECIFIC_PLUGIN="${2:-}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MARKETPLACE="$REPO_ROOT/.claude-plugin/marketplace.json"

if [[ "$BUMP" != "patch" && "$BUMP" != "minor" ]]; then
  echo "Error: first arg must be 'patch' or 'minor'" >&2
  exit 1
fi

bump_version() {
  local current="$1"
  local major minor patch
  IFS='.' read -r major minor patch <<< "$current"
  if [[ "$BUMP" == "minor" ]]; then
    echo "$major.$((minor + 1)).0"
  else
    echo "$major.$minor.$((patch + 1))"
  fi
}

bumped=()

for plugin_json in "$REPO_ROOT"/plugins/*/.claude-plugin/plugin.json; do
  plugin_dir="$(dirname "$(dirname "$plugin_json")")"
  plugin_name="$(basename "$plugin_dir")"

  if [[ -n "$SPECIFIC_PLUGIN" && "$plugin_name" != "$SPECIFIC_PLUGIN" ]]; then
    continue
  fi

  # Skip plugins with no changes since last commit
  if [[ -z "$SPECIFIC_PLUGIN" ]] && git -C "$REPO_ROOT" diff --quiet HEAD -- "$plugin_dir" 2>/dev/null; then
    continue
  fi

  current=$(grep -o '"version": "[^"]*"' "$plugin_json" | head -1 | cut -d'"' -f4)
  next=$(bump_version "$current")

  sed -i "s/\"version\": \"$current\"/\"version\": \"$next\"/" "$plugin_json"
  echo "  $plugin_name: $current -> $next"
  bumped+=("$plugin_name")
done

if [[ ${#bumped[@]} -eq 0 ]]; then
  echo "No plugins to bump."
  exit 0
fi

# Stage and commit
git -C "$REPO_ROOT" add plugins/*/.claude-plugin/plugin.json
git -C "$REPO_ROOT" commit -m "chore: bump ${bumped[*]} ($BUMP)"

# Read marketplace org name
org=$(python3 -c "import json; print(json.load(open('$MARKETPLACE'))['name'])" 2>/dev/null || echo "minsky")

echo ""
echo "Run in each consuming repo:"
for name in "${bumped[@]}"; do
  echo "  claude plugin update \"${name}@${org}\" --scope project"
done
