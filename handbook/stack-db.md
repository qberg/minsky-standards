# Minsky stack law: Postgres and drizzle

One chapter of `stack.md`, split out 2026-10-31 so a repo loads it by path (apm's context round,
founder's word). Org-wide; receipts in the source repos' ADRs.

## Proven gotchas

- drizzle-kit emits a DESTRUCTIVE drop/recreate for an enum value rename: read the
  generated SQL, hand-write `ALTER TYPE ... RENAME VALUE`, re-generate to confirm
  clean.
- Lock queries are join-free: postgres rejects `FOR UPDATE` on the nullable side of
  an outer join, and drizzle `.for("update")` emits the clause verbatim (runtime
  error, not compile). And the lock alone does not close an insert race: under READ
  COMMITTED a blocked waiter re-evaluates the row (EvalPlanQual), a no-longer-matching
  row vanishes, and the waiter's insert trips the unique index. Catch the 23505 as
  the retryable outcome (map to 409); it is part of the pattern, not a fallback.
- Postgres row-level security can silently drop an index. Under RLS the planner will not run a user
  predicate before the policy unless its operator is `LEAKPROOF`, and in PG 18 several everyday ones
  are not (`arraycontains`, the GIN `@>`; `numeric_le`; `date_mi`), so the filter runs after the
  policy with no index. Results stay correct and every test stays green; only speed moves. A policy
  column read from the heap costs too; carry it in the index with `INCLUDE`. Read EXPLAIN as the
  restricted role, never as the owner. Proven in apm 2026-09-25: matching lost its GIN index (p95
  1.0 to 3.4 ms), group counts rose to 290 ms and fell to 41 ms with `INCLUDE (read_rung)`
  (apm `experiments/attribute-value-storage/round2/README.md` lines 187 to 202, 326 to 329).
- A custom setting (`SET LOCAL app.actor = ...`) read by an RLS policy is not an identity: any caller
  who can run SQL can reset it with `SET` or `set_config` and become someone else. Proven in apm
  2026-09-25, 5 of 5 escalations by a restricted role (round 2 README line 65). Either no restricted
  caller ever runs SQL, or the setting is bound to the server (apm's signed payload stopped all five
  and is pending a cold review, so it is not yet the org answer).
- RLS hides content, never metadata. With every hidden value held back across 104 attacks, a
  restricted role still learned about hidden rows from EXPLAIN estimates and "Rows Removed by
  Filter", catalog row counts and sizes, a unique index's duplicate-key refusal on a hidden value,
  a shared id sequence, and query time tracking the hidden count. So a restricted reader gets no raw
  SQL, EXPLAIN or catalog access, never filters on a column it cannot see, and unique is never
  combined with hidden (a refusal proves the value exists). Proven in apm 2026-09-25 (round 2
  README lines 128, 243, 251; law form apm ADR-0119 s12).
