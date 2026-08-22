import type { Condition, FilterAst, FilterOperator, Group } from "./ast";
import { isGroup } from "./ast";

const isEmptyValue = (rowValue: unknown): boolean =>
  rowValue === null || rowValue === undefined;

const isNotNullish = (rowValue: unknown): boolean => !isEmptyValue(rowValue);

type Evaluator = (rowValue: unknown, condValue: unknown) => boolean;

type Ordered = number | string;

// Same-typed operands only; fixed-width `YYYY-MM-DD` orders lexicographically,
// which is why a calendar-date compares as a plain string here.
function compare(op: (a: Ordered, b: Ordered) => boolean): Evaluator {
  return (rv, cv) =>
    (typeof rv === "number" && typeof cv === "number" && op(rv, cv)) ||
    (typeof rv === "string" && typeof cv === "string" && op(rv, cv));
}

const evaluators: Record<FilterOperator, Evaluator> = {
  after: compare((a, b) => a > b),
  before: compare((a, b) => a < b),
  between: (rv, cv) => {
    if (!Array.isArray(cv)) {
      return false;
    }
    const [min, max] = cv;
    return (
      compare((a, b) => a >= b)(rv, min) && compare((a, b) => a <= b)(rv, max)
    );
  },
  gt: compare((a, b) => a > b),
  gte: compare((a, b) => a >= b),
  is: (rv, cv) => rv === cv,
  is_any_of: (rv, cv) => Array.isArray(cv) && cv.includes(rv),
  is_empty: (rv) => isEmptyValue(rv),
  is_none_of: (rv, cv) =>
    isNotNullish(rv) && Array.isArray(cv) && !cv.includes(rv),
  is_not: (rv, cv) => isNotNullish(rv) && rv !== cv,
  is_not_empty: (rv) => isNotNullish(rv),
  lt: compare((a, b) => a < b),
  lte: compare((a, b) => a <= b),
  on_or_after: compare((a, b) => a >= b),
  on_or_before: compare((a, b) => a <= b),
};

function evalCondition(
  row: Record<string, unknown>,
  condition: Condition
): boolean {
  return evaluators[condition.operator](row[condition.field], condition.value);
}

function evalNode(
  row: Record<string, unknown>,
  node: Condition | Group
): boolean {
  if (!isGroup(node)) {
    return evalCondition(row, node);
  }
  if (node.children.length === 0) {
    return true;
  }
  return node.connective === "and"
    ? node.children.every((child) => evalNode(row, child))
    : node.children.some((child) => evalNode(row, child));
}

export function evalAst(ast: FilterAst, row: Record<string, unknown>): boolean {
  return evalNode(row, ast);
}
