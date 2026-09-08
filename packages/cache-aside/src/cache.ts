import type { Redis } from "ioredis";
import {
  type BaseIssue,
  type BaseSchema,
  type InferOutput,
  safeParse,
} from "valibot";
import { type CacheLogger, silentLogger } from "./logger.js";
import type { BoundNode } from "./registry.js";

export type CacheClient = Pick<
  Redis,
  "get" | "scanStream" | "setex" | "status" | "unlink"
>;

type AnyValibotSchema = BaseSchema<unknown, unknown, BaseIssue<unknown>>;

export type CacheOptions = {
  readonly client: CacheClient;
  readonly logger?: CacheLogger;
  readonly slowGetMs?: number;
  readonly scanCount?: number;
};

export type Cache = {
  withCache<TSchema extends AnyValibotSchema>(
    node: BoundNode<TSchema>,
    fetcher: () => Promise<InferOutput<TSchema>>
  ): Promise<InferOutput<TSchema>>;
  invalidatePrefix(prefix: string): Promise<number>;
};

type Ctx = {
  readonly client: CacheClient;
  readonly log: CacheLogger;
  readonly slowGetMs: number;
  readonly scanCount: number;
};

type Hit<T> = { readonly value: T };

const DEFAULT_SLOW_GET_MS = 500;
const DEFAULT_SCAN_COUNT = 100;

const emit = (
  ctx: Ctx,
  level: "debug" | "error" | "info" | "warn",
  message: string,
  fields: Record<string, unknown>
): void => ctx.log({ level, message, fields });

async function readRaw(ctx: Ctx, key: string): Promise<string | null> {
  const started = performance.now();
  const raw = await ctx.client.get(key);
  const latencyMs = Math.round(performance.now() - started);
  // A slow local GET means ioredis is reconnecting or the socket is wedged, not a cold key.
  if (latencyMs > ctx.slowGetMs) {
    emit(ctx, "warn", "cache slow GET, likely reconnect or socket stall", {
      key,
      latencyMs,
      status: ctx.client.status,
    });
  }
  return raw;
}

function decode<TSchema extends AnyValibotSchema>(
  ctx: Ctx,
  node: BoundNode<TSchema>,
  raw: string
): Hit<InferOutput<TSchema>> | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    emit(ctx, "warn", "cache malformed JSON, recovering", { key: node.key });
    return;
  }
  const result = safeParse(node.schema, parsed);
  if (result.success) {
    return { value: result.output };
  }
  emit(ctx, "warn", "cache entry failed its schema, recovering", {
    key: node.key,
    issues: result.issues,
  });
  return;
}

async function readCached<TSchema extends AnyValibotSchema>(
  ctx: Ctx,
  node: BoundNode<TSchema>
): Promise<Hit<InferOutput<TSchema>> | undefined> {
  try {
    const raw = await readRaw(ctx, node.key);
    return raw === null ? undefined : decode(ctx, node, raw);
  } catch (error) {
    emit(ctx, "error", "cache read failed, bypassing cache", {
      key: node.key,
      error,
    });
    return;
  }
}

async function propagate<TSchema extends AnyValibotSchema>(
  ctx: Ctx,
  node: BoundNode<TSchema>,
  fresh: InferOutput<TSchema>
): Promise<void> {
  try {
    await ctx.client.setex(node.key, node.ttl, JSON.stringify(fresh));
  } catch (error) {
    emit(ctx, "warn", "cache write failed, source value returned", {
      key: node.key,
      error,
    });
  }
}

export function createCache(options: CacheOptions): Cache {
  const ctx: Ctx = {
    client: options.client,
    log: options.logger ?? silentLogger,
    slowGetMs: options.slowGetMs ?? DEFAULT_SLOW_GET_MS,
    scanCount: options.scanCount ?? DEFAULT_SCAN_COUNT,
  };
  // Coalescing is process-local; multi-replica stampede control needs a Redis SET NX lock.
  const inflight = new Map<string, Promise<unknown>>();

  const fill = <TSchema extends AnyValibotSchema>(
    node: BoundNode<TSchema>,
    fetcher: () => Promise<InferOutput<TSchema>>
  ): Promise<InferOutput<TSchema>> => {
    const existing = inflight.get(node.key);
    if (existing) {
      return existing as Promise<InferOutput<TSchema>>;
    }
    const promise = (async () => {
      try {
        const fresh = await fetcher();
        await propagate(ctx, node, fresh);
        return fresh;
      } finally {
        inflight.delete(node.key);
      }
    })();
    inflight.set(node.key, promise);
    return promise;
  };

  return {
    async withCache(node, fetcher) {
      const hit = await readCached(ctx, node);
      if (hit) {
        emit(ctx, "debug", "cache hit", { key: node.key });
        return hit.value;
      }
      emit(ctx, "debug", "cache miss, acquiring from source", {
        key: node.key,
      });
      return await fill(node, fetcher);
    },

    // SCAN (cursor, non-blocking) + UNLINK (async delete) purge a prefix without the
    // O(n) stall of KEYS/DEL. Whoever writes the source of truth calls this.
    async invalidatePrefix(prefix) {
      const stream = ctx.client.scanStream({
        match: `${prefix}*`,
        count: ctx.scanCount,
      });
      let removed = 0;
      for await (const keys of stream) {
        const batch = keys as string[];
        if (batch.length > 0) {
          removed += await ctx.client.unlink(...batch);
        }
      }
      emit(ctx, "info", "cache prefix purged", { prefix, removed });
      return removed;
    },
  };
}
