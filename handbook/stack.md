# Minsky stack law

The org stack and its version-proven gotchas. Org-wide; loaded via each repo's
CLAUDE.md import. Repo-specific infra (deployed services, env names, product
packages) stays in the repo.

## The stack

- TypeScript strict, pnpm monorepo (`catalog:` for versions), turbo.
- Validation = **valibot** (never zod). FSM = **xstate**. IDs = **uuid v7**.
- DB = Postgres + drizzle. API = Hono + oRPC, contract-first. Auth = better-auth.
- Async = transactional outbox -> relay -> queue worker. Search = Meilisearch behind
  a port. Cache = Valkey/ioredis, cache-aside, writer invalidates.
- FE = React 19; admin SPA on TanStack Router/Query, public on Next; styling =
  Tailwind v4 + tokenized design system (tribune); motion = the motion lib for
  perceptible gestures, CSS for micro-fades.

## Proven gotchas (receipts in the source repos' ADRs)

- xstate v5 stateless oracle (guard, no interpreter): standalone
  `transition(machine, snap, ev)` + `machine.resolveState({value})`. NOT the
  `.transition` method (wants actorScope) nor `getNextSnapshot` (deprecated). Legal =
  `next.value !== from`, sound only if the machine has zero self-loops.
- valibot `check` on an object: extract the object to a named schema, type the
  callback arg as `InferOutput<typeof Schema>`; an inline/narrowed arg trips TS2769
  under `exactOptionalPropertyTypes`. The `~types` brand is INVARIANT, so sharing one
  predicate across two schemas trips TS2769 even with a named function; fix with
  explicit params: `check<InferOutput<typeof Schema>, string>(fn, msg)` (one type
  param alone selects the message-less overload and fails TS2554).
- valibot `isoTimestamp` admits tz offsets: order-compare via
  `new Date(x).getTime()`, never string comparison.
- Cross-boundary vocab (enums, roles, permissions) lives in the shared domain-types
  package as `as const satisfies`; FE/BE/DB all import it, never redeclare.
- oRPC no-input: OMIT `.input()` entirely, never `v.void()` (OpenAPIHandler injects
  `{}`) and never `object({})`. Optional GET args = `object({ x: optional(...) })`.
- Contract package: no wildcard export; every subpath import needs an explicit
  `exports` entry first.
- Bulk actions = AIP-235 batch: `{ids}` in, `{results:[{id,status}]}` out; partial
  success is contract; one `IN(...) RETURNING`, no `Promise.all` fan-out.
- Env parsing: `parseEnv(schema, input)`, second arg always explicit
  (`process.env` server / `import.meta.env` client); no default = browser-safe.
- Fake-able external seam: resolve-adapter (creds = real; prod missing = throw; dev =
  warn-once fake). Never hand-roll `key ? real : fake`; resolve lazily at first use.
- Job payloads = claim-check (`{index, entityId}`), never snapshot docs:
  retry-reorder overwrites newer state. The worker re-reads the source of truth.
- Cache-aside: the WRITER invalidates after commit; never rely on TTL.
- Native-build deps (sharp, esbuild) must also be in `onlyBuiltDependencies`
  (pnpm-workspace.yaml) or pnpm skips their build.
- Bundled node apps must set `noExternal` for workspace packages (they export raw
  TS); native deps stay external.
- TS strictness org-wide: `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess`
  ON. Never pass `{x: undefined}` to optional `x?`: conditional spread
  `...(cond ? { x } : {})`. Index access / array destructure = `T | undefined`.
- Tailwind v4: off-scale utilities need arbitrary syntax (`z-[45]`, not `z-45`,
  which is silently ignored). Non-color token blocks in `@theme` need
  `@theme static` or v4 prunes unscanned vars.
- biome v2 has no type-aware lint: `noFloatingPromises` off (async fn to `onClick`
  is fine); `noVoid` on (use `| undefined`, not `| void`, in unions); hoist regexes
  module-level.
- `useEffectEvent` is stable (React 19.2); never in dependency arrays. External-store
  subscriptions (matchMedia/online/storage) = `useSyncExternalStore`, never
  useState + effect. Heavy client libs = dynamic import at the leaf.
- Lingui: import macros directly from `@lingui/*/macro` at the call site; a re-export
  silently breaks extraction. Whole sentences per `<Trans>`, never fragments.
- `tsx` does not typecheck: a job passing at runtime is not evidence it compiles.
- drizzle-kit emits a DESTRUCTIVE drop/recreate for an enum value rename: read the
  generated SQL, hand-write `ALTER TYPE ... RENAME VALUE`, re-generate to confirm
  clean.
- Lock queries are join-free: postgres rejects `FOR UPDATE` on the nullable side of
  an outer join, and drizzle `.for("update")` emits the clause verbatim (runtime
  error, not compile). And the lock alone does not close an insert race: under READ
  COMMITTED a blocked waiter re-evaluates the row (EvalPlanQual), a no-longer-matching
  row vanishes, and the waiter's insert trips the unique index. Catch the 23505 as
  the retryable outcome (map to 409); it is part of the pattern, not a fallback.
- TanStack Router form-encodes every search codec's output via URLSearchParams
  (router-core qss), so the wire query is percent-escaped for ANY codec; judge
  codecs on wire length and decoded-display readability, never raw-wire looks.
- Lenient URL codecs (jsurl2: `parse("(broken~")` = `{broken:true}`, no throw) slip
  junk OBJECTS past TR's keep-raw-string catch; every URL-sourced valibot key wraps
  `v.fallback`, never bare `v.optional` (route-errors on a bad link).
