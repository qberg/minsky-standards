# @minsky-org/adapter-seam

One fail-closed policy for every "real adapter or in-memory fake" seam. Zero runtime
dependencies.

- creds present, use the real adapter
- creds absent in production, throw (a silent fake in prod is a data-loss bug)
- creds absent elsewhere, warn once per seam and use the fake

```ts
import { resolveAdapter } from "@minsky-org/adapter-seam";

export const getSearch = () =>
  resolveAdapter({
    seam: "search",
    credsPresent: Boolean(env.MEILI_URL),
    isProduction: env.NODE_ENV === "production",
    real: () => createMeiliSearch(),
    fake: () => createFakeSearch(),
  });
```

Resolve lazily at first use, never at module load, so a fake never gets baked in before
the env is read.

## Why production is a parameter

`isProduction` is a required field on the args object. The package never reads
`process.env.NODE_ENV` itself. Three reasons:

- it matches the org stack law that `parseEnv` always takes its input explicitly, so
  every env read in a codebase happens in one place
- it makes the function testable without mutating the global environment, so tests do
  not leak state into each other
- it keeps the production decision visible at the call site, so a reader knows which
  branch runs without coming here to find out

This module is server-side by nature. It resolves adapters that hold credentials, and
credentials never belong in a browser bundle. `process.emitWarning` below is a node API,
so none of the above is a claim that the module is browser-safe.

## Warnings

The dev-mode warning goes through `process.emitWarning(message, "AdapterFallback")`, not
`console.warn`. A consumer can filter the named warning off the process warning event
instead of scraping stdout.

## Test seam

`resetAdapterWarnings()` clears the module-global warned-seam set. Call it in a test
teardown so warn-once behaviour can be asserted without depending on test order.

```ts
import { resetAdapterWarnings } from "@minsky-org/adapter-seam";

afterEach(() => {
  resetAdapterWarnings();
});
```

## Breaking change in 0.2.0

`isProduction` is now required. A 0.1.x call site adds the field and drops any
`NODE_ENV` juggling around the call.
