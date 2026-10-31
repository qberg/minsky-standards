# Minsky stack law: the server and the contract

One chapter of `stack.md`, split out 2026-10-31 so a repo loads it by path (apm's context round,
founder's word). Org-wide; receipts in the source repos' ADRs.

## Proven gotchas

- oRPC no-input: OMIT `.input()` entirely, never `v.void()` (OpenAPIHandler injects
  `{}`) and never `object({})`. Optional GET args = `object({ x: optional(...) })`.
- Contract package: no wildcard export; every subpath import needs an explicit
  `exports` entry first.
- Bulk actions = AIP-235 batch: `{ids}` in, `{results:[{id,status}]}` out; partial
  success is contract; one `IN(...) RETURNING`, no `Promise.all` fan-out.
- Fake-able external seam: resolve-adapter (creds = real; prod missing = throw; dev =
  warn-once fake). Never hand-roll `key ? real : fake`; resolve lazily at first use.
- Job payloads = claim-check (`{index, entityId}`), never snapshot docs:
  retry-reorder overwrites newer state. The worker re-reads the source of truth.
- Cache-aside: the WRITER invalidates after commit; never rely on TTL.
