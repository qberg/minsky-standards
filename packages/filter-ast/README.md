# @minsky-org/filter-ast

One filter AST, three executors. A validated tree compiles to a drizzle `WHERE`, to a
Meilisearch filter string, or to an in-memory predicate, and all three agree. The
golden suite is what proves they agree.

```ts
import { toDrizzleWhere } from "@minsky-org/filter-ast/drizzle";
import { toMeiliFilter } from "@minsky-org/filter-ast/meili";
import { validateAst } from "@minsky-org/filter-ast/validate";

const registry: FieldRegistry = {
  status: { type: "enum", enumValues: ["open", "closed"], operators: ["is"] },
};
```

## Invariants

- **Authz scope is never in the AST.** The executor injects the caller's scope after
  compiling. A hostile URL can therefore widen a filter, never widen what the caller
  may see.
- **Compilers require a pre-validated AST.** `validateAst` returns a `Result`;
  `assertValidAst` throws, and both compilers call it first.
- **Depth, width, and array length are capped** because the AST arrives from a URL.
- `date` is a finite epoch-ms instant, `calendar-date` is a `YYYY-MM-DD` string. The
  Meili compiler stores calendar dates as numbers, which is what the projection writer
  must also do.

The Meili compiler emits a filter string and has no client dependency; `drizzle-orm` is
an optional peer needed only by the drizzle compiler.

## Golden suite

`src/golden.test.ts` runs the same cases against a real Postgres and a real
Meilisearch, and self-skips when neither is reachable.

```
TEST_DATABASE_URL=postgresql://...:5432/minsky_filter_test MEILI_URL=... pnpm test
```

The database name must end in `_test`, since the suite creates and drops tables.

## Test harness gotcha

vitest `describe.skipIf` skips the tests but still EXECUTES the describe body at
collection time. Any setup with side effects (DB connections, index creation) must be
independently gated: `if (reachable) { describe(...) }`. The golden tests here do
this; copy the shape when adding suites.
