# Minsky stack law: tooling and packaging

One chapter of `stack.md`, split out 2026-10-31 so a repo loads it by path (apm's context round,
founder's word). Org-wide; receipts in the source repos' ADRs.

## Proven gotchas

- Native-build deps (sharp, esbuild) must also be in `onlyBuiltDependencies`
  (pnpm-workspace.yaml) or pnpm skips their build.
- Bundled node apps must set `noExternal` for workspace packages (they export raw
  TS); native deps stay external.
- A package `lint` script runs `biome check <paths>`, never `biome lint` alone: `lint` applies rules
  only, while import sorting and formatting are `check` assists that nothing else runs per package, so
  a builder's "lint green" leaves drift the editor then flags. Proven in apm 2026-09-16 across six
  packages after five green handbacks with unsorted imports. Include the app's `index.html` in the paths.
- TypeScript 7 (native Go port, GA 2026-07-08) is a drop-in for a MODERN config: the
  breaking changes sit at the 5.x -> 6.0 boundary, not 6 -> 7, so a greenfield repo
  skips the two-step migration entirely. Now hard errors: `baseUrl`, `target: es5`,
  `downlevelIteration`, `moduleResolution: node/node10/classic`, `module:
  amd/umd/systemjs/none`, `esModuleInterop: false`. `types` defaults to `[]` (was
  every @types package), so each package lists what it needs. What BLOCKS adoption is
  the missing programmatic API until 7.1: typescript-eslint, Vue, Svelte, Astro, MDX,
  Angular templates, Volar. None of them apply to this stack (biome has no type-aware
  lint, so typescript-eslint was never in it), and Storybook's TS-API docgen is opt-in
  (`react-docgen-typescript`, peer `>= 4.3.x`); the default `react-docgen` is
  babel-based and needs no compiler API. If a dep does need the API, bridge with
  `@typescript/typescript6` (`tsc6` binary, re-exports the 6.0 API) before reverting
  the major. Proven greenfield in apm 2026-09-06 (#98). Receipt:
  https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- `minimumReleaseAge` is 11200 minutes (~7.8 days) in the org pnpm config, so
  `npm view <pkg> version` is NOT the pin to write: anything published inside that
  window cannot resolve at all. Pin the newest release older than the cutoff, with a
  caret so the fresher one lands by itself once it ages in. Sort candidates by SEMVER,
  never by publish date: a backport to an older line (react 19.0.8 shipped after
  19.2.8 on the same day) makes a date sort silently pick the older release.
  `minimumReleaseAgeExclude` carries `@minsky-org/*`, own packages trusted at any age.
  A sibling repo's catalog block is a snapshot, never a source of truth: copying one
  verbatim into a new repo shipped nine stale pins and two legacy entries.
- Biome honours `extends` only in the ROOT config: a config that is itself extended
  never chains further, and nothing is reported. `@minsky-org/biome-config` extended
  ultracite internally until 0.3.0, so every consumer silently ran on Biome defaults
  (tabs, trailing commas everywhere, 80 columns) with none of ultracite's rules. The root
  `biome.jsonc` lists `ultracite/biome/core`, `ultracite/biome/react`, then the org
  layer, in that order. Verify a formatter claim by reading `JsFormatOptions` from
  `biome format --log-level=debug`, never by reading the file back: a config error
  leaves the probe untouched and looks like success. Proven in apm 2026-09-07.
- Publish a workspace package with pnpm, never npm. `npm pack` and `npm publish` ship a
  `workspace:` dependency verbatim and the tarball then installs nowhere
  (`EUNSUPPORTEDPROTOCOL`); pnpm rewrites it to the real version. A verification that
  packs with npm fails and looks like the code is broken when the packing tool is the
  only thing wrong.
- `@types/*` for a runtime track its MAJOR line, not the API you want. An API added in a
  later minor can be typed only on the NEXT major's line. Taking that newer major's
  types to get one API promises every API of that major to code running on the older
  one: it compiles clean and throws live. Types track the ENGINES FLOOR, never the dev
  machine. Verify a "the types have it" claim by unpacking the tarball and grepping it
  (`npm pack @types/<x>@latest`), never by reading a changelog.
