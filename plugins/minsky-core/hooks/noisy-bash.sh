#!/usr/bin/env bash
# PreToolUse on Bash: a bare gate command dumps its whole log into the window. Ask for the quiet
# form: the gate wrapper, or a pipe to tail, head, grep, wc, or a redirect to a file.
set -euo pipefail
input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')
[ -n "$cmd" ] || exit 0
printf '%s' "$cmd" | grep -Eq '(^|[[:space:];&])(pnpm (-F|--filter) [^ ]+ (run )?(test|typecheck|lint|build|check:tokens)|pnpm (test|typecheck|lint|build|check)|vitest run|tsc( |$)|biome check|depcruise|turbo run)' || exit 0
printf '%s' "$cmd" | grep -Eq '(gate\.sh|\| *(tail|head|grep|wc|cut|sed -n)|[^2]> *[^&]|2>&1 *\| |full-log)' && exit 0
jq -n '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"ask",permissionDecisionReason:"Quiet gates (minsky-core verify-package): this command prints a whole log into the window. Use the gate wrapper (`bash <minsky-core>/skills/verify-package/scripts/gate.sh <pkg>`), or pipe to tail/head/grep, or redirect to a file and grep it. Add `# full-log` to the command when a diagnosis truly needs the whole output."}}'
