const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isCalendarDate(value: unknown): value is string {
  return typeof value === "string" && CALENDAR_DATE_PATTERN.test(value);
}

// Meili ranges/sorts compare NUMBERS; UTC (not IST) midnight keeps the transform
// timezone-free because only the ORDERING is meaningful, never the instant.
export function calendarDateToIndexValue(date: string): number {
  if (!isCalendarDate(date)) {
    throw new Error(
      `[calendar-date] expected YYYY-MM-DD, got: ${String(date)}`
    );
  }
  const ms = Date.parse(`${date}T00:00:00.000Z`);
  if (Number.isNaN(ms)) {
    throw new Error(`[calendar-date] not a real calendar date: ${date}`);
  }
  return ms;
}

export function indexValueToCalendarDate(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error(`[calendar-date] expected finite epoch-ms, got: ${value}`);
  }
  return new Date(value).toISOString().slice(0, 10);
}
