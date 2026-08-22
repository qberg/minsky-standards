import { describe, expect, it } from "vitest";
import type { FilterAst } from "./ast";
import { evalAst } from "./eval";

const row = {
  age: 30,
  name: "Priya",
  registeredAt: 1_700_000_000_000,
  status: "open",
  region: null,
};

const cond = (
  field: string,
  operator: string,
  value?: unknown
): FilterAst["children"][number] =>
  ({ field, operator, value }) as FilterAst["children"][number];

describe("evalAst", () => {
  it("evaluates is", () => {
    const ast: FilterAst = {
      children: [cond("status", "is", "open")],
      connective: "and",
    };
    expect(evalAst(ast, row)).toBe(true);
  });

  it("evaluates is_not, excluding a null row value", () => {
    const notOpen: FilterAst = {
      children: [cond("status", "is_not", "open")],
      connective: "and",
    };
    expect(evalAst(notOpen, row)).toBe(false);
    const notX: FilterAst = {
      children: [cond("region", "is_not", "94")],
      connective: "and",
    };
    expect(evalAst(notX, row)).toBe(false);
  });

  it("evaluates is_any_of / is_none_of", () => {
    const any: FilterAst = {
      children: [cond("status", "is_any_of", ["open", "closed"])],
      connective: "and",
    };
    expect(evalAst(any, row)).toBe(true);
    const none: FilterAst = {
      children: [cond("status", "is_none_of", ["closed"])],
      connective: "and",
    };
    expect(evalAst(none, row)).toBe(true);
    const noneNull: FilterAst = {
      children: [cond("region", "is_none_of", ["94"])],
      connective: "and",
    };
    expect(evalAst(noneNull, row)).toBe(false);
  });

  it("evaluates numeric comparisons", () => {
    const gt: FilterAst = {
      children: [cond("age", "gt", 20)],
      connective: "and",
    };
    expect(evalAst(gt, row)).toBe(true);
    const lt: FilterAst = {
      children: [cond("age", "lt", 20)],
      connective: "and",
    };
    expect(evalAst(lt, row)).toBe(false);
    const between: FilterAst = {
      children: [cond("age", "between", [10, 40])],
      connective: "and",
    };
    expect(evalAst(between, row)).toBe(true);
  });

  it("evaluates date comparisons over epoch-ms", () => {
    const after: FilterAst = {
      children: [cond("registeredAt", "after", 1_600_000_000_000)],
      connective: "and",
    };
    expect(evalAst(after, row)).toBe(true);
    const before: FilterAst = {
      children: [cond("registeredAt", "before", 1_600_000_000_000)],
      connective: "and",
    };
    expect(evalAst(before, row)).toBe(false);
  });

  it("evaluates is_empty / is_not_empty", () => {
    const empty: FilterAst = {
      children: [cond("region", "is_empty")],
      connective: "and",
    };
    expect(evalAst(empty, row)).toBe(true);
    const notEmpty: FilterAst = {
      children: [cond("status", "is_not_empty")],
      connective: "and",
    };
    expect(evalAst(notEmpty, row)).toBe(true);
  });

  it("combines conditions with AND", () => {
    const ast: FilterAst = {
      children: [cond("status", "is", "open"), cond("age", "gt", 100)],
      connective: "and",
    };
    expect(evalAst(ast, row)).toBe(false);
  });

  it("combines conditions with OR", () => {
    const ast: FilterAst = {
      children: [cond("status", "is", "open"), cond("age", "gt", 100)],
      connective: "or",
    };
    expect(evalAst(ast, row)).toBe(true);
  });

  it("nests groups", () => {
    const ast: FilterAst = {
      children: [
        cond("status", "is", "open"),
        {
          children: [cond("age", "lt", 10), cond("age", "gt", 20)],
          connective: "or",
        },
      ],
      connective: "and",
    };
    expect(evalAst(ast, row)).toBe(true);
  });

  it("treats an empty group as vacuously true", () => {
    const ast: FilterAst = { children: [], connective: "and" };
    expect(evalAst(ast, row)).toBe(true);
  });
});
