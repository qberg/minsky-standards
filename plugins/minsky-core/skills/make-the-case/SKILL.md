---
name: make-the-case
description: Back a design recommendation from several independent directions before the founder sees it, the way a surveyor fixes a point from three bearings. Scores two real designs on up to ten foundations (model fit, coherence, numbers, compiler proof, scenarios, edge cases, premium products, open source, refutation, experiment), draws a C4 level 3 diagram and a sequence walk in D2, and writes plain words first so a person and an agent reach the same understanding. Use for every shape decision (a prior-art verdict of new, generalise or replace), when the founder asks "is this the best architecture", "are you sure", "why this and not that", or before any ADR records a choice between designs.
---

> Talking to the founder: follow `handbook/working-with-the-founder.md` (For you: first, real options side by side with a pick, core idea then analogy then example then detail, walkthroughs as a named person, friendly and honest).

# make-the-case

Founder's word 2026-09-29: "whatever the agent recommends I want it to back it across multiple
logical foundations". Certainty is not on offer and is never claimed. What is on offer is a fix:
one reason is a line the answer lies somewhere on; several independent reasons crossing at one
design is a point. And one of the directions is an agent paid to break it.

## When

Every shape question: a prior-art read's `new`, `generalise` or `replace` verdict, a grill's fork,
an ADR choosing between designs, `harden-slice`'s contract rebuild. A plain `reuse` needs no case.

## The foundations

Score both designs on every row that applies; a row that does not apply says why in one line.

| # | Foundation | The question | Evidence |
|---|---|---|---|
| 1 | Model fit | Does it sit on the repo's primitives and laws, or strain them? | the repo's mental model, cited by section |
| 2 | Coherence | Rules with two homes, concepts added, silhouette rows reused or new | the silhouette and word lists, grep |
| 3 | Numbers | Files, callers moved, duplication counts, and timings when speed matters | lint, fallow, a gated run |
| 4 | Compiler proof | What becomes impossible to get wrong | a type, a registry, a `.type-test.ts` |
| 5 | Scenarios | Named people through the ordinary, the rare and the hostile case | the walk, written |
| 6 | Edge cases | Two acts at once, stale reads, the privileged row, self-reference, other locales, the phone | a checklist, per shape |
| 7 | Premium products | How three or four shipped products do it | the repo's product studies and research index |
| 8 | Open source | How real code does it, read at source | the OSS refs, `oss-ref-scout` |
| 9 | Refutation | The strongest attack on the pick, and the answer | a fresh-context agent, brief below |
| 10 | Experiment | Any claim reading cannot settle | a gated run with its numbers |

The rule: the pick wins or ties every scored row. Where it loses one, the case says so and why the
loss is accepted. Row 9 is never skipped. Every row carries a receipt or `no receipt:` and why.

## The refutation brief (fixed; fill the brackets)

    You did not design this. Your job is to break it. Design: [the pick, as code at its use sites].
    The alternative was: [runner-up]. Context: [paths]. Find the strongest reason the pick is
    wrong: a scenario it fails, an edge case, a rule it duplicates, a law it strains, a product or
    open-source precedent against it. Quote path:line for every claim; mark read or inferred. If
    you cannot break it, say what you tried. Edit nothing.

## The pictures

Two per case, in D2 (`d2lang.com`), fenced as ```` ```d2 ```` inside the markdown, so an agent
reads short text and a person reads a laid-out drawing (the founder's Obsidian draws them through
the official D2 plugin). D2 over Mermaid, founder's call 2026-09-29 after Mermaid's C4 syntax
drew overlapping labels: real automatic layout (ELK), a CLI that proves a diagram draws, MPL-2.0.

1. **C4 level 3, after** (and before, when the shape changes): the containers and the homes the
   change touches, `direction: right`, new homes with a thick border, changed ones dashed.
2. **The walk**: `shape: sequence_diagram` at the root, the named person first, one group per
   edge case (`label: If ... { ... }`).

Start every diagram with `vars: {d2-config: {layout-engine: elk}}` and a `title` (shape text,
near top-center). Every element has a name and, where it has one, a technology on a second line;
a label holding `\n` is quoted, because an unquoted newline starts a new shape; arrows are one
way and labelled with a verb; under 20 elements; one C4 level per diagram; no emoji, no raw
colour. The repo's lint renders every block with `d2 -` and fails one that does not draw.

## Steps

1. State the question in one line and write both designs as code at every use site.
2. Fill the foundations that are cheap to read (1 to 6) in the main thread.
3. In one wave, brief fresh agents for 7 and 8 (read the studies and the refs; quote), and for
   10 when a claim needs a run.
4. Draft the pick, then brief the refutation (row 9) with the fixed text. Fold its findings: a
   finding that breaks the pick changes the pick, never the case's wording.
   A changed pick is refuted again, briefed with the findings it answers, before any build.
   Stop when a round finds nothing HIGH against the pick itself. A defect it finds in code that
   already ships is fixed and committed on its own, with its tests, never folded into the case.
5. Draw the two pictures.
6. Write it where it lives (a prior-art read's case section, or the ADR), plain words first: the
   core idea, an everyday picture, the named person's example, then the table. A person reads it
   before any agent does.

## Refinements

Every entry says what a case missed and what the skill now does about it. This log grows.

| Date | Miss | Change |
| --- | --- | --- |
| 2026-09-29 | apm #294 R1, the first case: the refutation broke the pick three ways and found a live hole (a role edit judged only the new keys) | A changed pick is refuted again before build (step 4) |
| 2026-09-29 | apm's first C4 map drawn with Mermaid `C4Context` and `C4Container` rendered as overlapping labels in Obsidian | C4 levels are drawn as `flowchart`; C4 names the zoom, not the syntax |
| 2026-09-29 | apm #294 R1, round 2: the refutation of the revised pick found a second live hole (an empty role or a future grant hid a self-edit) | A stop rule (no HIGH against the pick) and shipped defects fixed on their own |
| 2026-09-29 | Mermaid flowcharts still read as a mess at C4 scale; the founder asked for the most capable tool | D2 with ELK, checked by rendering; quote labels holding a newline |
