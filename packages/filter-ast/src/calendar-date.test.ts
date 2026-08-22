import { describe, expect, it } from "vitest";
import {
  calendarDateToIndexValue,
  indexValueToCalendarDate,
  isCalendarDate,
} from "./calendar-date";

const EXPECTED_SHAPE_RE = /expected YYYY-MM-DD/;
const NOT_REAL_DATE_RE = /not a real calendar date/;
const FINITE_MS_RE = /finite epoch-ms/;

describe("isCalendarDate", () => {
  it("accepts a YYYY-MM-DD string", () => {
    expect(isCalendarDate("2026-08-13")).toBe(true);
  });

  it.each([
    "2026-8-13",
    "13-08-2026",
    "2026-08-13T00:00:00Z",
    "",
    "x",
  ])("rejects %s", (value) => {
    expect(isCalendarDate(value)).toBe(false);
  });

  it.each([
    0,
    null,
    undefined,
    1_755_043_200_000,
  ])("rejects the non-string %s", (value) => {
    expect(isCalendarDate(value)).toBe(false);
  });
});

describe("calendarDateToIndexValue", () => {
  it("is UTC midnight of the calendar date", () => {
    expect(calendarDateToIndexValue("2026-08-13")).toBe(
      Date.UTC(2026, 7, 13, 0, 0, 0, 0)
    );
  });

  it("orders the same way the date strings do", () => {
    const dates = ["2025-12-31", "2026-01-01", "2026-01-02", "2026-02-01"];
    const values = dates.map(calendarDateToIndexValue);
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });

  it("throws on a non-YYYY-MM-DD value", () => {
    expect(() => calendarDateToIndexValue("13/08/2026")).toThrow(
      EXPECTED_SHAPE_RE
    );
  });

  it("throws on a well-shaped but impossible date", () => {
    expect(() => calendarDateToIndexValue("2026-13-45")).toThrow(
      NOT_REAL_DATE_RE
    );
  });
});

describe("indexValueToCalendarDate", () => {
  it("round-trips every date through the index value", () => {
    for (const d of ["1970-01-01", "2026-02-28", "2026-08-13", "2099-12-31"]) {
      expect(indexValueToCalendarDate(calendarDateToIndexValue(d))).toBe(d);
    }
  });

  it("throws on a non-finite value", () => {
    expect(() => indexValueToCalendarDate(Number.NaN)).toThrow(FINITE_MS_RE);
  });
});
