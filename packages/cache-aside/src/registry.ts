// TTL policy is the consumer's: short for auth-critical keys, long for stable rows.
// This package holds no key namespace of its own.
export type CacheNode<
  TSchema = unknown,
  TArgs extends unknown[] = unknown[],
> = {
  readonly key: (...args: TArgs) => string;
  readonly ttl: number;
  readonly schema: TSchema;
};

export type AnyCacheNode = {
  readonly key: (...args: never[]) => string;
  readonly ttl: number;
  readonly schema: unknown;
};

export type BoundNode<TSchema = unknown> = {
  readonly key: string;
  readonly ttl: number;
  readonly schema: TSchema;
};

export type BoundRegistry<TRegistry extends Record<string, AnyCacheNode>> = {
  [K in keyof TRegistry]: (
    ...args: Parameters<TRegistry[K]["key"]>
  ) => BoundNode<TRegistry[K]["schema"]>;
};

export function defineCacheNode<TSchema, TArgs extends unknown[]>(
  node: CacheNode<TSchema, TArgs>
): CacheNode<TSchema, TArgs> {
  return node;
}

export function bindRegistry<TRegistry extends Record<string, AnyCacheNode>>(
  registry: TRegistry
): Readonly<BoundRegistry<TRegistry>> {
  const bound = Object.fromEntries(
    Object.entries(registry).map(([name, node]) => [
      name,
      (...args: unknown[]) => ({
        key: (node.key as (...a: unknown[]) => string)(...args),
        ttl: node.ttl,
        schema: node.schema,
      }),
    ])
  ) as unknown as BoundRegistry<TRegistry>;
  return Object.freeze(bound);
}
