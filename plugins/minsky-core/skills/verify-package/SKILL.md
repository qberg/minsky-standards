---
name: verify-package
description: Verify a change in any package or app of a monorepo the right way: scoped commands, the no-NEW-errors baseline method, cross-package guard awareness, and the flake protocol. Use before declaring any slice done, when a test fails and you suspect a flake, or when deciding which checks a diff needs. Written for subagents executing scoped work.
---

# Verify a package change

Gate for any slice = **no NEW failures**, never "everything green". A brownfield repo
carries known pre-existing failures and shared-infra flakes. Method: capture baseline,
change, diff the failures.

Repo specifics live in the repo, not here: read `docs/agents/verify.md` for the scoped
command table, the cross-package guard table, and the current flake list. If the repo
lacks that file, derive commands from its CLAUDE.md and package.json, and create the
file as you learn (dated entries; a flake list is only trustworthy with a verify date).

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

## Reporting contract

Failures only. Passing = one line, `N passed`. A failure needs: file, assertion or
error, one-line cause, and whether the isolation rerun cleared it. Never paste full
runner output.
