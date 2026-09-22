#!/usr/bin/env bash
# PreToolUse on Skill and Bash: a browser run is the user's (user word 2026-09-14), so the tool asks first.
set -euo pipefail
input=$(cat)
is_browser=$(jq -r '(.tool_name == "Skill" and .tool_input.skill == "agent-browser") or (.tool_name == "Bash" and ((.tool_input.command // "") | test("agent-browser")))' <<<"$input")
[ "$is_browser" = "true" ] || exit 0

# A standing grant for one session: `scripts/browser-grant.sh <hours>` writes an expiry epoch under .git/.
grant_file="$(git -C "${CLAUDE_PROJECT_DIR:-.}" rev-parse --git-dir 2>/dev/null)/browser-grant"
if [ -f "$grant_file" ] && [ "$(cat "$grant_file")" -gt "$(date +%s)" ]; then
  jq -n '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"allow",permissionDecisionReason:"Browser grant active for this session (scripts/browser-grant.sh)."}}'
  exit 0
fi

jq -n '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"ask",permissionDecisionReason:"Browser runs are the user'"'"'s (CLAUDE.md, user word 2026-09-14): hand them a numbered runbook and wait for what they saw. Open a browser only on their explicit word for this run."}}'
