#!/usr/bin/env bash
# Subagent waves (handbook process law): caps live subagents per session; SubagentStart/Stop keep the ledger exact.
set -euo pipefail
MAX="${MINSKY_WAVE_MAX:-4}"
STALE_SECONDS=1800
input="$(cat)"
session="$(jq -r '.session_id // "nosession"' <<<"$input")"
event="$(jq -r '.hook_event_name // ""' <<<"$input")"
ledger="${TMPDIR:-/tmp}/minsky-agent-wave-${session}.ledger"
touch "$ledger"

prune_stale() {
  local now cutoff
  now="$(date +%s)"; cutoff=$((now - STALE_SECONDS))
  awk -v c="$cutoff" '$2 >= c' "$ledger" > "$ledger.tmp" && mv "$ledger.tmp" "$ledger"
}

live_count() { prune_stale; wc -l < "$ledger" | tr -d ' '; }

deny() {
  jq -n --arg r "$1" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
}

case "$event" in
  PreToolUse)
    n="$(live_count)"
    if [ "$n" -ge "$MAX" ]; then
      deny "Subagent wave is full ($n live, max $MAX). Wait for a running agent to report, then launch the next wave (handbook process law, 2026-09-12)."
    fi
    ;;
  SubagentStart)
    id="$(jq -r '.agent_id // empty' <<<"$input")"
    [ -n "$id" ] && printf '%s %s\n' "$id" "$(date +%s)" >> "$ledger"
    ;;
  SubagentStop)
    id="$(jq -r '.agent_id // empty' <<<"$input")"
    [ -n "$id" ] && { grep -v "^$id " "$ledger" > "$ledger.tmp" || true; mv "$ledger.tmp" "$ledger"; }
    ;;
esac
exit 0
