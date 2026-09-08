import { UnrecoverableError } from "bullmq";
import * as v from "valibot";
import { describe, expect, it } from "vitest";
import { createJobFactory, isFinalAttempt, rowOrThrow } from "./define-job.js";
import type { OutboxLogEntry } from "./logger.js";

const PayloadSchema = v.object({ id: v.string() });

type Deps = { readonly rows: Record<string, string | undefined> };

const deps: Deps = { rows: { known: "value" } };

const collect = () => {
  const entries: OutboxLogEntry[] = [];
  return { entries, logger: (entry: OutboxLogEntry) => entries.push(entry) };
};

const buildJob = (guard?: (loaded: string) => string | null) => {
  const { entries, logger } = collect();
  const defineJob = createJobFactory(logger);
  const job = defineJob<typeof PayloadSchema, string, Deps, { id: string }>({
    schema: PayloadSchema,
    invalidPayloadMessage: "malformed payload",
    load: ({ id }, d) => Promise.resolve(rowOrThrow(d.rows[id], `gone: ${id}`)),
    ...(guard ? { guard } : {}),
    act: (loaded) => Promise.resolve({ id: loaded }),
    logMessage: "job done",
  });
  return { entries, job };
};

describe("defineJob", () => {
  it("runs parse, load, act and logs the summary", async () => {
    const { entries, job } = buildJob();
    await job(deps, { id: "known" });
    expect(entries).toEqual([
      { level: "info", message: "job done", fields: { id: "value" } },
    ]);
  });

  it("dead-letters a payload that fails its schema", async () => {
    const { job } = buildJob();
    await expect(job(deps, { id: 7 })).rejects.toBeInstanceOf(
      UnrecoverableError
    );
  });

  it("dead-letters a row that does not exist", async () => {
    const { job } = buildJob();
    await expect(job(deps, { id: "missing" })).rejects.toThrow(
      "gone: missing"
    );
  });

  it("dead-letters when the guard refuses", async () => {
    const { job } = buildJob(() => "not allowed");
    await expect(job(deps, { id: "known" })).rejects.toBeInstanceOf(
      UnrecoverableError
    );
  });

  it("passes a guard that returns null", async () => {
    const { entries, job } = buildJob(() => null);
    await job(deps, { id: "known" });
    expect(entries).toHaveLength(1);
  });

  it("lets a plain throw through so the queue retries", async () => {
    const { logger } = collect();
    const job = createJobFactory(logger)({
      schema: PayloadSchema,
      invalidPayloadMessage: "malformed payload",
      load: () => Promise.reject(new Error("upstream down")),
      act: () => Promise.resolve({}),
      logMessage: "never",
    });
    const failure = job(deps, { id: "known" });
    await expect(failure).rejects.not.toBeInstanceOf(UnrecoverableError);
  });
});

describe("isFinalAttempt", () => {
  it("is false while retries remain", () => {
    expect(isFinalAttempt({ made: 0, max: 3 })).toBe(false);
  });

  it("is true on the last run, since attemptsMade increments after settle", () => {
    expect(isFinalAttempt({ made: 2, max: 3 })).toBe(true);
  });

  it("is false when the attempt is unknown", () => {
    expect(isFinalAttempt(undefined)).toBe(false);
  });
});
