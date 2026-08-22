---
name: harden-slice
description: Adversarially review and harden a freshly-built vertical slice (issue/diff) so its architecture is as elegant and correct as possible before it ships. A powerful model plays senior decision-maker: delegates evidence + adversarial review to cheaper agents, judges findings, rebuilds the contract when a design flaw is found, audits the full diff, reconciles docs, and posts an honest AC status. Use after a slice of a larger epic has been built (by the user or an agent) and needs a hardening pass before commit. Triggers: "review and harden this slice", "harden S<n>", "review-and-fix cadence", "make the architecture elegant before shipping", or picking up the review step of a multi-slice epic.
---

# Harden Slice

Take a slice that was just **built** and make its architecture as elegant and correct
as it can be **before it ships**. This is the review-and-fix half of a build; it
assumes the code already exists in the working tree.

You are the **senior decision-maker**. Your value is judgment, not labor. Spend premium
reasoning where being the strongest model changes the outcome: judging findings,
spotting the design flaw a diff-level reviewer misses, deciding the contract redesign,
final approval. Delegate everything else and audit what comes back. Delegation ladder:
strongest tier judges and audits; a strong tier does the hardest delegated work
(cross-module contracts, adversarial review); mid tier does normal execution; cheapest
tier does evidence gathering.

Respect the repo's guardrails throughout: never let a subagent run a root-level
auto-fix (scope formatting to changed files); never `git commit --amend` on a shared
branch; follow the repo's commit policy (default: the user owns commits; never
auto-commit or push).

## When to use / not use

- **Use** when a vertical slice (one issue) has been built and needs a hardening pass:
  a fresh powerful model looking for design flaws, hidden failure modes, and
  cross-slice incoherence.
- **Skip** for trivial mechanical diffs (a rename, a copy tweak): the cadence costs
  more than the change. Review inline instead.
- This is **not** ship-issue (which builds an issue from scratch) and **not** a
  single-pass diff lint. It is a multi-agent hardening loop with a contract-rebuild
  branch and doc reconciliation.

## Inputs

- The issue number/reference for the slice (has the acceptance criteria).
- If the slice belongs to a **multi-slice epic**, the parent issue plus the ADRs or
  architecture doc that govern the shared design. Establish this early; it drives
  Step 6.

## Process

### 1. Isolate the slice diff

The working tree usually holds unrelated dirty files. Determine exactly which paths
belong to this slice (untracked package dirs, changed files under the module, config,
docs). Every delegated agent gets this explicit scope with a hard instruction to touch
nothing outside it. Fetch the issue body and ACs so reviewers judge against the real
contract.

### 2. Fan out: evidence + adversarial review in parallel

Spawn two agents concurrently (one message, two tool calls):

