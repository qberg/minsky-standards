import type { IConfiguration, IForbiddenRuleType } from "dependency-cruiser";

export type ArchitectureOptions = {
  // Regex prefix for the app's source root, e.g. "^src" or "^apps/api/src".
  readonly srcRoot?: string;
  // Regex alternation of the top-level buckets that own a vertical.
  readonly buckets?: string;
  // Regex for the composition root: the only place allowed to mount handlers.
  readonly compositionRoot?: string;
  // Path fragment of the transport layer (oRPC, tRPC, controllers).
  readonly transport?: string;
  // Path fragment of the handler-mount inside the transport layer.
  readonly handlerMount?: string;
  // Entry files that are legitimately imported by nothing.
  readonly entryPoints?: readonly string[];
};

type Resolved = Required<ArchitectureOptions>;

const DEFAULTS: Resolved = {
  srcRoot: "^src",
  buckets: "(modules|shared)",
  compositionRoot: "^src/rpc",
  transport: "kernel/orpc",
  handlerMount: "kernel/orpc/handlers",
  entryPoints: ["src/rpc/router\\.ts$", "\\.d\\.ts$"],
};

const resolve = (options: ArchitectureOptions): Resolved => ({
  ...DEFAULTS,
  ...options,
});

const HANDLER_FILE = "\\.handler\\.ts$";

// Everything downstream of a segment: the handler files, the transport, the wiring.
const wireTail = (o: Resolved): string[] => [
  HANDLER_FILE,
  o.transport,
  o.compositionRoot,
];

const wire = (o: Resolved): string[] => ["(/handlers/)", ...wireTail(o)];

const segment = (o: Resolved): string => `${o.srcRoot}/${o.buckets}/[^/]+`;

const purity = (o: Resolved): IForbiddenRuleType => ({
  name: "domain-stays-pure",
  comment:
    "domain/ is pure logic: vocabulary types, validation, contract schemas. No db, no infra, no adapters.",
  severity: "error",
  from: { path: `${segment(o)}/domain/` },
  to: {
    path: [
      "drizzle-orm",
      "(/query/|/repo/|/commands/|/handlers/)",
      HANDLER_FILE,
      o.transport,
      o.compositionRoot,
    ],
  },
});

const cqrsRules = (o: Resolved): IForbiddenRuleType[] => [
  {
    name: "query-reads-only",
    comment:
      "query/ is the READ side. It never imports the write side (repo/), the orchestrator (commands/), or the wire. Shared Row and Scope types go in <aggregate>.model.ts.",
    severity: "error",
    from: { path: `${segment(o)}/query/` },
    to: { path: ["(/repo/|/commands/|/handlers/)", ...wireTail(o)] },
  },
  {
    name: "repo-writes-only",
    comment:
      "repo/ is the WRITE side (driven adapter). It never imports the read side (query/), the orchestrator (commands/), or the wire.",
    severity: "error",
    from: { path: `${segment(o)}/repo/` },
    to: { path: ["(/query/|/commands/|/handlers/)", ...wireTail(o)] },
  },
  {
    name: "model-is-leaf",
    comment:
      "<aggregate>.model.ts holds persistence contracts (Row types, Scope value objects, scope SQL). It is a leaf: no segment imports.",
    severity: "error",
    from: { path: `${segment(o)}/[^/]+\\.model\\.ts$` },
    to: {
      path: [
        "(/domain/|/query/|/repo/|/commands/|/handlers/)",
        ...wireTail(o),
      ],
    },
  },
  {
    name: "commands-no-wire",
    comment:
      "commands/ orchestrate domain, query and repo inside a transaction. Transport-agnostic: no handlers, no router.",
    severity: "error",
    from: { path: `${segment(o)}/commands/` },
    to: { path: wire(o) },
  },
];

const boundaryRules = (o: Resolved): IForbiddenRuleType[] => [
  {
    name: "handlers-are-the-sink",
    comment:
      "A handler is the transport entrypoint. Only the composition root mounts handlers; a handler calls command, query or repo, never another handler.",
    severity: "error",
    from: {
      path: o.srcRoot,
      pathNot: [o.compositionRoot, "(/handlers/|\\.handler\\.ts$)"],
    },
    to: { path: "(/handlers/|\\.handler\\.ts$)" },
  },
  {
    name: "no-foreign-module-handlers",
    comment:
      "Cross-module traffic goes through command, query or repo. A module's handlers are its private wire surface.",
    severity: "error",
    from: { path: `${o.srcRoot}/modules/([^/]+)/` },
    to: {
      path: `${o.srcRoot}/modules/[^/]+/(handlers/|[^/]*\\.handler\\.ts)`,
      pathNot: `${o.srcRoot}/modules/$1/`,
    },
  },
  {
    name: "shared-no-modules",
    comment:
      "shared/ is owned by nobody, so it cannot depend on one module's language. Dependencies flow modules -> shared, never the reverse.",
    severity: "error",
    from: { path: `${o.srcRoot}/shared` },
    to: { path: `${o.srcRoot}/modules` },
  },
  {
    name: "no-reach-into-composition",
    comment:
      "modules/ and shared/ must not import the composition root or the handler mount. Wiring depends on them, not the reverse.",
    severity: "error",
    from: { path: `${o.srcRoot}/${o.buckets}` },
    to: { path: [o.compositionRoot, o.handlerMount] },
  },
];

const hygieneRules = (o: Resolved): IForbiddenRuleType[] => [
  {
    name: "no-circular",
    comment:
      "Circular import. Extract the shared piece into model.ts or a lower segment.",
    severity: "error",
    from: { path: o.srcRoot, pathNot: "node_modules" },
    to: { circular: true, path: o.srcRoot },
  },
  {
    name: "no-orphans",
    comment: "Orphan module: nothing imports it. Wire it up or delete it.",
    severity: "warn",
    from: { orphan: true, pathNot: [...o.entryPoints] },
    to: {},
  },
];

// The eleven portable rules of a domain-oriented modular monolith with hexagonal
// segments. Domain-bound rules (which tables a handler may not touch) belong to the
// consumer, appended to this array.
export function createArchitectureRules(
  options: ArchitectureOptions = {}
): IForbiddenRuleType[] {
  const resolved = resolve(options);
  return [
    purity(resolved),
    ...cqrsRules(resolved),
    ...boundaryRules(resolved),
    ...hygieneRules(resolved),
  ];
}

export type DepcruiseConfigOptions = ArchitectureOptions & {
  readonly tsConfigFileName?: string;
  readonly extraRules?: readonly IForbiddenRuleType[];
};

export function defineDepcruiseConfig(
  options: DepcruiseConfigOptions = {}
): IConfiguration {
  const { tsConfigFileName, extraRules, ...architecture } = options;
  return {
    forbidden: [
      ...createArchitectureRules(architecture),
      ...(extraRules ?? []),
    ],
    options: {
      tsConfig: { fileName: tsConfigFileName ?? "./tsconfig.json" },
      // See type-only imports, so query/repo separation is total (no `import type`
      // boundary cheats) and type-only-consumed leaves are not flagged as orphans.
      tsPreCompilationDeps: true,
      exclude: { path: "\\.(test|spec|arch-fixture)\\.ts$" },
      enhancedResolveOptions: {
        exportsFields: ["exports"],
        conditionNames: ["import", "require", "node", "default"],
      },
    },
  };
}
