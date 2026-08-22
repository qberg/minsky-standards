const DEFAULTS = {
    srcRoot: "^src",
    buckets: "(modules|shared)",
    compositionRoot: "^src/rpc",
    transport: "kernel/orpc",
    handlerMount: "kernel/orpc/handlers",
    entryPoints: ["src/rpc/router\\.ts$", "\\.d\\.ts$"],
};
const resolve = (options) => ({
    ...DEFAULTS,
    ...options,
});
const HANDLER_FILE = "\\.handler\\.ts$";
// Everything downstream of a segment: the handler files, the transport, the wiring.
const wireTail = (o) => [
    HANDLER_FILE,
    o.transport,
    o.compositionRoot,
];
const wire = (o) => ["(/handlers/)", ...wireTail(o)];
const segment = (o) => `${o.srcRoot}/${o.buckets}/[^/]+`;
const purity = (o) => ({
    name: "domain-stays-pure",
    comment: "domain/ is pure logic: vocabulary types, validation, contract schemas. No db, no infra, no adapters.",
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
const cqrsRules = (o) => [
    {
        name: "query-reads-only",
        comment: "query/ is the READ side. It never imports the write side (repo/), the orchestrator (commands/), or the wire. Shared Row and Scope types go in <aggregate>.model.ts.",
        severity: "error",
        from: { path: `${segment(o)}/query/` },
        to: { path: ["(/repo/|/commands/|/handlers/)", ...wireTail(o)] },
    },
    {
        name: "repo-writes-only",
        comment: "repo/ is the WRITE side (driven adapter). It never imports the read side (query/), the orchestrator (commands/), or the wire.",
        severity: "error",
        from: { path: `${segment(o)}/repo/` },
        to: { path: ["(/query/|/commands/|/handlers/)", ...wireTail(o)] },
    },
    {
        name: "model-is-leaf",
        comment: "<aggregate>.model.ts holds persistence contracts (Row types, Scope value objects, scope SQL). It is a leaf: no segment imports.",
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
        comment: "commands/ orchestrate domain, query and repo inside a transaction. Transport-agnostic: no handlers, no router.",
        severity: "error",
        from: { path: `${segment(o)}/commands/` },
        to: { path: wire(o) },
    },
];
const boundaryRules = (o) => [
    {
        name: "handlers-are-the-sink",
        comment: "A handler is the transport entrypoint. Only the composition root mounts handlers; a handler calls command, query or repo, never another handler.",
        severity: "error",
        from: {
            path: o.srcRoot,
            pathNot: [o.compositionRoot, "(/handlers/|\\.handler\\.ts$)"],
        },
        to: { path: "(/handlers/|\\.handler\\.ts$)" },
    },
    {
        name: "no-foreign-module-handlers",
        comment: "Cross-module traffic goes through command, query or repo. A module's handlers are its private wire surface.",
        severity: "error",
        from: { path: `${o.srcRoot}/modules/([^/]+)/` },
        to: {
            path: `${o.srcRoot}/modules/[^/]+/(handlers/|[^/]*\\.handler\\.ts)`,
            pathNot: `${o.srcRoot}/modules/$1/`,
        },
    },
    {
        name: "shared-no-modules",
        comment: "shared/ is owned by nobody, so it cannot depend on one module's language. Dependencies flow modules -> shared, never the reverse.",
        severity: "error",
        from: { path: `${o.srcRoot}/shared` },
        to: { path: `${o.srcRoot}/modules` },
    },
    {
        name: "no-reach-into-composition",
        comment: "modules/ and shared/ must not import the composition root or the handler mount. Wiring depends on them, not the reverse.",
        severity: "error",
        from: { path: `${o.srcRoot}/${o.buckets}` },
        to: { path: [o.compositionRoot, o.handlerMount] },
    },
];
const hygieneRules = (o) => [
    {
        name: "no-circular",
        comment: "Circular import. Extract the shared piece into model.ts or a lower segment.",
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
export function createArchitectureRules(options = {}) {
    const resolved = resolve(options);
    return [
        purity(resolved),
        ...cqrsRules(resolved),
        ...boundaryRules(resolved),
        ...hygieneRules(resolved),
    ];
}
export function defineDepcruiseConfig(options = {}) {
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
//# sourceMappingURL=index.js.map