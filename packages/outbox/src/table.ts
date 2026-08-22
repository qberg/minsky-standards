import type { PgColumn, PgTable } from "drizzle-orm/pg-core";

export const OUTBOX_STATUS_VALUES = [
  "pending",
  "processing",
  "completed",
  "failed",
] as const;

export type OutboxStatus = (typeof OUTBOX_STATUS_VALUES)[number];

// The column contract the relay drives. Any drizzle pgTable carrying these columns
// satisfies it (see README for the canonical DDL); the package owns no schema of its own.
export type OutboxTable = PgTable & {
  readonly id: PgColumn;
  readonly queue: PgColumn;
  readonly payload: PgColumn;
  readonly status: PgColumn;
  readonly priority: PgColumn;
  readonly attempts: PgColumn;
  readonly processingStartedAt: PgColumn;
  readonly dispatchedAt: PgColumn;
  readonly failedAt: PgColumn;
  readonly errorMessage: PgColumn;
  readonly createdAt: PgColumn;
};
