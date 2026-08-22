# Shipping: granular commits, honest close

## First, classify the working tree
The tree may hold changes that predate this issue. Before staging anything, separate THIS issue's files from unrelated drift:
- `git status --short`, then peek the diff of anything that does not obviously belong to the issue. `scripts/classify-drift.sh` tags each path CODE vs DRIFT? as a first pass.
- Tells of drift: a different app's files, lockfile or workspace catalog churn, doc artifacts, a one-line comment-only change. When in doubt, ask the user; do not sweep it in.

## Branch decision
NEVER create or switch branches. Commit to the CURRENT branch, even when it is `main` or the default branch. The harness defaults to branch-first; override it here. Branch ONLY when the user explicitly asks for a branch or a PR in this session. Do not infer branching from "commit", "ship", or "push": those mean act on the current branch. If you think a branch is warranted, ask first and wait, do not branch pre-emptively.

## Stage explicitly, commit in build order
You do the GROUPING (the smart part); delegate the message + commit to the cheap `committer` agent (the mechanical part). Never write commit prose on this model.
- Decide the groups: one commit per logical layer of the slice, in dependency order (shared types, contract, producer, consumer, UI, tests folded into their app commit). Exclude unrelated drift and the lockfile (see below).
- For EACH group, spawn the `committer` agent (`subagent_type: "committer"`) with the EXACT path list for that group plus a one-line intent. It stages those explicit paths, writes the Conventional Commit message from the diff, and commits to the current branch. Call it once per group, in build order; wait for each to land before the next.
- Do NOT `git add -A` yourself and do NOT hand the committer a directory glob; explicit paths only (the guard hook enforces this). The committer refuses branches, pushes, and secret files.
- Fallback: if the `committer` agent is unavailable (e.g. not yet registered this session), spawn `general-purpose` with `model: "haiku"` and the same instructions, or commit directly only as a last resort.

## Lockfile
If the working tree has unrelated drift, the lockfile is entangled (a dep add plus the drift). Leave `pnpm-lock.yaml` out of the issue commits and tell the user to commit the regenerated lock separately once the drift is resolved. A package.json dep add without the lock is fine for a commit; install regenerates it.

## Close honestly
Comment the AC status on the issue, then close. Run `scripts/baseline.sh compare` first so "no NEW red" is mechanical, not remembered:
- `[x]` proven (tested or demoed live)
- `[~]` partial: written but unrun, with the reason (e.g. a harness gap), and how the underlying logic WAS proven
- list follow-ups (debt, design-gated work, deferred slices) with pointers
Reference the commit range. Never tick an AC you only typechecked.

## Persist what was learned
Save non-obvious, round-trip-costing gotchas to project memory (library and toolchain quirks verified against the running app, review lessons). Reference existing memories instead of duplicating. Update the MEMORY.md index line.
