# @minsky-org/biome-config

The org's biome layer on top of ultracite.

```jsonc
// biome.jsonc at the repo root. Order matters: ultracite first, the org layer last.
{
  "extends": [
    "ultracite/biome/core",
    "ultracite/biome/react",
    "./node_modules/@minsky-org/biome-config/biome.jsonc"
  ]
}
```

**Every consumer lists ultracite itself.** Biome honours `extends` only in the root
config: a config that is itself extended never chains further, and nothing is reported.
Until 0.3.0 this package extended ultracite internally, so every consumer silently ran
on Biome's defaults (tabs, trailing commas everywhere, 80 columns) with none of
ultracite's rules. Proven 2026-09-07 on Biome 2.5.8 by reading the resolved
`JsFormatOptions` from `biome format --log-level=debug`; `ultracite doctor` also warns
when the root config lacks the ultracite entries. Run `pnpm exec ultracite check` and
`pnpm exec ultracite fix`, or raw biome; with the root chain in place they agree.

What this layer adds to ultracite:

- Formatter stated explicitly: spaces, width 2, 100 columns (the handbook's hard line
  length), trailing commas `es5`. Stated so the bar holds even if a consumer misorders
  the chain.
- `noBarrelFile: error`. A barrel re-export hides the real dependency graph and defeats
  every architecture rule drawn on import paths.
- `noNamespaceImport: off`. `import * as v from "valibot"` is the idiomatic form.
- `noJsxPropsBind: off`. Inline handlers are the React 19 idiom; the compiler memoises
  them, and hoisting every `onClick` into `useCallback` is noise.
- `useConsistentTypeDefinitions: type`. One way to declare a shape.
- `noConsole: warn`. Real logging goes through the logger; a stray `console.log` should
  itch without blocking.
- `useSortedProperties: off`. Property order carries meaning in configs and schemas.
- Tailwind v4 directives parse in CSS.

Repo-specific overrides (generated directories, framework file-naming conventions,
restricted imports) belong in the consuming repo's own `biome.jsonc`, after the
`extends`.
