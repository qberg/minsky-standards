import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { CoalescingOutboxTable, OutboxTable } from "./table.js";

export type OutboxWriter = Pick<PgDatabase<PgQueryResultHKT>, "insert">;

export type StageBatch = {
  readonly queue: string;
  readonly payloads: readonly unknown[];
  // The relay claims `priority desc, created_at asc`, so a higher row skips any backlog.
  readonly priority?: number;
};

export type CoalesceBatch = StageBatch & {
  readonly coalesceKeyOf: (payload: unknown) => string;
};

// Staged inside the caller's transaction, so the job and its state change commit together.
export async function stageJobs(
  db: OutboxWriter,
  table: OutboxTable,
  { queue, payloads, priority = 0 }: StageBatch
): Promise<void> {
  if (payloads.length === 0) {
    return;
  }
  await db
    .insert(table)
    .values(payloads.map((payload) => ({ queue, payload, priority })));
}

const firstPerKey = (
  payloads: readonly unknown[],
  keyOf: (payload: unknown) => string
): ReadonlyMap<string, unknown> => {
  const byKey = new Map<string, unknown>();
  for (const payload of payloads) {
    const key = keyOf(payload);
    if (!byKey.has(key)) {
      byKey.set(key, payload);
    }
  }
  return byKey;
};

// Must match the unique index in README "Coalesce" exactly, or postgres finds no arbiter.
export const coalescePredicate = (table: CoalescingOutboxTable) =>
  sql`${table.coalesceKey} IS NOT NULL AND ${table.status} = 'pending' AND ${table.attempts} = 0`;

// A twin still waiting is row-locked until this commit rather than skipped, so the relay's
// SKIP LOCKED claim cannot publish it before the change it announces is visible.
export async function stageCoalescingJobs(
  db: OutboxWriter,
  table: CoalescingOutboxTable,
  { queue, payloads, priority = 0, coalesceKeyOf }: CoalesceBatch
): Promise<void> {
  const byKey = firstPerKey(payloads, coalesceKeyOf);
  if (byKey.size === 0) {
    return;
  }
  await db
    .insert(table)
    .values(
      [...byKey].map(([coalesceKey, payload]) => ({ coalesceKey, payload, priority, queue }))
    )
    .onConflictDoUpdate({
      set: { coalesceKey: sql`excluded.${sql.identifier(table.coalesceKey.name)}` },
      target: [table.queue, table.coalesceKey],
      targetWhere: coalescePredicate(table),
    });
}
