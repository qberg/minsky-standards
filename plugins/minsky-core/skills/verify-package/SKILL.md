---
name: verify-package
description: Verify a change in any package or app of a monorepo the right way: scoped commands, the no-NEW-errors baseline method, cross-package guard awareness, and the flake protocol. Use before declaring any slice done, when a test fails and you suspect a flake, or when deciding which checks a diff needs. Written for subagents executing scoped work.
---

> Talking to the founder: follow `handbook/working-with-the-founder.md` (For you: first, real options side by side with a pick, core idea then analogy then example then detail, walkthroughs as a named person, friendly and honest).

# Verify a package change

Gate for any slice = **no NEW failures**, never "everything green". A brownfield repo
carries known pre-existing failures and shared-infra flakes. Method: capture baseline,
change, diff the failures.

Repo specifics live in the repo, not here: read `docs/agents/verify.md` for the scoped
command table, the cross-package guard table, and the current flake list. If the repo
lacks that file, derive commands from its CLAUDE.md and package.json, and create the
file as you learn (dated entries; a flake list is only trustworthy with a verify date).

## Quiet gates (the window is the cost)

A gate's value is its verdict; its log is noise that then rides every later turn. Run gates through
`scripts/gate.sh` next to this file: `gate.sh <pnpm-filter> [gate ...]` runs typecheck, lint, test and
check:tokens (whichever the package has) and prints PASS or FAIL per gate plus the first fifteen
telling lines of the first failure; the full log waits in `/tmp/gate/`, grep it only on failure.
`gate.sh run "<label>" "<command>"` wraps any other command the same way. The plugin's `noisy-bash`
hook asks before a bare gate command; `# full-log` on the command is the deliberate escape for a
diagnosis that needs the whole output. Screenshots follow the same law: read a cropped region at 1x,
the full page at 4x only when the judgment needs it.

## No-NEW-errors method

1. Before editing: run the scoped typecheck/tests once; record failures (or trust a
   baseline the orchestrator gave you).
2. After editing: rerun; report only the delta.
3. When unsure whether an error is yours: NEVER `git stash` on a shared branch with
   concurrent agents (a repo-wide stash has nuked another agent's work before).
   Instead: `git status --porcelain` (is the failing file even in your diff?) plus
   `git log -1 -- <file>` (last touched by an unrelated commit = pre-existing). Need a
   real clean-tree run: `git worktree add` a throwaway checkout, never stash.
4. For lint: run the repo's checker on exactly your touched files, so pre-existing
   repo noise stays out of your report.

## Cross-package guards

Some vocabularies are split across packages on purpose, so no compiler links them and
a scoped typecheck of the packages you edited proves nothing. The guard is a test
somewhere else that nothing in your diff points at. The repo's `docs/agents/verify.md`
lists these you-changed-X-also-run-Y pairs. When you DISCOVER one the hard way, add it
to that table before closing; the table is the only memory this class of bug has.

## Flake protocol

- A failure in shared-infra tests (DB counts, queue races, first-run tool reloads)
  gets ONE isolated rerun of the failing file or package. Isolated green = flake:
  report it as such against the repo's known-flake list. Isolated red = REAL: yours to
  triage, and root-cause is owed before the suite grows.
- A flake NOT on the repo's list gets added there with date, symptom, handling, and
  the unbuilt real fix if known.
- A runtime-only runner (tsx and friends) does not typecheck. A job passing at runtime
  is NOT evidence it compiles; run the typecheck.

## Dead code and duplication (fallow), at close only

fallow runs when a FEATURE closes (the tracker card moving to done), never per edit and never per session:
a half-built slice is allowed to hold code its next step will import. Proven in apm 2026-09-27, where the
gate had been skipped for a week and a closing pass found drift from six sessions at once.

- Its findings are QUESTIONS for the agent, never an order to delete. Unused code gets one of three answers:
  used now; dead (left over or replaced), so delete it after `npx fallow dead-code --trace <file>:<name>`;
  or kept for a named next step, `/** @expected-unused #<open issue>: <who imports it> */`. fallow reports
  that tag as stale once something imports it, so a label cannot rot (fallow's own
  `skills/fallow/references/gotchas.md`, "@expected-unused JSDoc Tag"). A label names an open issue, never
  "might be useful".
- Copied code and same-named exports across features are a DESIGN question: two features want one shape.
  The answer is the shared mechanism, never a rename that hides the match (handbook, "Design the whole").
- Test files are entry points (fallow's vitest and jest plugins find them). Never put `*.test.*` in
  `ignorePatterns`: every helper only tests import then reads as dead.
- The gate is a ratchet: counts may only fall, and a close that leaves it red names the debt that owes it.

## Reporting contract

Failures only. Passing = one line, `N passed`. A failure needs: file, assertion or
error, one-line cause, and whether the isolation rerun cleared it. Never paste full
runner output.
