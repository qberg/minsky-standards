# @minsky-org/depcruise-rules

The eleven portable dependency-cruiser rules of a domain-oriented modular monolith with
hexagonal segments: `domain/` pure, `query/` reads, `repo/` writes, `commands/`
orchestrate, handlers are the sink, `shared/` never imports a module, no cycles, no
orphans.

Config files are loaded with a dynamic `import()` for `.js`, `.cjs` and `.mjs`
(dependency-cruiser `src/config-utl/extract-depcruise-config/read-config.mjs`), so an
ESM config works. Name the file `.dependency-cruiser.mjs`.

```js
// .dependency-cruiser.mjs
import { defineDepcruiseConfig } from "@minsky-org/depcruise-rules";

export default defineDepcruiseConfig({
  srcRoot: "^src",
  buckets: "(modules|shared)",
  compositionRoot: "^src/rpc",
  transport: "kernel/orpc",
  extraRules: [
    {
      name: "handlers-no-grant-tables",
      severity: "error",
      comment: "A handler never reads authorization storage directly.",
      from: { path: "/handlers/" },
      to: { path: "^src/modules/access/repo/" },
    },
  ],
});
```

`tsPreCompilationDeps: true` is on: without it, type-only imports are invisible and a
`import type` sneaks straight through the query/repo boundary.

Domain-bound rules stay with the consumer. This package knows no nouns.
