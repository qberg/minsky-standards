import { and, asc, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { OutboxTable } from "./table";

export type RelayDatabase = PgDatabase<PgQueryResultHKT>;

// attempts = the value AFTER the claim increment, so the dispatch path decides
// dead-letter vs requeue without re-reading the row.
export type ClaimedJob = {
  readonly id: string;
  readonly queue: string;
  readonly payload: unknown;
  readonly attempts: number;
};

export type EnqueueJob = (job: ClaimedJob) => Promise<void>;

export type DrainResult = {
  dispatched: number;
  failed: number;
  requeued: number;
};

type Outcome = keyof DrainResult;

export type RelayConfig = {
  readonly batchSize: number;
  readonly maxDispatchAttempts: number;
  readonly processingLeaseMs: number;
};

export const DEFAULT_RELAY_CONFIG: RelayConfig = {
  batchSize: 50,
  // Attempts-based, not time-based: an enqueue failure is infra, not poison, and
  // jobId dedupe on the queue side makes a high cap safe.
  maxDispatchAttempts: 60,
  processingLeaseMs: 300_000,
};

type Relay = {
  readonly db: RelayDatabase;
  readonly table: OutboxTable;
  readonly config: RelayConfig;
};

const toClaimed = (row: Record<string, unknown>): ClaimedJob => ({
  id: String(row.id),
  queue: String(row.queue),
  payload: row.payload,
  attempts: Number(row.attempts) + 1,
});

// SKIP LOCKED disjoint claim of pending rows plus stale 'processing' rows (crash
// recovery); an unstamped lease is stale by definition since only claim() writes
// 'processing'. Two relays never see the same row.
function claim(relay: Relay): Promise<ClaimedJob[]> {
  const { table, config } = relay;
  return relay.db.transaction(async (tx) => {
    const leaseCutoff = new Date(Date.now() - config.processingLeaseMs);
    const rows = await tx
      .select({
        id: table.id,
        queue: table.queue,
        payload: table.payload,
        attempts: table.attempts,
      })
      .from(table)
      .where(
        or(
          eq(table.status, "pending"),
          and(
            eq(table.status, "processing"),
            or(
              isNull(table.processingStartedAt),
              lt(table.processingStartedAt, leaseCutoff)
            )
          )
        )
      )
      .orderBy(desc(table.priority), asc(table.createdAt))
      .limit(config.batchSize)
      .for("update", { skipLocked: true });

    if (rows.length === 0) {
      return [];
    }

    const claimed = rows.map(toClaimed);
    await tx
      .update(table)
      .set({
        status: "processing",
        processingStartedAt: new Date(),
        attempts: sql`${table.attempts} + 1`,
      })
      .where(
        inArray(
          table.id,
          claimed.map((job) => job.id)
        )
      );

    return claimed;
  });
}

async function markCompleted(relay: Relay, id: string): Promise<void> {
  await relay.db
    .update(relay.table)
    .set({ status: "completed", dispatchedAt: new Date() })
    .where(eq(relay.table.id, id));
}

async function markFailure(
  relay: Relay,
  job: ClaimedJob,
  message: string
): Promise<Outcome> {
  const exhausted = job.attempts >= relay.config.maxDispatchAttempts;
  await relay.db
    .update(relay.table)
    .set(
      exhausted
        ? { status: "failed", failedAt: new Date(), errorMessage: message }
        : { status: "pending", errorMessage: message }
    )
    .where(eq(relay.table.id, job.id));
  return exhausted ? "failed" : "requeued";
}

async function dispatchOne(
  relay: Relay,
  enqueue: EnqueueJob,
  job: ClaimedJob
): Promise<Outcome> {
  try {
    await enqueue(job);
    await markCompleted(relay, job.id);
    return "dispatched";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return await markFailure(relay, job, message);
  }
}

export type DrainArgs = {
  readonly db: RelayDatabase;
  readonly table: OutboxTable;
  readonly enqueue: EnqueueJob;
  readonly config?: RelayConfig;
};

// One drain pass: claim a batch, dispatch each to its queue, record the outcome.
// Dispatch is sequential so a queue outage fails fast instead of flooding the pool.
export async function drainOutbox(args: DrainArgs): Promise<DrainResult> {
  const relay: Relay = {
    db: args.db,
    table: args.table,
    config: args.config ?? DEFAULT_RELAY_CONFIG,
  };
  const claimed = await claim(relay);
  const result: DrainResult = { dispatched: 0, failed: 0, requeued: 0 };
  for (const job of claimed) {
    const outcome = await dispatchOne(relay, args.enqueue, job);
    result[outcome] += 1;
  }
  return result;
}
