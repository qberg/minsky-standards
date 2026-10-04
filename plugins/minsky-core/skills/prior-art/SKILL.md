---
name: prior-art
description: Before any architecture proposal for a slice, read what the repo already built and write it down as one file with a fixed shape: the need placed on the repo's primitives, every existing home with path:line and a verdict (reuse, generalise, replace, new), the traps, two designs written at their use sites, criteria with numbers, the pick, the silhouette rows the slice changes, and at close what the read missed. Use when planning a slice or issue, before add-vertical's layer walk, before a craft round's anatomy, when a new file or folder is about to appear, or when the user asks "is this already built", "are we rebuilding something", "is this the right shape for the whole system". Runs only in a repo that has docs/agents/prior-art/README.md.
---

> Talking to the founder: follow `handbook/working-with-the-founder.md` (For you: first, real options side by side with a pick, core idea then analogy then example then detail, walkthroughs as a named person, friendly and honest).

# prior-art

Founder's word 2026-09-29 (apm #294): every change should leave the whole system more elegant, not
only the issue. The failure it stops was measured the same day: a Roles page proposal made before
the code was read had four shapes wrong, and the read found three more the second proposal still
missed. A proposal made before the read is a guess; after it, asking twice gives the same answer.
"More elegant" is counted, never felt: the handbook's "Elegance and delight, defined" (D1 to D6,
A1 to A3, U1 to U5) is what sections 6 and 7 measure.

The repo's `docs/agents/prior-art/README.md` is the format and the switch. No README, no step.

## When

Between orienting and planning, once per slice, before any design is shown to the founder. A slice
that grows a new need extends its read in the same change. The read is never skipped for "small":
the repo's hook refuses a new source file its read does not list.

## Steps

1. **Name the need** in five lines: the person, the act, the authority (ADR line, user word).
2. **Brief a FRESH-CONTEXT agent** to write sections 2 to 6 and 8 of the format. The brief names every
   lookup file by path, because a file the brief omits is a file the agent skips (the first read
   missed the silhouette list for exactly this reason). The repo's README lists them; in apm:
   the mental model, `docs/agents/silhouettes.md`, `docs/agents/design-language.md`,
   `docs/agents/seams.md`, the ADRs the need cites. The agent reads code, quotes `path:line`, marks
   every claim read or inferred, and edits nothing.
3. **Judge it in the main thread.** Distrust its provenance: spot-check three receipts yourself.
   Place the need on the primitives yourself too; a tension (fits none, fits two) is the most
   valuable line in the file and is never smoothed.
4. **Make the case** (section 7): for every `new`, `generalise` or `replace` verdict, run the
   `make-the-case` skill; its criteria are fixed before the pick, and the pick names what decided it.
