---
name: watch-it-work
description: Drive a cross-process feature end-to-end on real local infra and watch one correlation id propagate across every process's logs — to VERIFY a feature actually works across the seams (green tests aren't enough) or to DEBUG a full integration flow by localizing a fault to a layer. Use when the user says "watch it work", "verify end to end", "run the full integration", "trace the flow live", "does this actually work across processes", after building a feature that spans multiple apps/services, or when a cross-process flow is misbehaving and unit tests pass.
---

# Watch It Work

Green tests prove the *parts*. This proves the *seams* — the gap between "each piece works" and "the pieces work together", where the bugs that survive unit tests live. The deliverable is **one correlation id traced, in order, across N independent process logs, ending in the far-side effect**.

## When to reach for this

- Just built a feature spanning ≥2 processes (producer → queue/outbox → consumer; SSR → API → worker).
- A cross-process flow misbehaves but unit tests are green.
- Onboarding to an unfamiliar pipeline — running it once teaches more than reading it.

## The ritual (the order is the point)

1. **Boot the riskiest unknown FIRST.** The never-run consumer, the new worker. Confirm its **readiness signal** in the logs before layering anything on top. Don't boot everything then poke.
2. **Read structured log fields, not the message.** "ONLINE" says it started; `queues: 3` says it started *with the right shape*. Verify the invariant (the count, the set), not the vibe.
3. **Eyeball the silent-failure points.** Things that fail with no error (an outbox dispatcher's monitored-queue set — an unregistered queue stalls forever, silently). The thing that can't throw is the thing you must verify by eye.
4. **Seed at the earliest REAL entry point; let live machinery shape the rest.** Don't hand-craft the downstream row — it can diverge from what production produces and hide the bug. Stage the upstream job; let the real workers project it.
5. **Faithful test PATHS, not just data.** A seed/harness must obey the same guards the real flow does. A harness that bypasses a production guard is a liar — it "proves" things that can't happen. If a live test shows impossible behavior, suspect the harness before the product.
6. **Use existing seed/job infra, typed inserts over raw SQL.** Don't sprawl throwaway scripts; the codebase has a home for ops jobs.
7. **Drive the REAL action.** The actual UI button or authed API call — not a shortcut that skips auth/validation.
8. **Correlate one id across the process logs, in order.** There's no single stack trace across OS processes; the proof is the same logical event surfacing across terminals in sequence. That id is your through-line (and why logs should print it).
9. **Assert the FAR-SIDE effect, not the near-side UI.** The UI updating proves the *near* process changed. Check the *downstream* state in the *other* process (the DB row another service wrote). "Looks done" ≠ "the effect happened".

## How to run it WITH the user — one step at a time

This is interactive and paced, NOT a script dump. The value is the user watching it happen and learning the seams. For each step:

1. Give **ONE command** (or one UI action) at a time — the exact command, copy-pasteable.
2. State **what to look for**: the specific log line / field, AND the **red flags** that mean stop.
3. **Stop and wait** for the user to paste the output. Do not give the next step yet.
4. **Interpret what they paste**: what this signal *proves* — and crucially what it does *not* (near-side vs far-side; dispatched vs consumed). Call out the correlation id and tie it to the previous step.
5. Briefly surface the **senior reasoning** for this step (why this order, why this check) — that's the teaching half the user wants.
6. Only then give the next step.

If a step's output is wrong or impossible, diagnose before proceeding — **"product bug or test/harness artifact?"** is the first question (a guard-bypassing seed lies; a real bug reproduces through the real path). Never advance past a red signal.

Keep a running tally of which hops are proven, so the end state is explicit: "every hop, one id, four processes."

## What a real live run catches (that tests don't)

- Observability dropped in a refactor (a consumer that went silent — no test asserts on logs).
- A test harness diverging from a production guard (impossible behavior = lying harness).
- Queue/serialization/registration mismatches at the seam.

"Compiles + tests pass" ≈ 90% confidence. Watching one id walk through N processes is the last 10% — the part that pages you at 3am.

## This repo

Booting commands, log shapes, correlation-id fields, seed/job registries, and worked
examples are repo knowledge, not skill knowledge. Read `docs/agents/watch-it-work-reference.md`
if the repo has one; otherwise derive from the repo's CLAUDE.md and compose files, and
leave a reference behind for the next run.
