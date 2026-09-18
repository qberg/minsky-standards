---
name: handoff
description: Freeze an OPEN task into a handoff document so a fresh session can continue it without the chat. Use mid-task when the context is large (the context-watch hook says so above the threshold), before /clear, or when handing work to another agent. Not the closing ceremony: wrap files facts down the ladder at session end; handoff freezes where an unfinished task stands. Triggers: "handoff", "hand off", "freeze this", the hook's nudge, "I am about to /clear".
---

# handoff

Cost law: every turn re-reads the whole window, so a 500k window costs five times a 100k one
whatever the turn does. The cure is a shorter session, and a shorter session needs a place to
resume from that is not the chat. That place is a handoff document in the repo, found through
NOTES.md by construction.

## Where it lives

`docs/agents/sessions/<date>-<slug>-handoff.md` in the repo (beside the wrap archives; provenance,
never law), plus ONE line in `docs/agents/NOTES.md` under the epic it belongs to: `RESUME FROM
sessions/<file>` with the next step in ten words. Never the OS temp directory: a temp file cannot
be committed with the work and the next session cannot find it. When the task closes, the wrap
ceremony deletes the NOTES pointer; the file stays as archive.

## What it holds, in this order, each section short

1. **Task and its authority**: the issue, ADR or user word the work answers, by path or number.
2. **Where it stands**: what is built and verified (gate results as one line each), what is
   half-written, in which files (paths with line ranges, never file contents).
3. **The exact next step**: the first action the next session takes, then the two after it.
4. **Decisions made this session that are already recorded**: ADR lines, study sections, commits,
   by path or hash. Reference, never restate: a handoff that copies an ADR goes stale the day the
   ADR is amended.
5. **Decisions made but NOT yet recorded**: record them now, down the ladder, then reference them.
   A handoff is not a home for a decision.
6. **What to distrust first**: unverified claims, extrapolated values, in-flight files of other
   agents, anything a subagent reported that git has not confirmed.
7. **Suggested skills**: which skills the next session should invoke and in what order (`/wrap`,
   `/verify-package`, `/harden-slice`, a repo skill), one line why each.
8. **Redaction**: no keys, passwords, tokens, personal data. Names of staff in fixtures are fine;
   real people's data is not.

If the user passed arguments, they describe what the next session will focus on: shape sections
3 and 7 to that focus.

## After writing

- Run the repo's docs lints (agent-docs, debts) so the NOTES pointer is legal.
- Tell the user: the file path, the one-line next step, and that the session is ready to `/clear`.
- Do not wrap unless the task is closing; do not commit unless the repo delegates commits.

## The threshold

The plugin's `context-watch` hook (UserPromptSubmit) reads the last turn's token usage from the
transcript and nudges above `MINSKY_HANDOFF_AT` tokens (default 400000; set it in the repo's
`.claude/settings.json` `env`). A repo may also set `autoCompactWindow` (a percentage of the
window) as a safety net below the model's default; on a 1M model the default fires too late to
save anything. Handoff plus `/clear` beats compaction: compaction summarises the whole chat once,
while a handoff keeps only what the next step needs and leaves everything else in git.
