import { randomUUID } from "node:crypto";
import {
  date,
  integer,
  boolean as pgBoolean,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import { Meilisearch } from "meilisearch";
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import type { FilterAst } from "./ast";
import {
  calendarDateToIndexValue,
  indexValueToCalendarDate,
} from "./calendar-date";
import { toDrizzleWhere } from "./drizzle";
import { evalAst } from "./eval";
import { toMeiliFilter } from "./meili";
import type { FieldRegistry } from "./registry";

const registry: FieldRegistry = {
  priority: {
    operators: [
      "gt",
      "lt",
      "gte",
      "lte",
      "between",
      "is_empty",
      "is_not_empty",
    ],
    type: "number",
  },
  occurredOn: {
    operators: ["before", "after", "on_or_before", "on_or_after", "between"],
    type: "calendar-date",
  },
  registeredAt: {
    operators: ["before", "after", "on_or_before", "on_or_after", "between"],
    type: "date",
  },
  status: {
    enumValues: ["open", "closed", "verifying"],
    operators: [
      "is",
      "is_not",
      "is_any_of",
      "is_none_of",
      "is_empty",
      "is_not_empty",
    ],
    type: "enum",
  },
  verified: { operators: ["is", "is_not"], type: "boolean" },
  region: {
    operators: [
      "is",
      "is_not",
      "is_any_of",
      "is_none_of",
      "is_empty",
      "is_not_empty",
    ],
    type: "string-id",
  },
};

const D = Date.UTC(2026, 0, 1);
const DAY = 86_400_000;
const day = (n: number): number => D + n * DAY;
const occurredOnDay = (n: number): string => indexValueToCalendarDate(day(n));

type FixtureRow = {
  id: string;
  priority: number | null;
  occurredOn: string | null;
  registeredAt: number | null;
  status: string | null;
  verified: boolean | null;
  region: string | null;
};

const row = (
  id: number,
  status: string | null,
  region: string | null,
  priority: number | null,
  regDay: number | null,
  verified: boolean | null
): FixtureRow => ({
  id: String(id),
  priority,
  occurredOn: regDay === null ? null : occurredOnDay(regDay),
  registeredAt: regDay === null ? null : day(regDay),
  status,
  verified,
  region,
});

const rows: FixtureRow[] = [
  row(1, "open", "w1", 1, 0, true),
  row(2, "open", "w2", 2, 1, false),
  row(3, "open", null, 3, 2, true),
  row(4, "closed", "w1", 4, 3, false),
  row(5, "closed", "w2", 5, 4, null),
  row(6, "closed", "w3", 6, 5, true),
  row(7, "verifying", "w1", 7, 6, false),
  row(8, "verifying", null, 8, 7, true),
  row(9, null, "w2", 9, 8, false),
  row(10, null, "w3", 10, 9, null),
  row(11, "open", "w3", null, 10, true),
  row(12, "closed", "w1", 12, null, false),
  row(13, "verifying", "w2", 13, 12, true),
  row(14, "open", "w1", 14, 13, false),
  row(15, "closed", null, 15, 14, true),
  row(16, "verifying", "w3", 16, 15, null),
  row(17, "open", "w2", 17, 16, true),
  row(18, "closed", "w2", 18, 17, false),
  row(19, null, "w1", null, 18, true),
  row(20, "open", "w1", 20, 19, false),
];

const cond = (
  field: string,
  operator: string,
  value?: unknown
): FilterAst["children"][number] =>
  ({ field, operator, value }) as FilterAst["children"][number];

const one = (child: FilterAst["children"][number]): FilterAst => ({
  children: [child],
  connective: "and",
});

type GoldenCase = { ast: FilterAst; expected: string[]; name: string };

const goldenCases: GoldenCase[] = [
  {
    ast: one(cond("status", "is", "open")),
    expected: ["1", "2", "3", "11", "14", "17", "20"],
    name: "is enum",
  },
  {
    ast: one(cond("status", "is_not", "open")),
    expected: ["4", "5", "6", "7", "8", "12", "13", "15", "16", "18"],
    name: "is_not excludes nulls",
  },
  {
    ast: one(cond("status", "is_any_of", ["closed", "verifying"])),
    expected: ["4", "5", "6", "7", "8", "12", "13", "15", "16", "18"],
    name: "is_any_of",
  },
  {
    ast: one(cond("status", "is_none_of", ["open", "verifying"])),
    expected: ["4", "5", "6", "12", "15", "18"],
    name: "is_none_of excludes nulls",
  },
  {
    ast: one(cond("priority", "gt", 15)),
    expected: ["16", "17", "18", "20"],
    name: "gt",
  },
  {
    ast: one(cond("priority", "lte", 5)),
    expected: ["1", "2", "3", "4", "5"],
    name: "lte",
  },
  {
    ast: one(cond("priority", "between", [6, 10])),
    expected: ["6", "7", "8", "9", "10"],
    name: "between numbers",
  },
  {
    ast: one(cond("registeredAt", "before", day(3))),
    expected: ["1", "2", "3"],
    name: "before",
  },
  {
    ast: one(cond("registeredAt", "on_or_after", day(15))),
    expected: ["16", "17", "18", "19", "20"],
    name: "on_or_after",
  },
  {
    ast: one(cond("registeredAt", "between", [day(5), day(9)])),
    expected: ["6", "7", "8", "9", "10"],
    name: "between dates",
  },
  {
    ast: one(cond("occurredOn", "before", occurredOnDay(3))),
    expected: ["1", "2", "3"],
    name: "calendar-date before",
  },
  {
    ast: one(cond("occurredOn", "on_or_after", occurredOnDay(15))),
    expected: ["16", "17", "18", "19", "20"],
    name: "calendar-date on_or_after",
  },
  {
    ast: one(cond("occurredOn", "between", [occurredOnDay(5), occurredOnDay(9)])),
    expected: ["6", "7", "8", "9", "10"],
    name: "calendar-date between",
  },
  {
    ast: one(cond("region", "is_empty")),
    expected: ["3", "8", "15"],
    name: "is_empty",
  },
  {
    ast: one(cond("priority", "is_not_empty")),
    expected: rows.filter((r) => r.priority !== null).map((r) => r.id),
    name: "is_not_empty",
  },
  {
    ast: one(cond("verified", "is", true)),
    expected: ["1", "3", "6", "8", "11", "13", "15", "17", "19"],
    name: "boolean is",
  },
  {
    ast: {
      children: [cond("status", "is", "open"), cond("priority", "gt", 2)],
      connective: "and",
    },
    expected: ["3", "14", "17", "20"],
    name: "AND mix",
  },
  {
    ast: {
      children: [
        {
          children: [
            cond("region", "is_any_of", ["w1"]),
            cond("priority", "between", [8, 10]),
          ],
          connective: "or",
        },
        cond("status", "is_not_empty"),
      ],
      connective: "and",
    },
    expected: ["1", "4", "7", "8", "12", "14", "20"],
    name: "nested OR inside AND",
  },
  {
    ast: {
      children: [
        cond("status", "is", "verifying"),
        cond("verified", "is", false),
      ],
      connective: "or",
    },
    expected: ["2", "4", "7", "8", "9", "12", "13", "14", "16", "18", "20"],
    name: "OR mix",
  },
];

const sorted = (ids: readonly string[]): string[] =>
  [...ids].sort((a, b) => Number(a) - Number(b));

describe("evalAst oracle", () => {
  it.each(goldenCases)("$name", ({ ast, expected }) => {
    const matched = rows.filter((r) => evalAst(ast, r)).map((r) => r.id);
    expect(sorted(matched)).toEqual(sorted(expected));
  });
});

const host = process.env.MEILI_URL ?? "http://localhost:7700";
const apiKey = process.env.MEILI_MASTER_KEY ?? "devkey";

const probeMeiliReachable = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${host}/health`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
};

const meiliReachable = await probeMeiliReachable();

// The index stores a calendar date as a NUMBER -- the same transform the meili
// compiler applies to the wire value, so a mismatch fails this suite, not prod.
function toMeiliDoc(r: FixtureRow): Record<string, unknown> {
  return {
    ...r,
    occurredOn: r.occurredOn === null ? null : calendarDateToIndexValue(r.occurredOn),
  };
}

// describe.skipIf still RUNS the suite body, and these bodies create indexes and
// tables. Registration itself has to be conditional.
if (meiliReachable) {
  describe("golden suite @ real Meilisearch", () => {
    const client = new Meilisearch({ host, apiKey });
    const indexName = `golden-filter-${randomUUID()}`;

    const seeded = (async () => {
      await client
        .index(indexName)
        .updateSettings({
          filterableAttributes: [
            "status",
            "region",
            "priority",
            "occurredOn",
            "registeredAt",
            "verified",
          ],
        })
        .waitTask({ timeout: 30_000 });
      await client
        .index(indexName)
        .addDocuments(rows.map(toMeiliDoc), { primaryKey: "id" })
        .waitTask({ timeout: 30_000 });
    })();

    afterAll(async () => {
      await client.deleteIndex(indexName).waitTask({ timeout: 30_000 });
    });

    it.each(goldenCases)("$name", async ({ ast, expected }) => {
      await seeded;
      const filter = toMeiliFilter(ast, registry);
      const result = await client
        .index(indexName)
        .search("", { filter, limit: 100 });
      expect(sorted(result.hits.map((h) => String(h.id)))).toEqual(
        sorted(expected)
      );
    });
  });
}

const LEADING_SLASH = /^\//;

// Refuses any database whose name does not end in _test: this suite creates and drops
// tables, so pointing it at a real database would be destructive.
function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL ?? "";
  const name = new URL(url).pathname.replace(LEADING_SLASH, "");
  if (!name.endsWith("_test")) {
    throw new Error(`[filter-golden] refusing non-_test database: ${name}`);
  }
  return url;
}

const probePgReachable = async (): Promise<boolean> => {
  // onnotice/onclose swallow postgres.js side-channel rejections, which otherwise
  // surface as an unhandled rejection and fail the run even when the suite skips.
  const sql = postgres(testDatabaseUrl(), {
    connect_timeout: 2,
    max: 1,
    onclose: () => {
      return;
    },
  });
  try {
    await sql`select 1`;
    return true;
  } catch {
    return false;
  } finally {
    await sql.end({ timeout: 2 });
  }
};

// Opt-in: no TEST_DATABASE_URL means no Postgres leg, rather than a guessed local URL.
const pgReachable =
  process.env.TEST_DATABASE_URL === undefined
    ? false
    : await probePgReachable();

// describe.skipIf still RUNS the suite body, and these bodies create indexes and
// tables. Registration itself has to be conditional.
if (pgReachable) {
  describe("golden suite @ real Postgres", () => {
    const tableName = `golden_filter_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
    const table = pgTable(tableName, {
      id: text("id").primaryKey(),
      priority: integer("priority"),
      occurredOn: date("occurred_on"),
      registeredAt: timestamp("registered_at", { withTimezone: true }),
      status: text("status"),
      verified: pgBoolean("verified"),
      region: text("region"),
    });
    const columns = {
      priority: table.priority,
      occurredOn: table.occurredOn,
      registeredAt: table.registeredAt,
      status: table.status,
      verified: table.verified,
      region: table.region,
    };
    const sql = postgres(testDatabaseUrl(), { max: 1 });
    const db = drizzle(sql);

    const seeded = (async () => {
      await sql.unsafe(
        `create table "${tableName}" (
          id text primary key,
          priority integer,
          occurred_on date,
          registered_at timestamptz,
          status text,
          verified boolean,
          region text
        )`
      );
      await db.insert(table).values(
        rows.map((r) => ({
          id: r.id,
          priority: r.priority,
          occurredOn: r.occurredOn,
          registeredAt: r.registeredAt === null ? null : new Date(r.registeredAt),
          status: r.status,
          verified: r.verified,
          region: r.region,
        }))
      );
    })();

    afterAll(async () => {
      await sql.unsafe(`drop table if exists "${tableName}"`);
      await sql.end({ timeout: 5 });
    });

    it.each(goldenCases)("$name", async ({ ast, expected }) => {
      await seeded;
      const where = toDrizzleWhere(ast, registry, columns);
      const matched = await db.select({ id: table.id }).from(table).where(where);
      expect(sorted(matched.map((m) => m.id))).toEqual(sorted(expected));
    });
  });
}
