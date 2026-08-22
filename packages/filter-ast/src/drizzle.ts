import {
  type AnyColumn,
  and,
  between,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  notInArray,
  or,
  type SQL,
} from "drizzle-orm";
import {
  type Condition,
  type FilterAst,
  type Group,
  isGroup,
  MULTI_VALUE_OPERATORS,
  NO_VALUE_OPERATORS,
  RANGE_OPERATORS,
  type ScalarFilterOperator,
} from "./ast";
import { isCalendarDate } from "./calendar-date";
import type { FieldDef, FieldRegistry } from "./registry";
import { assertValidAst } from "./validate";

// A field resolves to a plain column or a computed SQL expression (correlated
// scalar); both are SQLWrapper, accepted by every operator.
type FilterColumn = AnyColumn | SQL;

type DrizzleValue = boolean | Date | number | string;

function toDrizzleValue(
  fieldType: FieldDef["type"],
  value: unknown
): DrizzleValue {
  if (fieldType === "date") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error("[toDrizzleWhere] date value must be finite epoch-ms");
    }
    return new Date(value);
  }
  // The column is a drizzle `date` with mode:"string", so YYYY-MM-DD passes through exact.
  if (fieldType === "calendar-date") {
    if (!isCalendarDate(value)) {
      throw new Error(
        "[toDrizzleWhere] calendar-date value must be a YYYY-MM-DD string"
      );
    }
    return value;
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  throw new Error(`[toDrizzleWhere] unsupported value type: ${typeof value}`);
}

function resolveField(
  field: string,
  registry: FieldRegistry,
  columns: Record<string, FilterColumn>
): { readonly column: FilterColumn; readonly def: FieldDef } {
  const def = registry[field];
  const column = columns[field];
  if (!(def && column)) {
    throw new Error(`[toDrizzleWhere] no column mapped for field: ${field}`);
  }
  return { column, def };
}

type ScalarSqlBuilder = (column: AnyColumn, value: DrizzleValue) => SQL;

const SCALAR_SQL_BUILDERS: Record<ScalarFilterOperator, ScalarSqlBuilder> = {
  after: (c, v) => gt(c, v),
  before: (c, v) => lt(c, v),
  gt: (c, v) => gt(c, v),
  gte: (c, v) => gte(c, v),
  is: (c, v) => eq(c, v),
  is_not: (c, v) => and(ne(c, v), isNotNull(c)) as SQL,
  lt: (c, v) => lt(c, v),
  lte: (c, v) => lte(c, v),
  on_or_after: (c, v) => gte(c, v),
  on_or_before: (c, v) => lte(c, v),
};

function scalarSql(
  operator: ScalarFilterOperator,
  def: FieldDef,
  column: AnyColumn,
  value: unknown
): SQL {
  return SCALAR_SQL_BUILDERS[operator](column, toDrizzleValue(def.type, value));
}

function noValueSql(
  operator: "is_empty" | "is_not_empty",
  column: AnyColumn
): SQL {
  return operator === "is_empty" ? isNull(column) : isNotNull(column);
}

function multiValueSql(
  operator: "is_any_of" | "is_none_of",
  def: FieldDef,
  column: AnyColumn,
  value: unknown
): SQL {
  if (!Array.isArray(value)) {
    throw new Error("[toDrizzleWhere] expected array value");
  }
  const values = value.map((item) => toDrizzleValue(def.type, item));
  return operator === "is_any_of"
    ? inArray(column, values)
    : (and(notInArray(column, values), isNotNull(column)) as SQL);
}

function rangeSql(def: FieldDef, column: AnyColumn, value: unknown): SQL {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new Error("[toDrizzleWhere] expected a [min, max] pair");
  }
  const [rawMin, rawMax] = value;
  return between(
    column,
    toDrizzleValue(def.type, rawMin),
    toDrizzleValue(def.type, rawMax)
  );
}

function conditionSql(
  condition: Condition,
  registry: FieldRegistry,
  columns: Record<string, FilterColumn>
): SQL {
  const { def, column: resolved } = resolveField(
    condition.field,
    registry,
    columns
  );
  // Operators are column-overloaded; a computed expr is runtime-identical (both SQLWrapper).
  const column = resolved as AnyColumn;
  const { operator, value } = condition;
  if (NO_VALUE_OPERATORS.has(operator)) {
    return noValueSql(operator as "is_empty" | "is_not_empty", column);
  }
  if (MULTI_VALUE_OPERATORS.has(operator)) {
    return multiValueSql(
      operator as "is_any_of" | "is_none_of",
      def,
      column,
      value
    );
  }
  if (RANGE_OPERATORS.has(operator)) {
    return rangeSql(def, column, value);
  }
  return scalarSql(operator as ScalarFilterOperator, def, column, value);
}

function groupSql(
  group: Group,
  registry: FieldRegistry,
  columns: Record<string, FilterColumn>
): SQL | undefined {
  const clauses = group.children
    .map((child) => nodeSql(child, registry, columns))
    .filter((clause): clause is SQL => clause !== undefined);
  if (clauses.length === 0) {
    return;
  }
  return group.connective === "and" ? and(...clauses) : or(...clauses);
}

function nodeSql(
  node: Condition | Group,
  registry: FieldRegistry,
  columns: Record<string, FilterColumn>
): SQL | undefined {
  return isGroup(node)
    ? groupSql(node, registry, columns)
    : conditionSql(node, registry, columns);
}

export function toDrizzleWhere(
  ast: FilterAst,
  registry: FieldRegistry,
  columns: Record<string, FilterColumn>
): SQL | undefined {
  assertValidAst(ast, registry);
  return nodeSql(ast, registry, columns);
}
