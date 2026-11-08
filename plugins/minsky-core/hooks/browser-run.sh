#!/usr/bin/env bash
# PreToolUse on Skill and Bash: a browser run is the user's (user word 2026-09-14), so the tool asks first.
set -euo pipefail
input=$(cat)
is_browser=$(jq -r '(.tool_name == "Skill" and .tool_input.skill == "agent-browser") or (.tool_name == "Bash" and ((.tool_input.command // "") | test("agent-browser")))' <<<"$input")
[ "$is_browser" = "true" ] || exit 0

# A standing grant for one session: `scripts/browser-grant.sh <hours>` writes an expiry epoch under .git/.
# Absolute: a relative ".git" resolves against the command's cwd, so a `cd /tmp` missed the grant.
grant_file="$(git -C "${CLAUDE_PROJECT_DIR:-.}" rev-parse --absolute-git-dir 2>/dev/null)/browser-grant"
if [ -f "$grant_file" ] && [ "$(cat "$grant_file")" -gt "$(date +%s)" ]; then
  jq -n '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"allow",permissionDecisionReason:"Browser grant active for this session (scripts/browser-grant.sh)."}}'
  exit 0
fi

jq -n '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"ask",permissionDecisionReason:"No browser grant is active for this repo. The user grants browser runs with scripts/browser-grant.sh <hours>; until then hand them a numbered runbook, or ask for their word on this run."}}'
