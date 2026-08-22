---
name: wrap
description: Session closing ceremony. Routes everything learned or left owed this session into its git-tracked home (NOTES.md state of play, debts ledger, gotcha compendia, ADRs), then hands back the tree. Use at the end of a session or epic, when the user says "wrap", "wrap up", "close out", "closing ceremony", or before walking away from a substantial work session.
---

# wrap

Closing ceremony. One pass, five checks, then stamp. The goal: no fact leaves the
session living only in chat or in your head. Skip any check that has nothing; never
skip the pass.

Paths below follow the org information ladder (`docs/agents/` in the repo). If this
repo lacks them, create the missing file from its sibling's shape.

## The five checks

1. **State of play** (`docs/agents/NOTES.md`): update every epic line this session
   touched; add resume-here pointers; DELETE lines for anything that shipped (git
   history is the record). Respect the file's line cap; prune now, not later.
2. **Owed work** (`docs/agents/debts.md`): anything left undone that someone must
   remember: feel-gates, deploys, migrations, reviews, follow-ups. One line each,
   right section, source cited. If it is already an issue, pointer only.
3. **Traps** (`docs/agents/gotchas/`): a non-obvious failure that cost real time gets
   an entry in the matching compendium, with its receipt (doc, ADR, URL, or the
   command that proves it). Second bite of the same trap: promote to a CLAUDE.md line
   or a hook, shrink the entry to a pointer.
4. **Decisions** (`docs/adr/`): did anything get decided this session (client word,
   grill verdict, design ruling) that has no ADR home? Write the amendment or short
   ADR now. A decision living only in the conversation does not exist.
5. **Handback**: if the tree carries uncommitted work, end the reply with what to
   stage (grouped, drift excluded) and a runbook for whatever was not proven live.
   The user owns commits unless they explicitly delegated.

## Stamp

Finish by refreshing the ceremony stamp so the reminder hook goes quiet:

```bash
date +%s > "$(git rev-parse --git-dir)/wrap-stamp"
```

If a session genuinely produced nothing to record, say so in one line and stamp anyway.