5. **Write the file** at `docs/agents/prior-art/<issue>-<slice>.md`. The main thread writes its
   first section, In plain words, for the founder: the core idea, the named person's walk, what is
   reused and what is new in product words, and the choices that are theirs, each with a pick. No
   `path:line`, no code: a person reads it before any agent does (founder's word 2026-09-29).
   Run the repo's lint, then bring the proposal, which is that section.
6. **At close, write Missed**: what the build, the review or the live gate found that the read did
   not, or `nothing` with the reason. Each real miss becomes a dated line under Refinements below,
   in this file, in the same change. The repo's board refuses Done while Missed is unwritten.

## Lifetime

A read dies with its card, as a handoff dies with its task. At Done every lesson has moved to its
home (ADR, silhouette and word rows, the mental model's log, Refinements below); the read is
committed, the build note cites `git show <hash>:<path>`, and the wrap deletes it. The repo's lint
enforces the deletion. Before Done, the case's level 3 picture of what was actually built is merged
into the repo's component map (`docs/architecture/c4-components-<area>.md`, the slice named beside
it), so the architecture map grows slice by slice instead of dying with each read.

## Refinements

Every entry says what the read missed and what the process now does about it. This log grows; it is
never rewritten (founder's word 2026-09-29: a rule is refined by many sessions with different cases).

| Date | Miss | Change |
| --- | --- | --- |
| 2026-09-29 | apm #294 R1: the brief did not name the silhouette list, so the first table cited no silhouette row, and eight pointers in the list had drifted unseen | Step 2 names every lookup file by path; the repo lint resolves the list's pointers by symbol |
| 2026-09-29 | apm #294 R1: the need was not placed on the mental model's primitives, so "is a role a Record or a Definition" surfaced only when the founder asked | Section 2, Primitives, with tensions written out, feeding the mental model's refinement log |
| 2026-09-29 | apm #294 R1: the read was written for agents only; the founder, who decides from it, got tables of `path:line` | Section 0, In plain words, first, written by the main thread for a human reader |
| 2026-09-29 | apm #294 R1: building step 1 moved the code the read cited, so its receipts failed the lint the hook depends on | `stage: reading` then `building`: receipts are judged while reading, history after |
| 2026-09-29 | apm #294 R1: the read listed `jobOfKeys`'s one code caller, not the rpc test that reaches it through the door; changing it broke that test | Callers include tests; the build runs the suites that reach a generalised home |
| 2026-09-30 | apm #294 door and record door, the same miss twice: section 3 named each command's checks but not their order against its locks, so five Acts locking before refusing (door) and grant create locking the person before judging keys (record door) were found by a gate, not the read | When the need is about ORDER (refuse before any lock, judge before read), section 3 quotes each existing home's first read and first lock in sequence, never only its name |
| 2026-09-30 | apm #296 V1b: the read picked a gate wrapped around every call site (a faked mutation under a view) and never listed what each caller does AFTER its act settles, so three screens stuck (a title spinning forever, a draft stuck at sending), found by the cold review | When a design wraps many call sites, section 3 lists each caller's settle path (the success and refusal handlers, the reducer states it moves through) beside the wrapper, and section 5 shows what the wrapper does to each |
| 2026-09-30 | apm #296 V1b: the read counted the exits by their registries (the menu, the palette) and missed the same act as a button on two pages, where a press signed the keyboard out entirely | Section 3 counts every surface an act appears on (grep the act's hook and its callers), never only the registries that list it |
| 2026-10-04 | apm #319 byline 2 and 3: the read placed the new run's moves (open, claim, settle) but not the unit of work each one runs in, so the worker's claim wrote outside any transaction, which the repo's ambient db refuses, and every draft job would have thrown (found by the cold review) | Section 3 names, for every write the slice adds, where it runs (inside an Act, a worker step, a request) and quotes the repo's rule for writes outside an Act |
| 2026-10-04 | apm #319 byline 2 and 3: a new row keyed to an Act was inserted inside the Act's body, before the Act row exists, and the read never asked when the key is checked (found by the test round) | Section 4 states, for every new key to an Act or audit row, whether the row is written before the Act row, and cites the repo's deferred-key rule or gate |
| 2026-10-04 | apm #319 byline 2 and 3: the read said how a run starts but not every act that must END it, so a run over a name the person then typed stayed "failed" forever (found by the cold review) | For every new state with a lifetime, section 3 lists every act that must end it, by grepping the writers of the same subject, not only the job that owns it |
| 2026-10-04 | apm #319 byline 2 and 3: the read listed Keep's gate but never ran Keep on each kind, so Keep on a list name had refused every draft since the previous slice (found by a builder) | When a need widens an act to more kinds, section 3 traces or tests the act once per kind end to end, never only its gate |
| 2026-10-04 | apm #319 byline 2 and 3: the read missed a home a peer session had built but not committed (the day word), so the first build made a second "today" (found by the cold review and the peer) | The seam check asks each peer which uncommitted homes touch the need's nouns, and section 3 lists them as homes |
| 2026-10-04 | apm #319 byline 2 and 3: a review fix hung on "any change re-stages the job" without listing which Acts re-stage it, so a reorder would have restarted Marvin mid-call (found by the re-review) | Section 5 lists every trigger of an effect or hook a design reacts to, by grep, beside each design |
