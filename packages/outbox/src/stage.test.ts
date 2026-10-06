import {
  integer,
  jsonb,
  PgDialect,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/pg-proxy";
import { describe, expect, it } from "vitest";
import {
  coalescePredicate,
  type OutboxWriter,
  stageCoalescingJobs,
  stageJobs,
} from "./stage.js";
import { OUTBOX_STATUS_VALUES, type CoalescingOutboxTable } from "./table.js";

const outboxStatus = pgEnum("outbox_status", OUTBOX_STATUS_VALUES);

const baseColumns = {
  id: uuid("id").primaryKey().defaultRandom(),
  queue: text("queue").notNull(),
  payload: jsonb("payload").notNull(),
  status: outboxStatus("status").notNull().default("pending"),
  priority: integer("priority").notNull().default(0),
  attempts: integer("attempts").notNull().default(0),
  processingStartedAt: timestamp("processing_started_at", { withTimezone: true }),
  dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
  failedAt: timestamp("failed_at", { withTimezone: true }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
};

const outboxJobs: CoalescingOutboxTable = pgTable("outbox_jobs", {
  ...baseColumns,
  coalesceKey: text("coalesce_key"),
});

const renamedKeyJobs: CoalescingOutboxTable = pgTable("outbox_jobs", {
  ...baseColumns,
  coalesceKey: text("dedupe"),
});

type Captured = { readonly sql: string; readonly params: readonly unknown[] };

const harness = () => {
  const captured: Captured[] = [];
  const db = drizzle(async (query, params) => {
    captured.push({ params, sql: query });
    return { rows: [] };
  });
  // The pg-proxy db is a PgDatabase over a different HKT, which OutboxWriter does not unify with.
  return { captured, db: db as unknown as OutboxWriter };
};

const byQueue = (payloads: readonly unknown[]) => ({ payloads, queue: "live.publish" });
const keyOfList = (payload: unknown) => (payload as { list: string }).list;

describe("stageJobs", () => {
  it("issues no query for zero payloads", async () => {
    const { captured, db } = harness();
    await stageJobs(db, outboxJobs, byQueue([]));
    expect(captured).toHaveLength(0);
  });

  it("inserts one row per payload with the given queue and priority", async () => {
    const { captured, db } = harness();
    await stageJobs(db, outboxJobs, { ...byQueue([{ a: 1 }, { a: 2 }]), priority: 5 });
    expect(captured).toHaveLength(1);
    const [query] = captured;
    expect(query?.sql).toMatch(/^insert into "outbox_jobs"/);
    expect(query?.params).toEqual(["live.publish", '{"a":1}', 5, "live.publish", '{"a":2}', 5]);
  });

  it("defaults priority to 0", async () => {
    const { captured, db } = harness();
    await stageJobs(db, outboxJobs, byQueue([{ a: 1 }]));
    expect(captured[0]?.params).toEqual(["live.publish", '{"a":1}', 0]);
  });
});

describe("stageCoalescingJobs", () => {
  it("issues no query for zero payloads", async () => {
    const { captured, db } = harness();
    await stageCoalescingJobs(db, outboxJobs, { ...byQueue([]), coalesceKeyOf: keyOfList });
    expect(captured).toHaveLength(0);
  });

  it("keeps the first payload per key and drops later twins in one batch", async () => {
    const { captured, db } = harness();
    const payloads = [
      { list: "roles", n: 1 },
      { list: "groups", n: 2 },
      { list: "roles", n: 3 },
    ];
    await stageCoalescingJobs(db, outboxJobs, { ...byQueue(payloads), coalesceKeyOf: keyOfList });
    const params = captured[0]?.params ?? [];
    expect(params.filter((value) => value === "live.publish")).toHaveLength(2);
    expect(params).toContain(JSON.stringify(payloads[0]));
    expect(params).toContain(JSON.stringify(payloads[1]));
    expect(params).not.toContain(JSON.stringify(payloads[2]));
  });

  it("writes the key into the coalesce_key column", async () => {
    const { captured, db } = harness();
    await stageCoalescingJobs(db, outboxJobs, {
      ...byQueue([{ list: "roles" }]),
      coalesceKeyOf: keyOfList,
    });
    const query = captured[0];
    expect(query?.sql).toContain('"coalesce_key"');
    expect(query?.params).toContain("roles");
  });

  it("ends in an on conflict clause on the partial unique index", async () => {
    const { captured, db } = harness();
    await stageCoalescingJobs(db, outboxJobs, {
      ...byQueue([{ list: "roles" }]),
      coalesceKeyOf: keyOfList,
    });
    const text = captured[0]?.sql ?? "";
    expect(text).toContain('on conflict ("queue","coalesce_key") where ');
    expect(text).toMatch(/do update set "coalesce_key" = excluded\."coalesce_key"$/);
    expect(text).toContain('"coalesce_key" IS NOT NULL');
    expect(text).toContain(`"status" = 'pending'`);
    expect(text).toContain('"attempts" = 0');
  });

  it("takes the key column name from the table, never a literal", async () => {
    const { captured, db } = harness();
    await stageCoalescingJobs(db, renamedKeyJobs, {
      ...byQueue([{ list: "roles" }]),
      coalesceKeyOf: keyOfList,
    });
    const text = captured[0]?.sql ?? "";
    expect(text).toContain('("queue","dedupe")');
    expect(text).toContain('excluded."dedupe"');
    expect(text).not.toContain("coalesce_key");
  });
});

describe("coalescePredicate", () => {
  it("renders the same predicate the insert uses", async () => {
    const { captured, db } = harness();
    await stageCoalescingJobs(db, outboxJobs, {
      ...byQueue([{ list: "roles" }]),
      coalesceKeyOf: keyOfList,
    });
    const rendered = new PgDialect().sqlToQuery(coalescePredicate(outboxJobs)).sql;
    expect(rendered).toContain("IS NOT NULL");
    expect(captured[0]?.sql).toContain(`where ${rendered} do update`);
  });
});
