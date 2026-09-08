import { type ConnectionOptions, Worker } from "bullmq";
import type { JobAttempt } from "./define-job.js";

export type JobHandler = (
  payload: unknown,
  attempt?: JobAttempt
) => Promise<void>;

// Generic on purpose: the host runs whatever it is handed. Completeness of the queue
// vocabulary is enforced where the registry is BUILT, not where it is consumed.
export type HandlerRegistry = Record<string, JobHandler>;

const DEFAULT_CONCURRENCY = 1;
const SINGLE_ATTEMPT = 1;

const attemptOf = (job: {
  attemptsMade: number;
  opts: { attempts?: number };
}): JobAttempt => ({
  made: job.attemptsMade,
  max: job.opts.attempts ?? SINGLE_ATTEMPT,
});

export type StartWorkersArgs = {
  readonly handlers: HandlerRegistry;
  readonly connection: ConnectionOptions;
  readonly concurrency?: Readonly<Record<string, number>>;
  readonly prefix?: string;
};

// `prefix` must mirror createQueueRegistry's: a Worker only sees jobs from a
// same-prefix Queue (bullmq WorkerOptions extends QueueBaseOptions.prefix).
export function startWorkers(args: StartWorkersArgs): Worker[] {
  return Object.entries(args.handlers).map(
    ([queue, handler]) =>
      new Worker(queue, (job) => handler(job.data, attemptOf(job)), {
        connection: args.connection,
        concurrency: args.concurrency?.[queue] ?? DEFAULT_CONCURRENCY,
        ...(args.prefix ? { prefix: args.prefix } : {}),
      })
  );
}
