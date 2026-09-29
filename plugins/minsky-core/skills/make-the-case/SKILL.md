---
name: make-the-case
description: Back a design recommendation from several independent directions before the founder sees it, the way a surveyor fixes a point from three bearings. Scores two real designs on up to ten foundations (model fit, coherence, numbers, compiler proof, scenarios, edge cases, premium products, open source, refutation, experiment), draws a C4 level 3 before-and-after and a sequence walk in Mermaid, and writes plain words first so a person and an agent reach the same understanding. Use for every shape decision (a prior-art verdict of new, generalise or replace), when the founder asks "is this the best architecture", "are you sure", "why this and not that", or before any ADR records a choice between designs.
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

Two per case, Mermaid, written so an agent reads the text and a person reads the drawing:

1. **C4 level 3, before and after**: a `flowchart` in C4 style (the containers and the homes the
   change touches; new homes and changed homes marked by class, never raw colour). Mermaid's C4
   syntax is experimental, so levels 3 and dynamic use `flowchart` and `sequenceDiagram`; the
   repo's one-time level 1 and 2 map may use `C4Context` and `C4Container`.
2. **The walk**: a `sequenceDiagram` of the named person's act, one `alt` branch per edge case.

Diagram rules: every element has a name, a type, a technology where it has one, and a short
description; arrows are one way and labelled with a verb; under 20 elements; one level per
diagram; always a title; no emoji. A diagram is never committed until it draws.

The founder reads the repo's docs in Obsidian, which draws Mermaid in place, so a case needs no
separate review artifact (founder's word 2026-09-29: tokens go where they matter most).

## Steps

1. State the question in one line and write both designs as code at every use site.
2. Fill the foundations that are cheap to read (1 to 6) in the main thread.
3. In one wave, brief fresh agents for 7 and 8 (read the studies and the refs; quote), and for
   10 when a claim needs a run.
4. Draft the pick, then brief the refutation (row 9) with the fixed text. Fold its findings: a
   finding that breaks the pick changes the pick, never the case's wording.
   A changed pick is refuted again, briefed with the findings it answers, before any build.
5. Draw the two pictures.
6. Write it where it lives (a prior-art read's case section, or the ADR), plain words first: the
   core idea, an everyday picture, the named person's example, then the table. A person reads it
   before any agent does.

## Refinements

Every entry says what a case missed and what the skill now does about it. This log grows.

| Date | Miss | Change |
| --- | --- | --- |
| 2026-09-29 | apm #294 R1, the first case: the refutation broke the pick three ways and found a live hole (a role edit judged only the new keys) | A changed pick is refuted again before build (step 4) |
