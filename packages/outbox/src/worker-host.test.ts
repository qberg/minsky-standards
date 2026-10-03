import { randomUUID } from "node:crypto";
import { type ConnectionOptions, Queue, type Worker } from "bullmq";
import { afterEach, describe, expect, it } from "vitest";
import { startWorkers } from "./worker-host.js";

const REDIS_URL = process.env.OUTBOX_REDIS_URL;
const QUEUE = "q";
const JOBS = 20;
const HOLD_MS = 40;
const PER_WORKER = 4;
const DRAIN_TIMEOUT_MS = 15_000;
const POLL_MS = 25;

const connectionFrom = (url: string): ConnectionOptions => {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || "6379"),
    db: Number(parsed.pathname.slice(1) || "0"),
    // bullmq redis-connection.js forces this on blocking clients; set it so Queues match.
    maxRetriesPerRequest: null,
  };
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

type Probe = { inFlight: number; max: number; done: number };

const probeHandler = (probe: Probe) => async (): Promise<void> => {
  probe.inFlight += 1;
  probe.max = Math.max(probe.max, probe.inFlight);
  await sleep(HOLD_MS);
  probe.inFlight -= 1;
  probe.done += 1;
};

describe.skipIf(!REDIS_URL)("startWorkers global concurrency across hosts", () => {
  const workers: Worker[] = [];
  const queues: Queue[] = [];

  const ctx = () => {
    const prefix = `outbox-gc-${randomUUID()}`;
    const url = REDIS_URL ?? "";
    const queue = new Queue(QUEUE, { connection: connectionFrom(url), prefix });
    queues.push(queue);
    return { prefix, url, queue };
  };

  type HostArgs = {
    readonly prefix: string;
    readonly url: string;
    readonly probe: Probe;
    readonly globalConcurrency?: Readonly<Record<string, number>>;
  };

  // Each host gets its own connection object, as two processes would.
  const startHost = async (args: HostArgs): Promise<Worker[]> => {
    const started = await startWorkers({
      handlers: { [QUEUE]: probeHandler(args.probe) },
      connection: connectionFrom(args.url),
      concurrency: { [QUEUE]: PER_WORKER },
      prefix: args.prefix,
      ...(args.globalConcurrency
        ? { globalConcurrency: args.globalConcurrency }
        : {}),
    });
    workers.push(...started);
    return started;
  };

  const enqueue = async (queue: Queue): Promise<void> => {
    await queue.addBulk(
      Array.from({ length: JOBS }, (_, index) => ({
        name: "job",
        data: { index },
      }))
    );
  };

  const pollUntilDrained = async (
    probe: Probe,
    queue: Queue,
    deadline: number
  ): Promise<void> => {
    const completed = await queue.getCompletedCount();
    if (completed >= JOBS && probe.inFlight === 0) {
      return;
    }
    if (Date.now() >= deadline) {
      throw new Error(`drain timed out at ${probe.done} of ${JOBS} jobs`);
    }
    await sleep(POLL_MS);
    return pollUntilDrained(probe, queue, deadline);
  };

  const drain = (probe: Probe, queue: Queue): Promise<void> =>
    pollUntilDrained(probe, queue, Date.now() + DRAIN_TIMEOUT_MS);

  const closeAll = async (list: Worker[]): Promise<void> => {
    await Promise.all(list.map((worker) => worker.close()));
  };

  const runTwoHosts = async (
    globalConcurrency?: Readonly<Record<string, number>>
  ): Promise<{ probe: Probe; queue: Queue; prefix: string; url: string }> => {
    const { prefix, url, queue } = ctx();
    const probe: Probe = { inFlight: 0, max: 0, done: 0 };
    const hostArgs = {
      prefix,
      url,
      probe,
      ...(globalConcurrency ? { globalConcurrency } : {}),
    };
    await startHost(hostArgs);
    await startHost(hostArgs);
    await enqueue(queue);
    await drain(probe, queue);
    return { probe, queue, prefix, url };
  };

  afterEach(async () => {
    await closeAll(workers.splice(0));
    const open = queues.splice(0);
    await Promise.all(open.map((queue) => queue.obliterate({ force: true })));
    await Promise.all(open.map((queue) => queue.close()));
  });

  it("control: without a global limit two hosts overlap jobs", async () => {
    const { probe } = await runTwoHosts();
    console.info(`control max in-flight: ${probe.max}`);
    expect(probe.done).toBe(JOBS);
    expect(probe.max).toBeGreaterThan(1);
  });

  it("a global limit of 1 holds across two hosts", async () => {
    const { probe, queue } = await runTwoHosts({ [QUEUE]: 1 });
    console.info(`global=1 max in-flight: ${probe.max}`);
    expect(await queue.getGlobalConcurrency()).toBe(1);
    expect(probe.done).toBe(JOBS);
    expect(probe.max).toBe(1);
  });

  it("starting without the limit removes the stored one", async () => {
    const { prefix, url, queue } = ctx();
    const first: Probe = { inFlight: 0, max: 0, done: 0 };
    const limited = await startHost({
      prefix,
      url,
      probe: first,
      globalConcurrency: { [QUEUE]: 1 },
    });
    expect(await queue.getGlobalConcurrency()).toBe(1);
    await closeAll(limited);

    const probe: Probe = { inFlight: 0, max: 0, done: 0 };
    await startHost({ prefix, url, probe });
    await startHost({ prefix, url, probe });
    expect(await queue.getGlobalConcurrency()).toBeNull();
    await enqueue(queue);
    await drain(probe, queue);
    console.info(`after removal max in-flight: ${probe.max}`);
    expect(first.done).toBe(0);
    expect(probe.done).toBe(JOBS);
    expect(probe.max).toBeGreaterThan(1);
  });
});
