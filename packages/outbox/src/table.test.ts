import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { OUTBOX_STATUS_VALUES, type OutboxTable } from "./table";

const outboxStatus = pgEnum("outbox_status", OUTBOX_STATUS_VALUES);

// The point of this fixture is the type annotation: a real drizzle table built from the
// README DDL must satisfy OutboxTable, or the relay is not actually parameterized.
const outboxJobs: OutboxTable = pgTable(
  "outbox_jobs",
  {
    id: uuid("id").primaryKey(),
    queue: text("queue").notNull(),
    payload: jsonb("payload").notNull(),
    status: outboxStatus("status").notNull().default("pending"),
    priority: integer("priority").notNull().default(0),
    attempts: integer("attempts").notNull().default(0),
    processingStartedAt: timestamp("processing_started_at", {
      withTimezone: true,
    }),
    dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("outbox_jobs_poll_idx").on(t.status, t.priority, t.createdAt),
    check("outbox_jobs_attempts_nonneg", sql`${t.attempts} >= 0`),
  ]
);

describe("OutboxTable", () => {
  it("is satisfied by the canonical drizzle table", () => {
    expect(outboxJobs.queue.name).toBe("queue");
    expect(outboxJobs.processingStartedAt.name).toBe("processing_started_at");
  });

  it("names the four statuses the relay writes", () => {
    expect(OUTBOX_STATUS_VALUES).toEqual([
      "pending",
      "processing",
      "completed",
      "failed",
    ]);
  });
});
