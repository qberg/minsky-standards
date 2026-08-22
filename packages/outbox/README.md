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
  await stageJobs(tx, outboxJobs, "order.receipt", [{ orderId: id }]);
});
```

Payloads are claim checks (`{ entityId }`), never snapshots. A retry that reorders
would otherwise write stale data over newer state.

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
