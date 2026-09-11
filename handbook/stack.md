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
- TypeScript 7 (native Go port, GA 2026-07-08) is a drop-in for a MODERN config: the
  breaking changes sit at the 5.x -> 6.0 boundary, not 6 -> 7, so a greenfield repo
  skips the two-step migration entirely. Now hard errors: `baseUrl`, `target: es5`,
  `downlevelIteration`, `moduleResolution: node/node10/classic`, `module:
  amd/umd/systemjs/none`, `esModuleInterop: false`. `types` defaults to `[]` (was
  every @types package), so each package lists what it needs. What BLOCKS adoption is
  the missing programmatic API until 7.1: typescript-eslint, Vue, Svelte, Astro, MDX,
  Angular templates, Volar. None of them apply to this stack (biome has no type-aware
  lint, so typescript-eslint was never in it), and Storybook's TS-API docgen is opt-in
  (`react-docgen-typescript`, peer `>= 4.3.x`); the default `react-docgen` is
  babel-based and needs no compiler API. If a dep does need the API, bridge with
  `@typescript/typescript6` (`tsc6` binary, re-exports the 6.0 API) before reverting
  the major. Proven greenfield in apm 2026-09-06 (#98). Receipt:
  https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- `minimumReleaseAge` is 11200 minutes (~7.8 days) in the org pnpm config, so
  `npm view <pkg> version` is NOT the pin to write: anything published inside that
  window cannot resolve at all. Pin the newest release older than the cutoff, with a
  caret so the fresher one lands by itself once it ages in. Sort candidates by SEMVER,
  never by publish date: a backport to an older line (react 19.0.8 shipped after
  19.2.8 on the same day) makes a date sort silently pick the older release.
  `minimumReleaseAgeExclude` carries `@minsky-org/*`, own packages trusted at any age.
  A sibling repo's catalog block is a snapshot, never a source of truth: copying one
  verbatim into a new repo shipped nine stale pins and two legacy entries.
- Biome honours `extends` only in the ROOT config: a config that is itself extended
  never chains further, and nothing is reported. `@minsky-org/biome-config` extended
  ultracite internally until 0.3.0, so every consumer silently ran on Biome defaults
  (tabs, trailing commas everywhere, 80 columns) with none of ultracite's rules. The root
  `biome.jsonc` lists `ultracite/biome/core`, `ultracite/biome/react`, then the org
  layer, in that order. Verify a formatter claim by reading `JsFormatOptions` from
  `biome format --log-level=debug`, never by reading the file back: a config error
  leaves the probe untouched and looks like success. Proven in apm 2026-09-07.
- Publish a workspace package with pnpm, never npm. `npm pack` and `npm publish` ship a
  `workspace:` dependency verbatim and the tarball then installs nowhere
  (`EUNSUPPORTEDPROTOCOL`); pnpm rewrites it to the real version. A verification that
  packs with npm fails and looks like the code is broken when the packing tool is the
  only thing wrong.
- `@types/*` for a runtime track its MAJOR line, not the API you want. An API added in a
  later minor can be typed only on the NEXT major's line. Taking that newer major's
  types to get one API promises every API of that major to code running on the older
  one: it compiles clean and throws live. Types track the ENGINES FLOOR, never the dev
  machine. Verify a "the types have it" claim by unpacking the tarball and grepping it
  (`npm pack @types/<x>@latest`), never by reading a changelog.
