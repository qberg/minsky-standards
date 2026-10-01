import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { OutboxTable } from "./table.js";

export type OutboxWriter = Pick<PgDatabase<PgQueryResultHKT>, "insert">;

export type StageBatch = {
  readonly queue: string;
  readonly payloads: readonly unknown[];
  // The relay claims `priority desc, created_at asc`, so a higher row skips any backlog.
  readonly priority?: number;
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
