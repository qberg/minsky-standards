# @minsky/adapter-seam

One fail-closed policy for every "real adapter or in-memory Fake" seam. Couples to
nothing but `NODE_ENV`.

- creds present, use the real adapter
- creds absent in production, throw (a silent Fake in prod is a data-loss bug)
- creds absent elsewhere, warn once per seam and use the Fake

```ts
import { resolveAdapter } from "@minsky/adapter-seam";

export const getSearch = () =>
  resolveAdapter({
    seam: "search",
    credsPresent: Boolean(process.env.MEILI_URL),
    real: () => createMeiliSearch(),
    fake: () => createFakeSearch(),
  });
```

Resolve lazily at first use, never at module load, so a Fake never gets baked in
before the env is read.
