import { type SQL, sql } from "drizzle-orm";
import {
  date,
  integer,
  PgDialect,
  boolean as pgBoolean,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import type { FilterAst } from "./ast";
import { toDrizzleWhere } from "./drizzle";
import type { FieldRegistry } from "./registry";

const t = pgTable("filter_unit", {
  age: integer("age"),
  occurredOn: date("occurred_on"),
  registeredAt: timestamp("registered_at", { withTimezone: true }),
  status: text("status"),
  verified: pgBoolean("verified"),
});

const columns = {
  age: t.age,
  occurredOn: t.occurredOn,
  registeredAt: t.registeredAt,
  status: t.status,
  verified: t.verified,
};

const registry: FieldRegistry = {
  age: {
    operators: ["is", "gt", "lt", "between", "is_empty", "is_not_empty"],
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
};

const VALUE_MISMATCH_RE = /value-type-mismatch/;

const dialect = new PgDialect();
const render = (clause: SQL | undefined): string => {
  if (clause === undefined) {
    throw new Error("expected a SQL clause");
  }
  return dialect.sqlToQuery(clause).sql;
};

const cond = (
  field: string,
  operator: string,
  value?: unknown
): FilterAst["children"][number] =>
  ({ field, operator, value }) as FilterAst["children"][number];

describe("toDrizzleWhere", () => {
  it("compiles is to eq with a bound param", () => {
    const ast: FilterAst = {
      children: [cond("status", "is", "open")],
      connective: "and",
    };
    const query = dialect.sqlToQuery(
      toDrizzleWhere(ast, registry, columns) as SQL
    );
    expect(query.sql).toContain('"status" = ');
    expect(query.params).toEqual(["open"]);
  });

  it("compiles is_not with a null guard", () => {
    const ast: FilterAst = {
      children: [cond("status", "is_not", "open")],
      connective: "and",
    };
    const sql = render(toDrizzleWhere(ast, registry, columns));
    expect(sql).toContain("<>");
    expect(sql).toContain("is not null");
  });

  it("compiles is_any_of to IN", () => {
    const ast: FilterAst = {
      children: [cond("status", "is_any_of", ["open", "closed"])],
      connective: "and",
    };
    const query = dialect.sqlToQuery(
      toDrizzleWhere(ast, registry, columns) as SQL
    );
    expect(query.sql).toContain("in (");
    expect(query.params).toEqual(["open", "closed"]);
  });

  it("compiles is_none_of to NOT IN with a null guard", () => {
    const ast: FilterAst = {
      children: [cond("status", "is_none_of", ["open"])],
      connective: "and",
    };
    const sql = render(toDrizzleWhere(ast, registry, columns));
    expect(sql).toContain("not in (");
    expect(sql).toContain("is not null");
  });

  it("compiles between", () => {
    const ast: FilterAst = {
      children: [cond("age", "between", [1, 9])],
      connective: "and",
    };
    const sql = render(toDrizzleWhere(ast, registry, columns));
    expect(sql).toContain("between");
  });

  it("converts epoch-ms date values to Date params", () => {
    const epoch = 1_700_000_000_000;
    const ast: FilterAst = {
      children: [cond("registeredAt", "after", epoch)],
      connective: "and",
    };
    const query = dialect.sqlToQuery(
      toDrizzleWhere(ast, registry, columns) as SQL
    );
    expect(query.params).toHaveLength(1);
    expect(query.params[0]).toBe(new Date(epoch).toISOString());
  });

  it("passes a calendar-date value through as a YYYY-MM-DD string param", () => {
    const ast: FilterAst = {
      children: [cond("occurredOn", "on_or_after", "2026-08-13")],
      connective: "and",
    };
    const query = dialect.sqlToQuery(
      toDrizzleWhere(ast, registry, columns) as SQL
    );
    expect(query.sql).toContain('"occurred_on" >= ');
    expect(query.params).toEqual(["2026-08-13"]);
  });

  it("compiles a calendar-date between as two date-string params", () => {
    const ast: FilterAst = {
      children: [cond("occurredOn", "between", ["2026-01-01", "2026-01-31"])],
      connective: "and",
    };
    const query = dialect.sqlToQuery(
      toDrizzleWhere(ast, registry, columns) as SQL
    );
    expect(query.sql).toContain("between");
    expect(query.params).toEqual(["2026-01-01", "2026-01-31"]);
  });

  it("rejects an epoch-ms value on a calendar-date field", () => {
    const ast: FilterAst = {
      children: [cond("occurredOn", "before", 1_755_043_200_000)],
      connective: "and",
    };
    expect(() => toDrizzleWhere(ast, registry, columns)).toThrow(
      VALUE_MISMATCH_RE
    );
  });

  it("compiles is_empty / is_not_empty to null checks", () => {
    const empty: FilterAst = {
      children: [cond("age", "is_empty")],
      connective: "and",
    };
    expect(render(toDrizzleWhere(empty, registry, columns))).toContain(
      "is null"
    );
    const notEmpty: FilterAst = {
      children: [cond("age", "is_not_empty")],
      connective: "and",
    };
    expect(render(toDrizzleWhere(notEmpty, registry, columns))).toContain(
      "is not null"
    );
  });

  it("nests groups with the right connectives", () => {
    const ast: FilterAst = {
      children: [
        cond("status", "is", "open"),
        {
          children: [cond("age", "gt", 5), cond("age", "lt", 1)],
          connective: "or",
        },
      ],
      connective: "and",
    };
    const sql = render(toDrizzleWhere(ast, registry, columns));
    expect(sql).toContain(" and ");
    expect(sql).toContain(" or ");
  });

  it("returns undefined for an empty group", () => {
    const ast: FilterAst = { children: [], connective: "and" };
    expect(toDrizzleWhere(ast, registry, columns)).toBeUndefined();
  });

  it("compiles a computed SQL expression column (not a plain column)", () => {
    const deptExpr = sql<string>`(select dept from f where id = t.id limit 1)`;
    const ast: FilterAst = {
      children: [cond("status", "is_any_of", ["a", "b"])],
      connective: "and",
    };
    const query = dialect.sqlToQuery(
      toDrizzleWhere(ast, registry, { status: deptExpr }) as SQL
    );
    expect(query.sql).toContain("select dept from f");
    expect(query.sql).toContain("in (");
    expect(query.params).toEqual(["a", "b"]);
  });

  it("throws for a field with no mapped column", () => {
    const ast: FilterAst = {
      children: [cond("status", "is", "open")],
      connective: "and",
    };
    expect(() => toDrizzleWhere(ast, registry, {})).toThrow();
  });

  it("throws when the ast fails registry validation", () => {
    const ast: FilterAst = {
      children: [cond("nope", "is", "x")],
      connective: "and",
    };
    expect(() => toDrizzleWhere(ast, registry, columns)).toThrow();
  });
});
