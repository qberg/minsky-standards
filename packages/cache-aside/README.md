# @minsky/cache-aside

Read-through cache-aside over ioredis, with schema-validated entries and prefix
invalidation. No key namespace of its own: the consumer owns every key string.

**The writer invalidates.** Never rely on a TTL to fix a stale read. A write to the
source of truth calls `invalidatePrefix` for the keys it just falsified.

```ts
import { createCache } from "@minsky/cache-aside";
import { bindRegistry, defineCacheNode } from "@minsky/cache-aside/registry";

const cache = createCache({ client: redis, logger: toPino(logger) });

const nodes = bindRegistry({
  ward: defineCacheNode({
    key: (id: string) => `db:ward:${id}`,
    ttl: 3600,
    schema: WardSchema,
  }),
});

const ward = await cache.withCache(nodes.ward(id), () => loadWard(id));
```

Notes:

- An entry that fails its schema is treated as a miss, so a poisoned or stale-shaped
  key self-heals instead of leaking a wrong type to callers.
- A Redis failure on read or write is logged and swallowed: the source of truth still
  answers. Only the fetcher's own throw reaches the caller.
- In-flight coalescing is process-local. Multi-replica stampede control needs a Redis
  `SET NX` lock, which this package does not do.
- `logger` is a single function, so any logger adapts in three lines. Default is silent.
