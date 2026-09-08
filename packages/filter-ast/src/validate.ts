import { err, isErr, ok, type Result } from "@minsky-org/result";
import {
  type Condition,
  type FilterAst,
  type FilterOperator,
  type Group,
  isGroup,
  MAX_FILTER_DEPTH,
  MULTI_VALUE_OPERATORS,
  NO_VALUE_OPERATORS,
  RANGE_OPERATORS,
} from "./ast.js";
import { isCalendarDate } from "./calendar-date.js";
import type { FieldDef, FieldRegistry } from "./registry.js";

export type ValidateIssue =
  | {
      readonly kind: "unknown-field";
      readonly field: string;
      readonly path: string;
    }
  | {
      readonly field: string;
      readonly kind: "disallowed-operator";
      readonly operator: FilterOperator;
      readonly path: string;
    }
  | {
      readonly field: string;
      readonly kind: "value-type-mismatch";
      readonly operator: FilterOperator;
      readonly path: string;
      readonly reason: string;
    }
  | {
      readonly depth: number;
      readonly kind: "over-depth";
      readonly path: string;
    };

function scalarMatchesType(value: unknown, def: FieldDef): boolean {
  if (def.type === "calendar-date") {
    return isCalendarDate(value);
  }
  if (def.type === "enum" || def.type === "string-id") {
    return (
      typeof value === "string" &&
      (def.enumValues === undefined || def.enumValues.includes(value))
    );
  }
  if (def.type === "number" || def.type === "date") {
    return typeof value === "number" && Number.isFinite(value);
  }
  return typeof value === "boolean";
}

function mismatch(
  condition: Condition,
  path: string,
  reason: string
): ValidateIssue {
  return {
    field: condition.field,
    kind: "value-type-mismatch",
    operator: condition.operator,
    path,
    reason,
  };
}

function checkNoValueShape(): ValidateIssue | null {
  return null;
}

function checkMultiValueShape(
  condition: Condition,
  def: FieldDef,
  path: string
): ValidateIssue | null {
  const { value } = condition;
  if (!Array.isArray(value) || value.length === 0) {
    return mismatch(condition, path, "expected a non-empty array value");
  }
  return value.every((item) => scalarMatchesType(item, def))
    ? null
    : mismatch(condition, path, `array values must be ${def.type}`);
}

function checkRangeShape(
  condition: Condition,
  def: FieldDef,
  path: string
): ValidateIssue | null {
  const { value } = condition;
  if (!Array.isArray(value) || value.length !== 2) {
    return mismatch(condition, path, "expected a [min, max] tuple");
  }
  const [min, max] = value;
  return scalarMatchesType(min, def) && scalarMatchesType(max, def)
    ? null
    : mismatch(condition, path, `range bounds must be ${def.type}`);
}

function checkScalarShape(
  condition: Condition,
  def: FieldDef,
  path: string
): ValidateIssue | null {
  return scalarMatchesType(condition.value, def)
    ? null
    : mismatch(condition, path, `value must be ${def.type}`);
}

function checkValueShape(
  condition: Condition,
  def: FieldDef,
  path: string
): ValidateIssue | null {
  if (NO_VALUE_OPERATORS.has(condition.operator)) {
    return checkNoValueShape();
  }
  if (MULTI_VALUE_OPERATORS.has(condition.operator)) {
    return checkMultiValueShape(condition, def, path);
  }
  if (RANGE_OPERATORS.has(condition.operator)) {
    return checkRangeShape(condition, def, path);
  }
  return checkScalarShape(condition, def, path);
}

function validateCondition(
  condition: Condition,
  registry: FieldRegistry,
  path: string
): ValidateIssue | null {
  const def = registry[condition.field];
  if (!def) {
    return { field: condition.field, kind: "unknown-field", path };
  }
  if (!def.operators.includes(condition.operator)) {
    return {
      field: condition.field,
      kind: "disallowed-operator",
      operator: condition.operator,
      path,
    };
  }
  return checkValueShape(condition, def, path);
}

function validateNode(
  node: Condition | Group,
  registry: FieldRegistry,
  path: string,
  depth: number
): readonly ValidateIssue[] {
  if (!isGroup(node)) {
    const issue = validateCondition(node, registry, path);
    return issue ? [issue] : [];
  }
  if (depth > MAX_FILTER_DEPTH) {
    return [{ depth, kind: "over-depth", path }];
  }
  return node.children.flatMap((child, index) =>
    validateNode(child, registry, `${path}.children[${index}]`, depth + 1)
  );
}

export function validateAst(
  ast: FilterAst,
  registry: FieldRegistry
): Result<FilterAst, readonly ValidateIssue[]> {
  const issues = validateNode(ast, registry, "root", 1);
  return issues.length === 0 ? ok(ast) : err(issues);
}

export function assertValidAst(
  ast: FilterAst,
  registry: FieldRegistry
): FilterAst {
  const result = validateAst(ast, registry);
  if (isErr(result)) {
    throw new Error(
      `[filter] AST failed validateAst (compilers require a pre-validated AST): ${JSON.stringify(result.error)}`
    );
  }
  return result.value;
}
