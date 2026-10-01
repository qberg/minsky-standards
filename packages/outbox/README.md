# @minsky-org/outbox

Transactional outbox for Postgres (drizzle) plus a BullMQ dispatcher. The job row is
written inside the business transaction, so "the state changed" and "the side effect
was scheduled" cannot disagree. A relay then claims rows with `FOR UPDATE SKIP LOCKED`
and hands them to a queue.

The package owns no table and no queue vocabulary: the consumer supplies both.

## The table

Any drizzle `pgTable` with these columns satisfies `OutboxTable`.

```sql
create type outbox_status as enum ('pending', 'processing', 'completed', 'failed');

create table outbox_jobs (
  id uuid primary key,
  queue text not null,
  payload jsonb not null,
  status outbox_status not null default 'pending',
  priority integer not null default 0,
  attempts integer not null default 0,
  processing_started_at timestamptz,
  dispatched_at timestamptz,
  failed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  constraint outbox_jobs_attempts_nonneg check (attempts >= 0),
  constraint outbox_jobs_priority_nonneg check (priority >= 0)
);

create index outbox_jobs_poll_idx on outbox_jobs (status, priority, created_at);
```

The poll index matches the claim query's `WHERE status = ... ORDER BY priority DESC,
created_at`. Without it the relay table-scans under load.

## Produce

```ts
await db.transaction(async (tx) => {
  await tx.update(orders).set({ status: "paid" }).where(eq(orders.id, id));
  await stageJobs(tx, outboxJobs, { queue: "order.receipt", payloads: [{ orderId: id }] });
});
```

Payloads are claim checks (`{ entityId }`), never snapshots. A retry that reorders
would otherwise write stale data over newer state.

## Coalesce

A queue whose rows only announce "something changed" (a live poke) can coalesce: a row whose
twin is still waiting does not add a second row. Add one nullable column and one partial unique
index, and stage with `stageCoalescingJobs`:

```sql
alter table outbox_jobs add column coalesce_key text;
create unique index outbox_jobs_coalesce_idx on outbox_jobs (queue, coalesce_key)
  where coalesce_key is not null and status = 'pending' and attempts = 0;
```

```ts
await stageCoalescingJobs(tx, outboxJobs, {
  queue: "live.publish",
  payloads: [{ list: "roles" }],
  coalesceKeyOf: (payload) => JSON.stringify(payload),
});
```

- The twin is row-locked until the caller commits, never skipped. The relay's `SKIP LOCKED` claim
  passes over it until then, so it is published only after the change it announces is visible.
  Skipping (`do nothing`) lets the relay publish the twin before the caller commits, and the
  reader refetches without the change.
- Only a `pending` row with no attempts is a twin: a claimed, completed, or requeued row never
  absorbs a new one, and a requeue can never collide with a fresh twin.
- Two callers coalescing onto one twin take turns from the stage to their commit.
- The key must leave out anything stamped per row (a trace id, an enqueue time), or no two rows
  ever match.
- Measured in apm `experiments/live-lists-edges/round3` (C1 to C11, 2026-10-01).

## Relay

```ts
const registry = createQueueRegistry({ connection, queueNames: QUEUE_NAMES, logger });
setInterval(
  () => drainOutbox({ db, table: outboxJobs, enqueue: registry.enqueue }),
  1000
);
```

- One claim transaction takes pending rows **and** `processing` rows whose lease has
  expired, which is how a crashed relay's work comes back.
- `jobId` on the queue is the outbox row id, so a re-dispatched stale row dedupes
  instead of running the side effect twice.
- Dispatch is sequential: a queue outage fails fast rather than flooding the pool.
- Relay attempts and worker attempts are different budgets. `maxDispatchAttempts`
  bounds "cannot reach the queue"; BullMQ `attempts` bounds "the handler threw".

## Consume

```ts
const defineJob = createJobFactory(logger);

export const sendReceipt = defineJob({
  schema: v.object({ orderId: v.string() }),
  invalidPayloadMessage: "order.receipt: malformed payload",
  load: ({ orderId }, deps) => rowOrThrow(await deps.orders.find(orderId), "gone"),
  act: async (order, deps) => { ... ; return { orderId: order.id }; },
  logMessage: "receipt sent",
});

startWorkers({ handlers: { "order.receipt": (p, a) => sendReceipt(deps, p, a) }, connection });
```

Poison policy: a payload that fails its schema, or a row that no longer exists, throws
`UnrecoverableError` and dead-letters on attempt one. It will never parse or appear, so
the retry ladder would only waste time. Every other throw retries normally.

## Punts

- No `mimeSizeGuard`. That guard is media-domain policy and belongs to the consumer;
  `GuardFn<Loaded>` is the seam it plugs into.
- Sweeps for stuck domain rows are the consumer's; the relay only owns its own lease.
