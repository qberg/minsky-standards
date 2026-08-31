---
name: ship-issue
description: Execute one tracker issue end to end as vertical tracer-bullet slices. Verify the issue against real code first, build riskiest-first with a live checkpoint per slice, delegate heavy or mechanical work to subagents then audit the whole diff, review the finished diff with a fresh-context adversarial subagent before shipping, ship with granular commits plus an honest AC status. Use when the user says "pick up #N", "grab issue", "build F8", "ship this ticket", or works an issue or PRD slice to completion. Composes with mentor-build when the user wants to hand-write the code.
hooks:
  PreToolUse:
    - matcher: Bash
      hooks:
        - type: command
          command: bash "${CLAUDE_PLUGIN_ROOT}/skills/ship-issue/scripts/guard.sh"
---

# ship-issue

Spine for taking a tracker issue from ready-for-dev to closed. Claude already knows how
to code and can read the codebase; this skill encodes only the non-obvious process
decisions that keep a build honest and shippable. These are defaults, not rails. Adapt
to the issue.

Argument: an issue number, or the user names the issue. If absent, ask which one.

This is an orchestration spine, not a single-purpose skill: it spans verify, build,
review, and ship. It composes leaf skills (mentor-build, verify, wrap) rather than
absorbing them. If one phase grows its own deep procedure, extract it to its own skill
and reference it by name here; do not thicken this file.

Repo parameters (never assume, read them from the repo): the package-scoped gate
command, the commit policy (default: hand back, user commits; a repo opts into
agent-committing in its CLAUDE.md), and the repo's own hazards. All live in the repo's
CLAUDE.md chain and `docs/agents/`.

## Prime directive: code is truth, prose is intent

The issue and its parent PRD went stale the moment they were written. Verify every
load-bearing claim against the live codebase before trusting it. Half of a "to build"
list may already exist; a named file may have moved; a gap may already be closed.
Surface deltas to the user before planning.

## The seven phases

### 1. Orient
- Load the issue with `gh issue view <n> --json number,title,state,body,labels,comments`
  (parse with jq), NOT the plain `--comments` form: that renders through a pager that
  emits NOTHING under a non-TTY harness. Later comments override the body. Read the
  parent PRD for intent, not scope.
- Check every "Blocked by". If a blocker is open, STOP and report; do not start.
- Read `docs/agents/build-notes.md` top to bottom if the repo has one: prior issues
  record schema shapes, API contracts, component interfaces, and gotchas yours depends
  on. Also skim `docs/agents/NOTES.md`, `debts.md`, and the relevant `gotchas/` file.
- Read the ADRs the issue cites, or that govern the module you will touch. Locked
  decisions, not suggestions. If implementation disproves an ADR assumption, STOP and
  report with evidence; never silently deviate.
- `git log --oneline` the relevant dirs to see what landed since the issue was written.
- Capture the GATE BASELINE before touching code: `scripts/baseline.sh capture <pkg>...`
  (snapshots PASS|FAIL to `.git/`, never committed) and note what ALREADY fails. The
  close bar is "no NEW red", never "all green". SCOPE the baseline to the packages you
  will touch: an unscoped baseline in a partly-red monorepo has zero PASS gates and can
  never fail, so it is ceremony, not a gate. The script warns when it captures no PASS
  gate. Per-package red also needs naming individually at close.
- Verify the issue's key assumptions against source. For an unfamiliar or tangled
  domain, build the mental model FIRST: a subagent produces one self-contained HTML
  explainer (C4 L1 to L3 plus one runtime sequence diagram). Doc HTML stays uncommitted.

### 2. Plan, vertical and riskiest-first
- Cut the work into vertical tracer-bullet slices by demoable behavior, never by layer.
  See `references/slicing.md`.
- Slice A is a walking skeleton: the thinnest path through every layer that yields
  observable behavior and burns down the biggest integration unknown FIRST. Later
  slices thicken (resilience, reconciliation, tests).
- Name deferrals explicitly AND justify each as principal you cannot pay yet (missing
  infra, an unbuilt dependency, a human-gated migration), never as "out of this issue's
  scope". We own every issue, so deferring to a later ticket is paying interest with no
  principal reduction. A deferral needs a real blocker; it is a debt entry
  (`docs/agents/debts.md`), not a scope boundary.
