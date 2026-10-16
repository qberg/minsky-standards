# Parallel units inside one slice

Not new law: the handbook already holds delegate labor and keep judgment, waves of at most four,
two writers never share a file, audit the whole diff, believe `git status`. This file is how the
PLAN phase applies them, so a slice's wall time drops without its quality dropping.

## When a unit may run beside another

- Inside ONE slice, after the main thread has fixed its contract (types, registry rows, refusal
  codes, the procedure row). Never across two slices: slices keep riskiest first and one checkpoint.
- The plan lists each unit's exact file set and its edges. A unit runs in parallel only when it
  shares no file with another AND waits on no decision still under refutation. Parallelism follows
  the decision graph, not only the file graph.
- The count is what the main thread can audit in one sitting, never simply the wave cap.

## The brief

- The contract TEXT verbatim, never a path to read: a path read is where drift starts, and a
  30k to 60k reload is where the window goes.
- The exact file list, found by grep before the brief, and "STOP and report" for any file outside it.
- No `git checkout`, `stash`, `reset`, and no format or git command on any other path: other
  sessions share the tree.
- A shared file that already carries another session's hunks: `git diff` it first, keep their hunks.
- A builder never writes tests; a test writer never edits source.
- Any agent that runs a database suite gets a PRIVATE test database named in its brief, never the
  shared one (a shared test database truncates other sessions' rows mid-run).

## How much to fan out (decided in the plan, written beside it)

Agents judge effort badly, so the scale is a table and not a feeling (Anthropic's lesson 3, "Scale
effort to query complexity", same post as below). READS fan out wide, WRITES fan out narrow: a
subagent's strength is reading a lot and handing back a little, and code has fewer truly parallel
units than research (the post's own limit). Tokens are the cost: the post measures a multi-agent
run at about 15 times a chat's tokens, so a builder is spent only where the table says.

| The slice has | Scouts (read-only) | Builders | Always |
| --- | --- | --- | --- |
| one unit, or units that share a file or an open decision | up to 4 for the prior-art read | 0: the main thread builds it | test writer and cold reviewer |
| 2 to 4 units, disjoint files, contract committed | up to 4 | one per unit, one wave | test writer and cold reviewer |
| more than 4 disjoint units | up to 4 per wave | waves of at most 4, audit between | test writer and cold reviewer |

## The rules card (part of every brief)

A builder starts with none of the main thread's context, so a rule it was not handed is a rule it
will break. The card is written once per slice and pasted into every brief of that slice. Its
source is the slice's prior-art read (the `prior-art` skill, step 6): the card is cut from that
file, so what the repo already built reaches every builder and nothing is found twice.

- The contract text verbatim (types, registry rows, refusal codes, the procedure row).
- The rules that bind this unit and that NO GATE CATCHES, quoted from the handbook and the repo
  CLAUDE.md with one line of why each (one home for a rule, the surface's error states, the
  vocabulary a person reads, which registry a new row joins), never "follow the repo rules". A rule
  a compiler or lint already refuses (no `any`, complexity, no ternary in JSX) is named in one line
  with its gate command and not explained: the gate teaches it, and the card stays inside O3. The
  post's finding is the reason for the why: good heuristics steer an agent better than a bare list
  of rigid rules.
- The homes to build through: each silhouette row and existing home the read gave a `reuse` or
  `generalise` verdict, with its path, so a builder extends the one home and never writes a twin.
- The traps of the area: the read's Traps and the matching `docs/agents/gotchas/` entries, quoted.
- The four parts every brief has: the goal in one sentence, the files in bounds and the files out
  of bounds (other live agents' files named as forbidden), the return format, and the observable
  check that means done. Same four as Anthropic's lead agent gives its subagents (an objective, an
  output format, guidance on tools and sources, clear task boundaries;
  https://www.anthropic.com/engineering/multi-agent-research-system, section "Teach the
  orchestrator how to delegate").
- A recipe the unit must follow, inlined as numbered steps when the agent type has no Skill tool.
- The return is a pointer, never the work retold: a builder's code is already in the tree, so it
  returns files, ranges, gate results and punts in at most 20 lines; a scout whose findings exceed
  its return contract writes them to the slice's prior-art file and returns the section name (the
  post's appendix: output to a filesystem "to minimize the game of telephone").
- Every return ends with two lines: what the brief lacked or got wrong, and "Not checked: <what
  was not read or run>". The first is the cheapest source of card fixes (the post's lesson 5,
  agents diagnose their own prompts); the second keeps a silent gap from reading as a clean pass
  (Ponytail; apm 2026-10-16, blind reviews of one slice).
- Every brief states a budget and says "on reaching it, return what you have, marked partial", so
  a helper that runs long hands back its work instead of nothing (pstack TIMEBOX).

The audit judges the END STATE (the diff against the contract and the gates), never the builder's
account of how it got there; a builder may take any path to a correct diff (the post's appendix,
end-state evaluation). When the audit finds a defect, classify it: the card stated the rule (the builder's miss) or the
card did not (the card's miss). A card's miss is fixed in the card before the next wave.

## The marks (recorded per slice in the build note)

| # | Mark | Pass | Read from |
| --- | --- | --- | --- |
| O1 | Contract first | types, registry rows and refusal codes are committed before any builder starts | `git log` order |
| O2 | The main thread stays light | under 250k tokens of context at slice end | the repo's usage read |
| O3 | A builder reads little | under 60k tokens per builder | the repo's usage read |
| O4 | Share of labour | in a slice the table above fans out, helpers make at least 60 percent of the edit steps | the repo's usage read |
| O5 | No collisions | no two builders of one wave touch one file | the plan's file sets against `git diff` |
| O6 | Every wave audited | the whole diff is read before the next wave starts | one line per wave in the build note |
| O7 | Quality holds | the cold review finds no more per slice than before the rule | review counts in build notes |
| O8 | The card is complete | audit defects whose rule the card did not state: 0 by the slice's last wave | the audit's classification |

O7 is the guard: the rule exists for quality and wall time together, so more findings per slice
means the rule failed, whatever the other marks say. O2 and O4 are thresholds proposed in apm on
2026-10-12 from one day's figures (main thread 239k per step, helpers 27 percent of reading, median
session peak 356k); move them with a receipt. Not every slice fans out: coding has fewer truly
parallel units than research (same Anthropic post), so a slice with one unit skips O4 and O5 and
says so, and that is a pass.

Start small (the post: about 20 real cases showed the effect of a change, no need to wait for a
large eval): the first five slices built under this rule record all eight marks; the thresholds
are reviewed on those five, and a mark nobody could read from the tools is dropped or given a tool.

## How a unit ends

- On its own scoped gate PLUS a proof that its own module ran. "Tests green" alone lets a unit that
  never loaded return green beside the right ones.

## Always side by side

- The cold reviewer and the fresh test writer on the finished diff; the reviewer's findings go to
  the tester mid-run.
- A read-only refuter beside a builder (zero shared files). Two reports need a merge: budget that
  merge as its own step, it can cost more than the runs.

## Never parallel: one writer, at the end

Migrations; ADR amendment lines; generated files (locale catalogues and their extract, indexes, the
route tree); harness tables (statement ceilings, page budgets, shared fixtures); whole-suite runs.

## After each wave, before the next

Audit each builder's whole diff; re-run any number an agent says it measured; believe `git diff`,
never the narrative.

## Receipts

apm 2026-10-08: #329 B0 ran two builders on disjoint files in about half the wall time, both audited
clean, and lost a run to a test writer on the shared database; #331's refuter beside a writer found
four shape holes before any code; #169's parallel lane ran the wrong module and returned green
(apm `experiments/LANES.md`); #189 cs step 3 ran the cold review and the test writer at once, and
built its server read and its admin screens serially though they shared no file after the contract.