- **Cheap tier: AC inventory + test truth.** Facts only, no direction. For each
  acceptance criterion: SATISFIED / PARTIAL / NOT SATISFIED with `file:line` evidence.
  Then run the real checks: typecheck, the slice's tests against **real infra** (never
  mock what the repo tests for real), from the correct package dir (never repo root;
  see the verify-package skill and the repo's `docs/agents/verify.md`). Quote exact
  failures. List every in-scope file with a one-line description.
- **Strong tier: adversarial seam review.** Find real defects, no praise, no style
  nits unless they change behavior. Every finding: `file:line`, severity, a
  **concrete failure scenario** (inputs/state to wrong outcome), one-line fix
  direction. Verify each by reading the actual code path; no speculation. Point it at
  the highest-value seams for the slice's domain: concurrency/retry/reorder,
  transactional boundaries, idempotency, cache/index freshness, auth scope resolution,
  cross-process contracts, secrets/deploy. If a prior review flagged items, ask it to
  verify each was fixed (fixed/not-fixed table).

Give the adversarial reviewer the governing ADRs as authority so it judges against
intended design, not just local correctness.

### 3. Judge: real vs noise (do not delegate)

Read both reports. For each finding decide: real defect, acceptable trade-off, or
false alarm. Rank the real ones. This is the step that most needs the strongest model:
a plausible-but-wrong finding wastes a rebuild, a dismissed-but-real one ships a bug.
State your verdict on each with reasoning.

### 4. Contract rebuild: only if a design flaw survives judging

If the flaw is a **contract/shape** problem (a payload that loses to reordering, a
seam that can't express what it must, an abstraction leaking across a boundary), a
diff-level patch won't fix it; the design must change. Write a precise, settled spec
inline (the decisions, not "consider...") and delegate the rebuild to the strong tier
(cross-module contract work is its tier). Require it to: report deviations from the
spec with justification, flag anything that contradicts the spec rather than silently
resolving it, run scoped tests to green, and scope formatting to its own files. For
pure mechanical fixes, use the cheaper tiers instead.

Prefer the **elegant, order-independent, single-source-of-truth** design over the one
that merely passes the AC. The org rule is build it right now: no deferring the
correct abstraction to a later issue.

### 5. Full-diff audit (do not delegate)

Read the actual final diff yourself: the whole slice, not the agent's summary of it.
This catches what summaries hide: a secret in a clear-env list (or a clear value in a
secret list), an env comment that lies, a dead option, a boundary violation. Make the
one or two direct fixes where delegating costs more than the edit. Everything else is
already delegated.

### 6. Cross-slice coherence (only for a slice in an epic)

A slice can be internally correct and still wrong for the epic. Check it against the
shared design: does it reuse the shared infra the epic committed to (not fork a
parallel one)? Does its contract match what later slices will consume? Did an earlier
slice leave a bug-in-waiting this slice now triggers (the classic: a scope/sentinel
that resolves in one seam but not the shared one)? If this slice changes a shared
contract, the **next** slices' issues must be told: comment the change on them so
their agent builds to the new shape, not the stale issue text.

### 7. Reconcile the docs to what actually shipped

Code and docs drift the moment a design changes in review. Update every doc that now
lies:
- The governing **ADR**: amend in place, marking the amendment and why (supersede the
  old sketch, don't delete the reasoning).
- **CLAUDE.md** (root + app): the invariant/gotcha bullets.
- Any **architecture doc** or diagram (sequence flows, slice status, risk notes).
- Context glossaries if a term's meaning moved.

Reconciliation is not optional polish; a stale ADR misleads the next slice's builder.

### 8. Honest AC status + close

Post the acceptance-criteria status on the issue: each AC checked with its real state.
Be honest: a superseded AC says *superseded, here's the stronger thing that replaced
it*; a declared-but-not-yet-deployed AC says so; uncommitted work says so. List what
landed **beyond** the ACs (the review findings). State verification (test counts vs
real infra, typecheck, lint) and what remains owner-side (commits, deploy). Close the
issue if the owner's cadence is to close on green. Then run the wrap skill so the
slice's state, debts, and gotchas land in `docs/agents/`.

## Cadence at a glance

```
1  isolate slice diff (scope every agent)
2  parallel:  cheap tier -> AC inventory + real-infra tests (facts)
              strong tier -> adversarial seam review (failure scenarios)
3  you        -> judge real vs noise
4  design flaw? -> strong tier rebuilds the contract (settled spec)
5  you        -> full-diff audit + direct fix
6  epic?      -> cross-slice coherence + notify downstream issues
7  reconcile ADR / CLAUDE.md / arch doc
8  honest AC status -> close -> wrap
```

## Notes

- Scale the fan-out to the slice: a small slice = one reviewer + inventory; a risky
  infra/shared-contract slice = deeper adversarial pass, maybe multiple lenses
  (correctness / concurrency / security / deploy).
- The most valuable single move is usually Step 6's coherence check catching a
  shared-seam bug before it multiplies across the remaining slices.
- If nothing survives judging, say so plainly and skip straight to Steps 7-8. A clean
  slice is a real outcome, not a failure to find something.
