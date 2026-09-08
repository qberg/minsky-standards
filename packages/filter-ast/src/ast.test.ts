import * as v from "valibot";
import { describe, expect, it } from "vitest";
import {
  checkTreeShape,
  type FilterAst,
  FilterAstSchema,
  MAX_FILTER_DEPTH,
  MAX_GROUP_CHILDREN,
} from "./ast.js";

const condition = (field: string) => ({
  field,
  operator: "is" as const,
  value: "x",
});

function nestGroups(depth: number): FilterAst {
  let node: FilterAst = { children: [condition("leaf")], connective: "and" };
  for (let i = 0; i < depth - 1; i++) {
    node = { children: [node], connective: "and" };
  }
  return node;
}

describe("FilterAstSchema", () => {
  it("accepts a flat valid ast", () => {
    const ast: FilterAst = {
      children: [condition("status"), condition("region")],
      connective: "and",
    };
    expect(v.safeParse(FilterAstSchema, ast).success).toBe(true);
  });

  it("accepts nested groups within the depth cap", () => {
    const ast = nestGroups(MAX_FILTER_DEPTH);
    expect(v.safeParse(FilterAstSchema, ast).success).toBe(true);
  });

  it("rejects a condition missing field", () => {
    const bad = {
      children: [{ operator: "is", value: "x" }],
      connective: "and",
    };
    expect(v.safeParse(FilterAstSchema, bad).success).toBe(false);
  });

  it("rejects an unknown operator", () => {
    const bad = {
      children: [{ field: "status", operator: "contains", value: "x" }],
      connective: "and",
    };
    expect(v.safeParse(FilterAstSchema, bad).success).toBe(false);
  });

  it("rejects a group with more than MAX_GROUP_CHILDREN children", () => {
    const bad = {
      children: Array.from({ length: MAX_GROUP_CHILDREN + 1 }, (_, i) =>
        condition(`f${i}`)
      ),
      connective: "and",
    };
    expect(v.safeParse(FilterAstSchema, bad).success).toBe(false);
  });

  it("rejects a value array longer than the cap", () => {
    const bad = {
      children: [
        {
          field: "status",
          operator: "is_any_of",
          value: Array.from({ length: 51 }, () => "v"),
        },
      ],
      connective: "and",
    };
    expect(v.safeParse(FilterAstSchema, bad).success).toBe(false);
  });
});

describe("checkTreeShape", () => {
  it("accepts a tree within depth and children caps", () => {
    const ast = nestGroups(MAX_FILTER_DEPTH);
    expect(checkTreeShape(ast)).toBeNull();
  });

  it("rejects a tree one level deeper than the cap", () => {
    const ast = nestGroups(MAX_FILTER_DEPTH + 1);
    expect(checkTreeShape(ast)?.kind).toBe("too-deep");
  });

  it("rejects a group whose children array exceeds the cap, in O(1)", () => {
    const wide = {
      children: Array.from({ length: MAX_GROUP_CHILDREN + 1 }, () =>
        condition("f")
      ),
      connective: "and",
    };
    expect(checkTreeShape(wide)?.kind).toBe("too-wide");
  });

  it("does not descend into an over-wide children array", () => {
    const poisonChild = new Proxy(
      {},
      {
        get() {
          throw new Error("should never be read");
        },
      }
    );
    const wide = {
      children: Array.from(
        { length: MAX_GROUP_CHILDREN + 1 },
        () => poisonChild
      ),
      connective: "and",
    };
    expect(() => checkTreeShape(wide)).not.toThrow();
  });

  it("passes through a non-group leaf untouched", () => {
    expect(checkTreeShape(condition("status"))).toBeNull();
  });
});
