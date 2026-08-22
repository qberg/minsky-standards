# Slicing: vertical tracer-bullets

## The cut
Cut by demoable behavior, not by layer. A slice is a thin path that crosses every layer (schema, contract, handler, infra, UI) and ends on something a human can observe. A "schema commit, then all contracts, then all handlers" plan is a horizontal layer cake: the first observable behavior lands last, so every integration unknown surfaces at the end when it is most expensive.

## Order by risk, not by dependency depth
Slice A (the walking skeleton) is the thinnest end-to-end path that produces observable behavior AND answers the biggest unknown. Ask: what could make this whole approach wrong, and how cheaply can I prove it works? Wire that first, often with a synthetic stub standing in for real infra.

Example shape (live feature): A0 = stub the source, prove the transport reaches the sink (a timer event renders in the UI). A1 = swap the stub for the real source. B = resilience (reconnect, dedup, error states). C = reconciliation plus tests.

Later slices thicken the skeleton. Each still ends on observable behavior.

## Stable seams between slices
Put the naive first version behind the boundary it will keep. If Slice A's quick-and-dirty consumer lives behind a hook or a function seam, Slice B swaps the internals (naive loop becomes a state machine) without touching the contract or the call sites. The seam held is the proof the slicing was right.

## When horizontal is acceptable
- A purely additive change inside one layer (a new shared schema, a type lift) that nothing observable depends on yet. Build it, gate it, move on.
- A slice whose entire value IS one layer's concern (a migration, a pure refactor).
Default to vertical; reach for horizontal only when the behavior genuinely lives in one layer.

## Realign forward, never re-cut
If a plan was vertical at the slice level but a chunk drifted horizontal mid-build, realign the NEXT chunk; do not re-cut sunk work. (memory: vertical-chunking)

## Name the deferrals
Every slice plan lists what it is NOT doing and why: design-gated UI, optimistic paths, future channels. A deferral with a reason is a decision; a silent omission is a bug waiting to be called scope creep.

## Decompose a slice into bite-sized steps
A slice is still too big to build blind; cut it into steps that each end on a signal you can read in 2 to 5 minutes. A step is the smallest change that moves ONE gate or surfaces ONE observable behavior. It stays vertical: a step crosses only the layers it needs, never "do the whole schema layer first". Order the steps so the riskiest unknown emits its signal earliest (same rule as slice order, one level down). Track the steps as a live checklist (the task list), exactly one in-progress at a time.

Each step names its feedback signal up front, one of:
- a gate: `the repo's package-scoped gate command (see its CLAUDE.md / verify skill)` plus `pnpm check`, expected PASS
- a test: the exact vitest case, expected red then green if you took the test-first path (invoke the `tdd` skill for that loop; do not force TDD where a live checkpoint is the truer signal)
- a live run: drive the app, expect the named observable behavior (see `verification.md`)

A step with no readable signal is not a step; fold it into the next step that has one.

## The plan is exact, never a placeholder
The slice plan you get approved (phase 2) carries real content, not intentions. Banned inside a plan, every one is a gap that resurfaces mid-build as scope creep: "add validation", "handle edge cases", "error handling as needed", "write tests for the above", "similar to slice A" (repeat the concrete shape instead), "TODO" / "TBD". Name the exact file path, the exact command, and the expected signal. A step that says WHAT without HOW is not yet a step.

## Self-review the plan before building
One fresh-eyes pass over the plan against the issue and the source, by you, not a subagent. Fix inline, then build; do not re-review.
1. AC coverage: every acceptance criterion maps to at least one step. List gaps, add steps.
2. Placeholder scan: reread the plan for the banned phrases above. Replace each with concrete content.
3. Name and type consistency: a symbol you introduce in an early step must be spelled identically where a later step consumes it. A contract field `audienceType` referenced as `audience_type` downstream is a bug on paper. This is the same drift the rename-sweep gotcha catches in code; catch it here first, for free.
