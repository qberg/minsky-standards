import type { FilterOperator } from "./ast";

// `date` = a finite epoch-ms INSTANT; `calendar-date` = a `YYYY-MM-DD` STRING.
export type FieldType =
  | "boolean"
  | "calendar-date"
  | "date"
  | "enum"
  | "number"
  | "string-id";

export type FieldDef = {
  readonly type: FieldType;
  readonly operators: readonly FilterOperator[];
  readonly enumValues?: readonly string[];
};

export type FieldRegistry = Record<string, FieldDef>;
