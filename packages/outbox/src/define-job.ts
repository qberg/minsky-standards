import { UnrecoverableError } from "bullmq";
import * as v from "valibot";
import { type OutboxLogger, silentLogger } from "./logger";

// BullMQ increments attemptsMade only AFTER the processor settles, and its own retry
// test is `attemptsMade + 1 < opts.attempts` (bullmq job.js shouldRetryJob), so during
// a run `made + 1 >= max` is exactly the negation: this is the last attempt.
export type JobAttempt = {
  readonly made: number;
  readonly max: number;
};

export const isFinalAttempt = (attempt: JobAttempt | undefined): boolean =>
  attempt !== undefined && attempt.made + 1 >= attempt.max;

export type Job<Deps> = (
  deps: Deps,
  payload: unknown,
  attempt?: JobAttempt
) => Promise<void>;

export type LogFields = Record<string, unknown>;

type AnyValibotSchema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;

export type LoadFn<TSchema extends AnyValibotSchema, Loaded, Deps> = (
  parsed: v.InferOutput<TSchema>,
  deps: Deps
) => Promise<Loaded>;

// Returns an UnrecoverableError message when the guard fails, or null to pass.
export type GuardFn<Loaded> = (loaded: Loaded) => string | null;

export type ActFn<Loaded, Deps, Summary extends LogFields> = (
  loaded: Loaded,
  deps: Deps,
  attempt?: JobAttempt
) => Promise<Summary>;

export type JobConfig<
  TSchema extends AnyValibotSchema,
  Loaded,
  Deps,
  Summary extends LogFields,
> = {
  schema: TSchema;
  invalidPayloadMessage: string;
  load: LoadFn<TSchema, Loaded, Deps>;
  guard?: GuardFn<Loaded>;
  act: ActFn<Loaded, Deps, Summary>;
  logMessage: string | ((summary: Summary) => string);
};

const parsePayload = <TSchema extends AnyValibotSchema>(
  schema: TSchema,
  payload: unknown,
  message: string
): v.InferOutput<TSchema> => {
  const result = v.safeParse(schema, payload);
  if (!result.success) {
    throw new UnrecoverableError(message);
  }
  return result.output;
};

const guardOrThrow = <Loaded>(
  guard: GuardFn<Loaded> | undefined,
  loaded: Loaded
): void => {
  if (!guard) {
    return;
  }
  const message = guard(loaded);
  if (message !== null) {
    throw new UnrecoverableError(message);
  }
};

const resolveLogMessage = <Summary extends LogFields>(
  logMessage: string | ((summary: Summary) => string),
  summary: Summary
): string =>
  typeof logMessage === "function" ? logMessage(summary) : logMessage;

// A malformed payload is poison: it will never parse, so it dead-letters on attempt 1
// instead of burning the retry ladder. A plain (non-Unrecoverable) throw from
// load or act still propagates, so BullMQ retry holds.
export const createJobFactory =
  (logger: OutboxLogger = silentLogger) =>
  <TSchema extends AnyValibotSchema, Loaded, Deps, Summary extends LogFields>(
    config: JobConfig<TSchema, Loaded, Deps, Summary>
  ): Job<Deps> =>
  async (deps: Deps, payload: unknown, attempt?: JobAttempt): Promise<void> => {
    const parsed = parsePayload(
      config.schema,
      payload,
      config.invalidPayloadMessage
    );
    const loaded = await config.load(parsed, deps);
    guardOrThrow(config.guard, loaded);
    const summary = await config.act(loaded, deps, attempt);
    logger({
      level: "info",
      message: resolveLogMessage(config.logMessage, summary),
      fields: summary,
    });
  };

// Load-or-dead-letter helper: a missing row is a deterministic failure, so it
// dead-letters on the first attempt rather than falling through to retry.
export const rowOrThrow = <T>(
  row: T | null | undefined,
  message: string
): T => {
  if (row === null || row === undefined) {
    throw new UnrecoverableError(message);
  }
  return row;
};
