import {
  type Condition,
  type FilterAst,
  type FilterPrimitive,
  type Group,
  isGroup,
  MULTI_VALUE_OPERATORS,
  NO_VALUE_OPERATORS,
  RANGE_OPERATORS,
  type ScalarFilterOperator,
} from "./ast";
import { calendarDateToIndexValue } from "./calendar-date";
import type { FieldDef, FieldRegistry } from "./registry";
import { assertValidAst } from "./validate";

function quoteString(value: string): string {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

// A calendar-date field is indexed as a number (see calendar-date.ts), the same
// transform the worker projection writes, so ranges and sorts line up.
function literal(def: FieldDef, value: FilterPrimitive): string {
  if (def.type === "calendar-date") {
    return String(calendarDateToIndexValue(String(value)));
  }
  return typeof value === "string" ? quoteString(value) : String(value);
}

function arrayLiteral(
  def: FieldDef,
  values: readonly FilterPrimitive[]
): string {
  return `[${values.map((v) => literal(def, v)).join(", ")}]`;
}

function asArray(value: unknown, context: string): readonly FilterPrimitive[] {
  if (!Array.isArray(value)) {
    throw new Error(`[toMeiliFilter] expected array value for ${context}`);
  }
  return value as FilterPrimitive[];
}

function asPair(
  value: unknown,
  context: string
): readonly [FilterPrimitive, FilterPrimitive] {
  const values = asArray(value, context);
  const [min, max] = values;
  if (min === undefined || max === undefined) {
    throw new Error(
      `[toMeiliFilter] expected a [min, max] pair for ${context}`
    );
  }
  return [min, max];
}

type ScalarClauseBuilder = (field: string, valueLiteral: string) => string;

const SCALAR_CLAUSE_BUILDERS: Record<
  ScalarFilterOperator,
  ScalarClauseBuilder
> = {
  after: (f, v) => `${f} > ${v}`,
  before: (f, v) => `${f} < ${v}`,
  gt: (f, v) => `${f} > ${v}`,
  gte: (f, v) => `${f} >= ${v}`,
  is: (f, v) => `${f} = ${v}`,
  is_not: (f, v) => `(${f} != ${v} AND ${f} IS NOT NULL)`,
  lt: (f, v) => `${f} < ${v}`,
  lte: (f, v) => `${f} <= ${v}`,
  on_or_after: (f, v) => `${f} >= ${v}`,
  on_or_before: (f, v) => `${f} <= ${v}`,
};

function scalarClause(
  field: string,
  def: FieldDef,
  condition: Condition
): string {
  const builder =
    SCALAR_CLAUSE_BUILDERS[condition.operator as ScalarFilterOperator];
  if (!builder) {
    throw new Error(
      `[toMeiliFilter] not a scalar operator: ${condition.operator}`
    );
  }
  return builder(field, literal(def, condition.value as FilterPrimitive));
}

function noValueClause(
  field: string,
  operator: "is_empty" | "is_not_empty"
): string {
  return operator === "is_empty" ? `${field} IS NULL` : `${field} IS NOT NULL`;
}

type MultiValueOperator = "is_any_of" | "is_none_of";

function multiValueClause(
  field: string,
  def: FieldDef,
  operator: MultiValueOperator,
  value: unknown
): string {
  const values = asArray(value, `${field} ${operator}`);
  const list = arrayLiteral(def, values);
  return operator === "is_any_of"
    ? `${field} IN ${list}`
    : `(NOT ${field} IN ${list} AND ${field} IS NOT NULL)`;
}

function rangeClause(field: string, def: FieldDef, value: unknown): string {
  const [min, max] = asPair(value, `${field} between`);
  return `${field} ${literal(def, min)} TO ${literal(def, max)}`;
}

function conditionClause(condition: Condition, def: FieldDef): string {
  const { field, operator, value } = condition;
  if (NO_VALUE_OPERATORS.has(operator)) {
    return noValueClause(field, operator as "is_empty" | "is_not_empty");
  }
  if (MULTI_VALUE_OPERATORS.has(operator)) {
    return multiValueClause(field, def, operator as MultiValueOperator, value);
  }
  if (RANGE_OPERATORS.has(operator)) {
    return rangeClause(field, def, value);
  }
  return scalarClause(field, def, condition);
}

function groupClause(group: Group, registry: FieldRegistry): string {
  const clauses = group.children
    .map((child) => nodeClause(child, registry))
    .filter((clause) => clause !== "");
  if (clauses.length === 0) {
    return "";
  }
  if (clauses.length === 1) {
    return clauses[0] as string;
  }
  const joiner = group.connective === "and" ? " AND " : " OR ";
  return `(${clauses.join(joiner)})`;
}

function nodeClause(node: Condition | Group, registry: FieldRegistry): string {
  if (isGroup(node)) {
    return groupClause(node, registry);
  }
  const def = registry[node.field];
  if (!def) {
    throw new Error(`[toMeiliFilter] unknown field: ${node.field}`);
  }
  return conditionClause(node, def);
}

export function toMeiliFilter(ast: FilterAst, registry: FieldRegistry): string {
  assertValidAst(ast, registry);
  return nodeClause(ast, registry);
}