- Respect design gates: no styled UI without a design spec (Figma where the repo uses
  it). Design values are HITL, never eyeballed.
- Decompose each slice into bite-sized steps that each end on a readable signal (gate,
  test, or live run) within 2 to 5 minutes; keep every step vertical, riskiest signal
  first. See `references/slicing.md`.
- The plan is EXACT: real paths, real commands, expected signals, no "add validation" /
  "TODO" / "similar to slice A" placeholders. Self-review it once (AC coverage,
  placeholder scan, name/type consistency) before writing code.
- Get the slice plan approved before code. Refine the design as code reveals a cleaner
  shape; surface every deviation with its reason.

### 3. Build, file by file, gated
- One logical unit at a time. After EACH file run the repo's package-scoped typecheck
  plus lint. A change is not done until it passes.
- Contract first. A new endpoint touches TWO registries (the contract router AND the
  handler map); wire both as one atomic pair or the second is silently forgotten.
- Verify before you call. An unfamiliar external API gets checked against its installed
  `node_modules` `.d.ts` or a docs MCP before use, never written from memory. Typecheck
  catches an invented NAME; it green-lights a plausible-but-wrong call that satisfies
  the types and breaks live. One lookup beats a confident hallucination.
- Lookup order is the evidence law, stopping at the first that answers: (1) installed
  docs and source in `node_modules` (version-exact); (2) docs MCPs; (3) web search and
  fetch (vendor docs sites often serve raw markdown by appending `.md` to the URL).
  Delegate a multi-source lookup to a cheap subagent with a numbered question list and
  a "QUOTE + SOURCE URL, mark anything unverified UNVERIFIED" instruction.
- Cite the receipt in the comment (doc title, `docs: <path>`, `ADR-00xx`, or URL).
  Comments stay one line; a hook may enforce a floor, but the floor is not the
  standard: vendor HTTP API claims need hand-citing too.
- A third register exists beyond verified-vs-inferred: UNVERIFIABLE BY READING. When no
  source confirms or denies (typically whether two independently-documented features
  COMPOSE), stop reading and design an experiment: a gated `smoke:*` script
  (`describe.skipIf(!process.env.X_SMOKE)`) that never runs in CI and stays as the
  regression check for that exact claim.
- To let the user hand-write for learning, invoke mentor-build; otherwise write it
  yourself. Either way, review each unit before the next.
- Watch the repo's own edit hazards: `docs/agents/gotchas/` and the CLAUDE.md chain.

### 4. Checkpoint, verify live per slice
- End each slice by running the real app and observing the behavior, not just green
  tests. See `references/verification.md`.
- Put the riskiest unknown in the EARLIEST checkpoint (a synthetic stub can prove
  transport before real infra is wired).
- Separate ENV failures (no DB, no daemon, no browser) from LOGIC failures before
  concluding anything.

### 5. Delegate, then audit
- Push heavy or mechanical work (test suites, explainers, bulk edits, read-only sweeps,
  doc lookups) to subagents with EXACT targets plus the verification commands they must
  run.
- Match the model to the task: mechanical work to a cheap model with an exact brief;
  judgment stays with you; the adversarial reviewer (phase 6) gets the strongest. The
  false economy is a vague brief, not a cheap model. Run independent lookups and sweeps
  concurrently in one message.
- A subagent gets NO interactive approval: any tool not pre-allowed is auto-denied in
  the background. If the deliverable is a FILE, run that agent in the FOREGROUND or
  have it RETURN content for the main thread to Write. Confirm a "file written" claim
  by listing the path.
- After ANY subagent: audit the WHOLE git diff, not its named files. Green gates miss a
  disabled guard, an auth bypass, an `if (false)`, a temp log. Verify any "clean" or
  "reverted" claim with an actual `git diff`.
- Distrust a subagent's account of PROVENANCE. It cannot tell your uncommitted work
  from another agent's drift and will report your own in-flight changes as
  "pre-existing". Believe `git diff` and `git status`, never the narrative. Same for a
  reported failure: re-run the gate yourself.

### 6. Review, fresh-context and adversarial
- Once gate-green and live-checkpointed but BEFORE ship, hand the diff to a
  FRESH-CONTEXT reviewer subagent on the strongest model. Fresh context is the point:
  the builder is blind to its own assumptions. The main thread reviewing its own work
  is theatre.
