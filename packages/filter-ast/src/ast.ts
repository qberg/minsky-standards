import * as v from "valibot";

// AUTHZ SCOPE IS NEVER IN THIS AST. The executor injects the caller scope after compile,
// so a hostile URL can widen a filter but never widen what the caller may see.

export const FILTER_OPERATORS = [
  "is",
  "is_not",
  "is_any_of",
  "is_none_of",
  "gt",
  "lt",
  "gte",
  "lte",
  "before",
  "after",
  "on_or_before",
  "on_or_after",
  "between",
  "is_empty",
  "is_not_empty",
] as const;
export type FilterOperator = (typeof FILTER_OPERATORS)[number];

export const NO_VALUE_OPERATORS: ReadonlySet<FilterOperator> = new Set([
  "is_empty",
  "is_not_empty",
]);
export const MULTI_VALUE_OPERATORS: ReadonlySet<FilterOperator> = new Set([
  "is_any_of",
  "is_none_of",
]);
export const RANGE_OPERATORS: ReadonlySet<FilterOperator> = new Set([
  "between",
]);

export type ScalarFilterOperator = Exclude<
  FilterOperator,
  "between" | "is_any_of" | "is_empty" | "is_none_of" | "is_not_empty"
>;

// DoS-hardening on untrusted URL input; checkTreeShape below enforces depth+children caps.
export const MAX_FILTER_DEPTH = 5;
export const MAX_GROUP_CHILDREN = 20;
export const MAX_VALUE_ARRAY_LENGTH = 50;

const FilterPrimitiveSchema = v.union([v.string(), v.number(), v.boolean()]);
export type FilterPrimitive = v.InferOutput<typeof FilterPrimitiveSchema>;

const FilterValueSchema = v.union([
  FilterPrimitiveSchema,
  v.pipe(v.array(FilterPrimitiveSchema), v.maxLength(MAX_VALUE_ARRAY_LENGTH)),
]);
export type FilterValue = v.InferOutput<typeof FilterValueSchema>;

const ConditionSchema = v.object({
  field: v.pipe(v.string(), v.minLength(1)),
  operator: v.picklist(FILTER_OPERATORS),
  value: v.optional(FilterValueSchema),
});
export type Condition = v.InferOutput<typeof ConditionSchema>;

export type Group = {
  readonly connective: "and" | "or";
  readonly children: readonly (Condition | Group)[];
};

const GroupSchema: v.GenericSchema<Group> = v.object({
  connective: v.picklist(["and", "or"]),
  children: v.pipe(
    v.array(v.union([ConditionSchema, v.lazy(() => GroupSchema)])),
    v.maxLength(MAX_GROUP_CHILDREN)
  ),
});

export type FilterAst = Group;
export const FilterAstSchema = GroupSchema;

export const isGroup = (node: Condition | Group): node is Group =>
  "children" in node;

export type ShapeIssue =
  | { readonly kind: "too-deep"; readonly path: string; readonly depth: number }
  | {
      readonly kind: "too-wide";
      readonly path: string;
      readonly count: number;
    };

const isGroupShape = (
  node: unknown
): node is { children: unknown; connective: unknown } =>
  typeof node === "object" && node !== null && "children" in node;

// Bails before descending past the depth cap -- bounds recursion regardless of attacker input.
export function checkTreeShape(
  node: unknown,
  path = "root",
  depth = 1
): ShapeIssue | null {
  if (!isGroupShape(node)) {
    return null;
  }
  if (depth > MAX_FILTER_DEPTH) {
    return { kind: "too-deep", path, depth };
  }
  const { children } = node;
  if (!Array.isArray(children)) {
    return null;
  }
  if (children.length > MAX_GROUP_CHILDREN) {
    return { kind: "too-wide", path, count: children.length };
  }
  return checkChildrenShape(children, path, depth);
}

function checkChildrenShape(
  children: readonly unknown[],
  path: string,
  depth: number
): ShapeIssue | null {
  for (const [index, child] of children.entries()) {
    const issue = checkTreeShape(
      child,
      `${path}.children[${index}]`,
      depth + 1
    );
    if (issue) {
      return issue;
    }
  }
  return null;
}
