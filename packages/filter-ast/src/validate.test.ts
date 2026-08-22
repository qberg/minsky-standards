import { isErr, isOk } from "@minsky/result";
import { describe, expect, it } from "vitest";
import type { FilterAst } from "./ast";
import { MAX_FILTER_DEPTH } from "./ast";
import type { FieldRegistry } from "./registry";
import { assertValidAst, validateAst } from "./validate";

const registry: FieldRegistry = {
  age: {
    operators: ["is", "gt", "lt", "between", "is_empty", "is_not_empty"],
    type: "number",
  },
  occurredOn: {
    operators: ["before", "after", "on_or_after", "between"],
    type: "calendar-date",
  },
  registeredAt: {
    operators: ["before", "after", "between", "is_empty", "is_not_empty"],
    type: "date",
  },
  status: {
    enumValues: ["open", "closed"],
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

const flat = (field: string, operator: string, value?: unknown): FilterAst => ({
  children: [{ field, operator, value } as never],
  connective: "and",
});

describe("validateAst", () => {
  it("accepts a valid enum condition", () => {
    const result = validateAst(flat("status", "is", "open"), registry);
    expect(isOk(result)).toBe(true);
  });

  it("accepts a valid number range condition", () => {
    const result = validateAst(flat("age", "between", [10, 20]), registry);
    expect(isOk(result)).toBe(true);
  });

  it("accepts a YYYY-MM-DD scalar on a calendar-date field", () => {
    const result = validateAst(
      flat("occurredOn", "on_or_after", "2026-08-13"),
      registry
    );
    expect(isOk(result)).toBe(true);
  });

  it("accepts a YYYY-MM-DD range on a calendar-date field", () => {
    const result = validateAst(
      flat("occurredOn", "between", ["2026-01-01", "2026-01-31"]),
      registry
    );
    expect(isOk(result)).toBe(true);
  });

  it.each([
    1_755_043_200_000,
    "2026-8-13",
    "2026-08-13T00:00:00.000Z",
  ])("rejects %s on a calendar-date field", (value) => {
    const result = validateAst(flat("occurredOn", "before", value), registry);
    expect(isErr(result)).toBe(true);
  });

  it("rejects a mixed calendar-date range bound", () => {
    const result = validateAst(
      flat("occurredOn", "between", ["2026-01-01", 12]),
      registry
    );
    expect(isErr(result)).toBe(true);
  });

  it("accepts a valid multi-value condition", () => {
    const result = validateAst(
      flat("status", "is_any_of", ["open", "closed"]),
      registry
    );
    expect(isOk(result)).toBe(true);
  });

  it("accepts a no-value condition without a value", () => {
    const result = validateAst(flat("status", "is_empty"), registry);
    expect(isOk(result)).toBe(true);
  });

  it("rejects an unknown field", () => {
    const result = validateAst(flat("nope", "is", "x"), registry);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error[0]?.kind).toBe("unknown-field");
    }
  });

  it("rejects a disallowed operator for the field", () => {
    const result = validateAst(flat("verified", "gt", true), registry);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error[0]?.kind).toBe("disallowed-operator");
    }
  });

  it("rejects a value type mismatch (string for a number field)", () => {
    const result = validateAst(flat("age", "gt", "not-a-number"), registry);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error[0]?.kind).toBe("value-type-mismatch");
    }
  });

  it("rejects an enum value outside the declared allow-list", () => {
    const result = validateAst(flat("status", "is", "archived"), registry);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error[0]?.kind).toBe("value-type-mismatch");
    }
  });

  it("rejects an is_any_of value that is not an array", () => {
    const result = validateAst(flat("status", "is_any_of", "open"), registry);
    expect(isErr(result)).toBe(true);
  });

  it("rejects an is_any_of value that is an empty array", () => {
    const result = validateAst(flat("status", "is_any_of", []), registry);
    expect(isErr(result)).toBe(true);
  });

  it("rejects a between value that is not a 2-tuple", () => {
    const result = validateAst(flat("age", "between", [1, 2, 3]), registry);
    expect(isErr(result)).toBe(true);
  });

  it("rejects a between value with a mismatched-type bound", () => {
    const result = validateAst(flat("age", "between", [1, "twenty"]), registry);
    expect(isErr(result)).toBe(true);
  });

  it("rejects a tree deeper than MAX_FILTER_DEPTH groups", () => {
    let node: FilterAst = flat("status", "is", "open");
    for (let i = 0; i < MAX_FILTER_DEPTH; i++) {
      node = { children: [node], connective: "and" };
    }
    const result = validateAst(node, registry);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error[0]?.kind).toBe("over-depth");
    }
  });

  it("accepts a tree exactly at MAX_FILTER_DEPTH groups", () => {
    let node: FilterAst = flat("status", "is", "open");
    for (let i = 0; i < MAX_FILTER_DEPTH - 1; i++) {
      node = { children: [node], connective: "and" };
    }
    const result = validateAst(node, registry);
    expect(isOk(result)).toBe(true);
  });

  it("collects issues from both branches of an AND/OR mix", () => {
    const ast: FilterAst = {
      children: [
        { field: "nope1", operator: "is", value: "x" } as never,
        { field: "nope2", operator: "is", value: "y" } as never,
      ],
      connective: "or",
    };
    const result = validateAst(ast, registry);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toHaveLength(2);
    }
  });
});

describe("assertValidAst", () => {
  it("returns the ast unchanged when valid", () => {
    const ast = flat("status", "is", "open");
    expect(assertValidAst(ast, registry)).toBe(ast);
  });

  it("throws when the ast is invalid", () => {
    expect(() => assertValidAst(flat("nope", "is", "x"), registry)).toThrow();
  });
});