- Run it in the FOREGROUND so you can triage findings before shipping. Read-only.
- Brief it EXACTLY: the issue's intent; the precise file list (which HUNKS are this
  issue's when the tree carries drift); the rule sources (CLAUDE.md chain, relevant
  ADRs, the sibling EXEMPLAR the code mirrors); the surrounding code it must study.
  Tell it to verify external-API claims against installed types, and to separate
  CONFIRMED bugs from PLAUSIBLE concerns.
- Demand four lanes in priority order: (1) correctness bugs with a concrete failure
  scenario; (2) rule/layering violations with the cite; (3) anti-idiomatic drift vs the
  exemplar; (4) architecture improvements that leave the codebase MORE elegant than
  found. Lane 4 hard constraint: an industry-solved pattern gets NAMED and recommended
  over any bespoke reinvention.
- Then TRIAGE, do not obey. Audit each finding against source; fresh reviewers also
  hallucinate. Fix correctness and rule violations; weigh elegance refactors under
  build-it-right-now, and say why when you skip one. If a fix touches shipped code,
  RE-RUN gates and RE-VERIFY live before ship. Record the review outcome in the close
  notes.
- If the repo has integration test infra and the feature has 3+ endpoints or a state
  machine, spawn a fresh agent to write tests from contracts only (tdd skill,
  fresh-context pattern). Run them against the implementation before ship.

### 7. Ship
- Coherence gate, before anything else in this step: if the repo has an ADR lint
  (`scripts/adr-lint.mjs` or equivalent), it runs green; if an arch-lint exists
  (dependency-cruiser or equivalent), it runs green. A diff that moves a registry,
  contract, or enum an ADR names carries the dated ADR amendment in the SAME diff,
  linked on both records (knowledge law rule 3); without it the slice does not ship.
- Follow the REPO's commit policy. Default: do NOT commit; the user owns staging and
  commits. Hand back the grouped, gate-green tree and say exactly what to stage,
  calling out unrelated drift to leave out (triage with `scripts/classify-drift.sh`).
  Never create or switch branches unless explicitly asked.
- If the repo or user delegates committing: verify HEAD is still where you started
  (another agent may have advanced it), commit in dependency order with explicit paths,
  never `git add -A` or `git add .` (guard.sh blocks both). Messages say WHY. No
  Co-Authored-By lines. No em-dashes anywhere. Then RE-RUN the gates at the committed
  HEAD: staging is where a file lands in the wrong commit or gets left behind. Never
  `--amend` on a shared branch.
- Append an entry to `docs/agents/build-notes.md`: what was actually built: schema
  shapes, API contracts, component interfaces, deviations from spec, and what the next
  consumer needs to know. This is how you tell downstream agents and humans what
  exists. Include it with the shipped work.
- Close the issue with an HONEST AC status against the gate BASELINE:
  `scripts/baseline.sh compare` makes "no NEW red" mechanical. Tick what is proven,
  mark partial what is written-but-unrun, label inherited red as not-yours with the
  cite, name the follow-ups (into `docs/agents/debts.md`). Name the coherence
  evidence explicitly: which lints ran green, and which ADR amendments (if any)
  ride in the diff.
- Always end with a RUNBOOK: copy-pasteable steps the user runs to see what THIS
  session built working. Cover exactly the commands NOT proven headlessly (browser
  flows, OTP/login, UI clicks) plus the read-back that confirms the effect landed.
  State prerequisites, the success signal at each step, and where a dev secret
  surfaces. Verify live yourself whatever you can and mark those PROVEN so the user
  only runs the residue.
- Finish with the wrap skill (closing ceremony): NOTES.md, debts, gotchas, ADR check,
  stamp.

## References
- `references/slicing.md`: vertical tracer-bullet rules, when horizontal is acceptable
- `references/verification.md`: per-slice live-checkpoint patterns, runbook format
- `references/shipping.md`: exclude-drift, close-honest handback recipe

## Scripts
- `scripts/baseline.sh capture|compare`: snapshot inherited gate red, diff for NEW red
- `scripts/rename-sweep.sh <old> <new>`: separator-agnostic grep + TS2724 backstop
- `scripts/classify-drift.sh`: tag the working tree CODE vs DRIFT? before staging
- `scripts/guard.sh`: PreToolUse:Bash hook blocking `git add -A/.` and branch creation
