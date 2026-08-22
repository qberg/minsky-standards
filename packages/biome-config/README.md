# @minsky-org/biome-config

The org's biome layer on top of ultracite.

```jsonc
// biome.jsonc at the repo root
{
  "extends": ["@minsky-org/biome-config/biome.jsonc"]
}
```

**Run ultracite, never raw biome.** `pnpm exec ultracite check` and
`pnpm exec ultracite fix`. Raw `npx biome` cannot resolve the `ultracite/biome/core`
extends chain and emits false positives (`useAwait`, `noEmptyBlockStatements`) while
missing real ones.

What this layer adds to ultracite:

- `noBarrelFile: error`. A barrel re-export hides the real dependency graph and defeats
  every architecture rule drawn on import paths.
- `noNamespaceImport: off`. `import * as v from "valibot"` is the idiomatic form.
- `useConsistentTypeDefinitions: type`. One way to declare a shape.
- `noConsole: warn`. Real logging goes through the logger; a stray `console.log` should
  itch without blocking.
- `useSortedProperties: off`. Property order carries meaning in configs and schemas.

Repo-specific overrides (generated directories, framework file-naming conventions,
restricted imports) belong in the consuming repo's own `biome.jsonc`, after the
`extends`.
