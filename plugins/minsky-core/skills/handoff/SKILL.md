---
name: handoff
description: Freeze an OPEN task into a handoff document so a fresh session can continue it without the chat, whether the freeze is an interruption or a PLANNED boundary cut inside a still-live slice to hand the next session a clean context. Use mid-task when the context is large (the context-watch hook says so above the threshold), before /clear, when handing work to another agent, or when a slice is deliberately paused at a context change so the next session opens with the right skill loaded. Not the closing ceremony: wrap files facts down the ladder at session end; handoff freezes where an unfinished task stands. Triggers: "handoff", "hand off", "freeze this", the hook's nudge, "I am about to /clear".
---

> Talking to the founder: follow `handbook/working-with-the-founder.md` (For you: first, real options side by side with a pick, core idea then analogy then example then detail, walkthroughs as a named person, friendly and honest).

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

0. **Boundary**: `planned-inside-slice` or `task-frozen`. The first means the slice is live and
   continues next session; the second means work stopped and may not resume. A
   `planned-inside-slice` handoff MUST carry section 7's first skill and its "still owes" line.
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
7. **Suggested skills**: which skills the next session invokes and in what order (`/wrap`,
   `/verify-package`, `/harden-slice`, a repo skill), one line why each. When the handoff is a
   PLANNED BOUNDARY inside a live slice, this section is REQUIRED to name the FIRST skill and
   the context the next session must load before touching code (for a surface, the craft skill;
   for a new directory, the reference read), plus ONE sentence saying what the slice still owes
   before its checkpoint. A boundary taken to get better context is wasted if the next session
   does not load that context first.
8. **Redaction**: no keys, passwords, tokens, personal data. Names of staff in fixtures are fine;
   real people's data is not.

If the user passed arguments, they describe what the next session will focus on: shape sections
3 and 7 to that focus.

## Lifetime: a handoff dies with its task

A handoff is a frozen OPEN task, so its life is the task's. It lives while NOTES.md points at it;
when the task closes, the wrap ceremony removes the pointer and DELETES the file (git keeps the
history; the wrap's session archive holds the narrative). One open task has at most one handoff:
a later handoff for the same task overwrites the file, never adds a second. A handoff nobody points
at is stale by definition, and the repo's docs lint fails on it (apm `scripts/agent-docs-lint.mjs`:
every `sessions/*-handoff.md` must appear in NOTES.md), so the cleanup is enforced, not remembered.
Left alone the folder would become a second journal, the failure NOTES.md's cap exists to prevent.

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
