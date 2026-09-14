---
name: wrap
description: Session closing ceremony. Routes everything learned or left owed this session into its git-tracked home (NOTES.md state of play, debts ledger, gotcha compendia, ADRs), then hands back the tree. Use at the end of a session or epic, when the user says "wrap", "wrap up", "close out", "closing ceremony", or before walking away from a substantial work session.
---

# wrap

Closing ceremony. One pass, six checks, then stamp. The goal: no fact leaves the
session living only in chat or in your head. Skip any check that has nothing; never
skip the pass.

Paths below follow the org information ladder (`docs/agents/` in the repo). If this
repo lacks them, create the missing file from its sibling's shape.

## The five checks

1. **State of play** (`docs/agents/NOTES.md`): a capped resume card, loaded into every
   session, so it holds only per open epic: where it stands, the next step, what to
   distrust first, pointers. Update every epic line this session touched; DELETE lines
   for anything that shipped (git history is the record). The session's narrative goes
   VERBATIM to `docs/agents/sessions/<date>-<slug>.md` (provenance, never law), and every
   fact in it gets one home down the ladder (decision, trap, debt, build note) before
   the bullet is cut. A journal wearing the state-of-play name is the failure this
   guards against (apm 2026-09-14: 874 lines, half superseded, loaded every session).
2. **Owed work** (`docs/agents/debts/`): anything left undone that someone must
   remember: feel-gates, deploys, migrations, reviews, follow-ups. One entry each, a
   priority and a home (`P<0-3> | #issue or ADR-nnnn or none`), in the bucket of the
   context whose slice PAYS it, source cited. If it is already an issue, pointer only.
   Ticked items leave the open ledger (the repo's debts tool moves them).
3. **Traps** (`docs/agents/gotchas/`): a non-obvious failure that cost real time gets
   one headed entry in the matching compendium, within the cap, its receipt last (doc,
   ADR, URL, or the command that proves it). Prose never states a registry's size; it
   points at the registry (a count in prose is stale by construction). Second bite of
   the same trap: promote to a CLAUDE.md line or a hook, shrink the entry to a pointer.
4. **Decisions** (`docs/adr/`): did anything get decided this session (client word,
   grill verdict, design ruling) that has no ADR home? Write the amendment or short
   ADR now. A decision living only in the conversation does not exist. Every
   amendment is written on both records (`amends` / `amended_by`); if the repo ships
   an ADR lint, run it before the stamp.
   **On a map or epic close, run the coherence audit**: fan out read-only scouts, one
   per decision cluster (Opus for cross-module clusters, Sonnet for the law and
   state files), each briefed to refute: same object described two ways across ADRs,
   `amends` with no matching line, glossary term contradicting an ADR or another
   glossary, term used but undefined, banned writing. Contract: at most 15 lines of
   `file:line | issue | what the other file says`. Judge the findings yourself
   (decline with a reason where the law forbids the edit), then fix in one
   serialized pass: dated amendment lines on ADRs, in-place edits on glossaries,
   maps, and law files. Record the pass in NOTES.
5. **Handback**: if the tree carries uncommitted work, end the reply with what to
   stage (grouped, drift excluded) and a runbook for whatever was not proven live.
   The user owns commits unless they explicitly delegated.
6. **Org law** (`../minsky-standards`): did this session prove a pattern worth
   promoting to an org skill, amending an existing skill, or adding to the handbook?
   Two triggers:
   - **Agent-initiated**: you noticed a pattern that generalizes. Propose the change
     to the user (which file, what to add/amend, why it generalizes beyond this repo).
   - **User-initiated**: the user proposes generalizing a takeaway. Validate it: does
     an existing skill already cover this? Is it genuinely org-wide or repo-specific?
     Has the pattern proven its shape (used in production, not just theorized)? Push
     back if the answer is no to any of these; agree and refine if yes.
   In either case, wait for approval before editing. Only after approval: make the
   edit in the minsky-standards sibling repo, bump the plugin version
   (`scripts/publish.sh patch|minor`), and print the `claude plugin update` commands
   for each consuming repo. If nothing generalizes, skip.
   **Promotion ledger** (`handbook/framework-charter.md`): ask which mechanism crossed
   all three signals this session (two contexts, a proof that can fail, a survived
   refutation). If one did, set `promotion: candidate` on its ADR with the three
   receipts in the body and run the repo's ADR lint; if none did, say so in one line.

## Stamp

Run the repo's docs lints first (adr, agent-docs, debts, or whatever `pnpm check` chains)
so the ladder is green before the stamp. Then refresh the ceremony stamp so the reminder
hook goes quiet:

```bash
date +%s > "$(git rev-parse --git-dir)/wrap-stamp"
```

If a session genuinely produced nothing to record, say so in one line and stamp anyway.
