---
name: db-change
description: Workflow for any Postgres schema change in a drizzle monorepo: vocab first, schema edit, generate, review the emitted SQL, migrate, downstream sync. Use when adding or altering tables, columns, enums, constraints, or indexes, when writing a migration, or when a schema change must propagate to seeders, caches, or search. Written for executor agents of any size; follow it literally.
---

# DB change: the one flow

Schema truth lives in the repo's database package schema files (glob-registered by
`drizzle.config.ts`; a new `*.schema.ts` file is picked up automatically). Migrations
are **drizzle-generated, never hand-authored**. Casing is `snake_case` via config:
write camelCase in TS, never hand-snake column names.

Repo specifics (package names, migrate commands, remote-env wrappers, the downstream
checklist) live in the repo: read `docs/agents/db-downstream.md`. If the repo lacks it,
derive from its database package and CLAUDE.md, and create the file as you learn.

## Steps

1. **Vocab first, schema second.** A cross-boundary enum/status/role is declared in
   the shared domain-types package (`as const satisfies`, key arrays DERIVED via
   `Object.keys(Registry) as readonly Key[]`) BEFORE the schema. DB mirrors it as
   `text` + CHECK constraint, never a PG enum for domain statuses (enum value changes
   are migration pain; CHECK swaps are one statement).
2. **Edit the schema file.** Bucket placement mirrors the modular-monolith layout
   (kernel / shared / modules). Invariants belong IN the schema: CHECK, FK, NOT NULL,
   unique. App-level checks are UX fast-path only.
3. **Generate, then READ the emitted SQL line by line** before proceeding. Wrong SQL =
   fix the TS schema and regenerate; never edit an emitted file to patch generator
   output. Hand-SQL exceptions (only these): `ALTER TYPE ... RENAME VALUE` for
   non-destructive enum renames (drizzle emits a DESTRUCTIVE drop/recreate for a value
   rename; read the SQL, hand-write the rename, keep the snapshot, re-run generate to
   confirm "No schema changes"); `EXCLUDE` constraints (no drizzle builder).
   Expression indexes round-trip clean; use the builder.
4. **Apply** locally with the repo's migrate command. Staging/prod only through the
   repo's sanctioned remote wrapper; never hand-export a remote DB URL.
5. **Downstream sync.** Walk the repo's `docs/agents/db-downstream.md` checklist:
   seeders, cache invalidation (the WRITER busts keys, never TTL-hope), search
   projections/backfills, generated types. Every box, every time.

## Laws (violations = review rejection)

- **Shared branch, concurrent agents.** Another agent may land a migration under you.
  Before generating, check the drizzle journal; if your generated number collides with
  a freshly-landed one, delete YOUR file and regenerate. Never renumber someone
  else's. Never `git commit --amend`.
- **Applied is not committed.** A migration can be applied to an env yet uncommitted,
  or committed yet unapplied. The final report states both facts explicitly per env
  ("migration 00XX: committed, applied local, NOT applied staging").
- **Never edit an already-applied migration.** New migration on top, always.
- **Async side-effects are transactional.** Any async consequence of a write (search
  sync, notification) is staged into the outbox INSIDE the same business transaction.
- **Timestamps:** ISO strings admit tz offsets; order-compare via
  `new Date(x).getTime()`, never string comparison. Don't mix app clock with DB
  `now()` in one window computation.
- **Tests:** every new error path (CHECK violation, FK violation you surface) gets a
  test. A shared test DB runs parallel: unique-per-test ids, teardown scoped to your
  ids only.
- **TS strictness:** index access is `T | undefined` under `noUncheckedIndexedAccess`;
  optional insert fields need conditional spread `...(cond ? { x } : {})`, never
  `{ x: undefined }`.

## Done =

Generate is idempotent (no diff), migrate applied, downstream checklist walked,
verify-package cadence run on touched packages, honest status report including
applied-vs-committed per env. Follow the repo's commit policy (default: the user owns
commits).
