import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { OutboxTable } from "./table";

export type OutboxWriter = Pick<PgDatabase<PgQueryResultHKT>, "insert">;

// Stage N rows for one queue INSIDE the caller's business transaction: the job and the
// state change it describes commit together or not at all. The single insert site.
export async function stageJobs(
  db: OutboxWriter,
  table: OutboxTable,
  queue: string,
  payloads: readonly unknown[]
): Promise<void> {
  if (payloads.length === 0) {
    return;
  }
  await db
    .insert(table)
    .values(payloads.map((payload) => ({ queue, payload })));
}
