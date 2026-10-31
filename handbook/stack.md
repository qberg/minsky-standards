# Minsky stack law

The org stack and its version-proven gotchas. Org-wide; loaded via each repo's
CLAUDE.md import. Repo-specific infra (deployed services, env names, product
packages) stays in the repo.

## The stack

- TypeScript strict, pnpm monorepo (`catalog:` for versions), turbo. New repos start
  on TS 7; existing repos move when their tooling clears the 7.1 API gap.
- Validation = **valibot** (never zod). FSM = **xstate**. IDs = **uuid v7**.
- DB = Postgres + drizzle. API = Hono + oRPC, contract-first. Auth = better-auth.
- Async = transactional outbox -> relay -> queue worker. Search = Meilisearch behind
  a port. Cache = Valkey/ioredis, cache-aside, writer invalidates.
- FE = React 19; admin and public SPAs on TanStack Router/Query (apm ADR-0071 replaced
  "public on Next" 2026-09-11: Next needs the TypeScript programmatic API and doubles
  every tooling seam; anonymous pages render at publish time to static files); styling =
  Tailwind v4 + tokenized design system (tribune); motion = the motion lib for
  perceptible gestures, CSS for micro-fades.

## Proven gotchas (receipts in the source repos' ADRs)

- xstate v5 stateless oracle (guard, no interpreter): standalone
  `transition(machine, snap, ev)` + `machine.resolveState({value})`. NOT the
  `.transition` method (wants actorScope) nor `getNextSnapshot` (deprecated). Legal =
  `next.value !== from`, sound only if the machine has zero self-loops.
- valibot `check` on an object: extract the object to a named schema and put the check in
  a `pipe` around it. Then either leave the callback arg BARE (`pipe` types it from the
  schema, which compiles) or annotate it `InferOutput<typeof Schema>`. Only a HAND-WRITTEN
  annotation trips TS2769, and the cause is `exactOptionalPropertyTypes`: valibot infers
  `optional(x)` as `k?: T | undefined`, so a hand-written `k?: T` is rejected. Sharing one
  predicate across two STRUCTURALLY IDENTICAL named schemas is fine, `InferOutput` carries
  no brand. TS2769 comes from the output types DIFFERING, from a supertype predicate
  binding as `TInput`, or from hoisting the `CheckAction` to a const, which freezes
  `TInput` at construction: hoist the PREDICATE, construct the action per schema. The
  invariance is real (`T` sits in both the parameter and the return of `~run`), so the fix
  stands: `check<InferOutput<typeof Schema>, string>(fn, msg)`, both type params always
  (one alone selects the message-less overload and fails TS2554; a genuinely mismatched
  predicate still fails TS2345). Two consequences for forms: an object-level `check` issue
  has `path === undefined`, so a cross-field error cannot be routed to a control by path
  and every cross-field rule must name its own target field; and an explicitly passed
  `undefined` is copied to the output, so presence checks use `!== undefined`, never `in`.
  Corrected 2026-09-09 against valibot 1.4.2, 15 gates in apm
  `experiments/valibot-variant-compile`; the previous wording had the inline and the
  shared-predicate clauses backwards.
- valibot `isoTimestamp` admits tz offsets: order-compare via
  `new Date(x).getTime()`, never string comparison.
- Cross-boundary vocab (enums, roles, permissions) lives in the shared domain-types
  package as `as const satisfies`; FE/BE/DB all import it, never redeclare.
- Server and contract gotchas (oRPC no-input, contract exports, AIP-235 batch, resolve-adapter,
  claim-check jobs, cache-aside) live in `handbook/stack-server.md`, which a repo loads by path; read
  it by hand before designing an endpoint, a job, a cache or an external seam.
- Env parsing: `parseEnv(schema, input)`, second arg always explicit
  (`process.env` server / `import.meta.env` client); no default = browser-safe.
- Tooling and packaging gotchas (native builds, bundling, biome, TypeScript 7, pnpm pins and
  publishing, `@types`) live in `handbook/stack-tooling.md`, which a repo loads by path; read it by
  hand before changing a package manifest, a tsconfig or a build config.
- TS strictness org-wide: `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess`
  ON. Never pass `{x: undefined}` to optional `x?`: conditional spread
  `...(cond ? { x } : {})`. Index access / array destructure = `T | undefined`.
- Frontend gotchas (Tailwind v4, React 19 effects, Lingui, TanStack Router codecs) live in
  `handbook/stack-frontend.md`, which a repo loads by path; read it by hand before designing a
  surface, a route or its URL state.
- biome v2 has no type-aware lint: `noFloatingPromises` off (async fn to `onClick`
  is fine); `noVoid` on (use `| undefined`, not `| void`, in unions); hoist regexes
  module-level.
- `tsx` does not typecheck: a job passing at runtime is not evidence it compiles.
- Postgres and drizzle gotchas (enum renames, lock queries, row-level security) live in
  `handbook/stack-db.md`, which a repo loads by path; read it by hand before designing a table,
  a migration, a lock or a policy.
