import {
  type BackoffOptions,
  type ConnectionOptions,
  Queue,
} from "bullmq";
import { type OutboxLogger, silentLogger } from "./logger";
import type { ClaimedJob, EnqueueJob } from "./relay";

const DEFAULT_ENQUEUE_DEADLINE_MS = 5000;
const DEFAULT_ATTEMPTS = 5;
const DEFAULT_BACKOFF: BackoffOptions = { type: "exponential", delay: 1000 };
const COMPLETED_RETENTION = { age: 3600, count: 1000 };

export type QueueRegistryOptions = {
  readonly connection: ConnectionOptions;
  readonly queueNames?: readonly string[];
  readonly prefix?: string;
  readonly logger?: OutboxLogger;
  readonly attempts?: number;
  readonly attemptsByQueue?: Readonly<Record<string, number>>;
  readonly backoff?: BackoffOptions;
  readonly enqueueDeadlineMs?: number;
};

export type QueueRegistry = {
  enqueue: EnqueueJob;
  list(): Queue[];
  close(): Promise<void>;
};

// `queue.add` awaits a one-shot connect promise that settles only on ready or end
// (bullmq redis-connection.js waitUntilReady), which is unbounded, so race it.
async function withDeadline<T>(
  op: Promise<T>,
  label: string,
  deadlineMs: number
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} exceeded ${deadlineMs}ms`)),
      deadlineMs
    );
  });
  try {
    return await Promise.race([op, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

// A Queue re-emits its connection's errors (bullmq queue-base.js) and an unlistened
// 'error' is rethrown by EventEmitter, so one blip would kill the process.
function createQueue(
  name: string,
  options: QueueRegistryOptions,
  log: OutboxLogger
): Queue {
  const queue = new Queue(name, {
    connection: options.connection,
    ...(options.prefix ? { prefix: options.prefix } : {}),
  });
  queue.on("error", (error) => {
    log({
      level: "error",
      message: "queue producer connection error",
      fields: { queue: name, error },
    });
  });
  return queue;
}

export function createQueueRegistry(
  options: QueueRegistryOptions
): QueueRegistry {
  const log = options.logger ?? silentLogger;
  const deadlineMs = options.enqueueDeadlineMs ?? DEFAULT_ENQUEUE_DEADLINE_MS;
  const queues = new Map<string, Queue>();
  for (const name of options.queueNames ?? []) {
    queues.set(name, createQueue(name, options, log));
  }

  const get = (name: string): Queue => {
    const existing = queues.get(name);
    if (existing) {
      return existing;
    }
    const queue = createQueue(name, options, log);
    queues.set(name, queue);
    return queue;
  };

  return {
    async enqueue(job: ClaimedJob): Promise<void> {
      const added = get(job.queue).add(job.queue, job.payload, {
        // jobId = the outbox row id, so a re-dispatched stale-processing row dedupes
        // instead of running the side effect twice.
        jobId: job.id,
        attempts:
          options.attemptsByQueue?.[job.queue] ??
          options.attempts ??
          DEFAULT_ATTEMPTS,
        backoff: options.backoff ?? DEFAULT_BACKOFF,
        removeOnComplete: COMPLETED_RETENTION,
        removeOnFail: false,
      });
      await withDeadline(added, `enqueue ${job.queue}`, deadlineMs);
    },
    list(): Queue[] {
      return [...queues.values()];
    },
    async close(): Promise<void> {
      await Promise.all([...queues.values()].map((q) => q.close()));
    },
  };
}
