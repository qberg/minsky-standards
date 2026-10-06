#!/usr/bin/env bash
# UserPromptSubmit: nudge toward /handoff once the window is large. Reads the last assistant
# turn's usage from the transcript; threshold from MINSKY_HANDOFF_AT (tokens, default 400000).
set -euo pipefail
input=$(cat)
transcript=$(printf '%s' "$input" | jq -r '.transcript_path // empty')
[ -n "$transcript" ] && [ -f "$transcript" ] || exit 0
threshold="${MINSKY_HANDOFF_AT:-400000}"
case "$threshold" in (*[!0-9]*|"") threshold=400000;; esac
# The last assistant line with usage; tail keeps the read cheap on a large transcript.
ctx=$(tail -n 400 "$transcript" | jq -r 'select(.type=="assistant") | .message.usage // empty | ((.input_tokens // 0) + (.cache_read_input_tokens // 0) + (.cache_creation_input_tokens // 0))' 2>/dev/null | tail -n 1)
case "$ctx" in (*[!0-9]*|"") exit 0;; esac
[ "$ctx" -ge "$threshold" ] || exit 0
jq -n --arg c "$ctx" --arg t "$threshold" \
  '{hookSpecificOutput:{hookEventName:"UserPromptSubmit",additionalContext:("Context is at " + $c + " tokens, above the handoff threshold of " + $t + ". Every turn re-reads this window. Finish the step in hand, then run the handoff skill and tell the user to /clear.")}}'
