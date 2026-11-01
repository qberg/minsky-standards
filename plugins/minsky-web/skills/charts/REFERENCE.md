# Charts: reference

## Receipts used below

- `RESULTS.md:<line>` is `experiments/chart-engine/RESULTS.md` in the apm repo, the engine
  experiment run 2026-11-01 (visx 4.0.0 against TanStack Charts 1.1.0, 59 gates, a worked
  example). `arms/...`, `gates/...` are paths inside that experiment.
- `first suite` is petition-management's visx chart suite, hardened 2026-07-07 (a worked
  example): the pitfall was hit and fixed there.
- Vendor paths (`group/esm/Group.js:16`) are inside the installed package at the version named.
  Re-read them when visx moves a major; never trust the line from memory.

## The parameter file

`docs/agents/charts.md` in the repo, same convention as `docs/agents/verify.md`. Dated where a
fact can go stale. Slots, each a heading:

| Slot | Holds |
| --- | --- |
| Chart law | where the repo's binding chart rules live (CLAUDE.md section, ADR, ruling) |
| Design package | package name, path, the filter its commands take |
| Chart home | the chart component's folder, its public API, today's marks, what draws them |
| Engine | installed visx packages and versions, or "not yet installed" plus who approves installs |
| Figures above the home | any registry choosing which figure a field or screen gets, and its users |
| Shared helpers | path and symbol for: data projection type and helpers, selection, linked hover or cursor, roving keyboard, token readers (length, time, easing), reduced motion, pointer kind (fine or coarse), screen reader table, skeleton shapes |
| Prop table | the repo's prop name for each concept in "API symmetry" below |
| Tokens | namespace, local alias block, series palette, dim opacity, extrapolated marker, token lint |
| Motion law | its home, spring values, duration and easing tokens, blessed feel decisions |
| Design words | the client's and DS's vetoes and allowances: radius, glow, gradients, skeleton style, flat or shadow |
| Stories and tests | story location and frame, test commands, where tests may run, who writes test files |
| Browser protocol | who drives a browser, how a look is served and recorded |
| Component workflow | the repo's skill or ADR for a new component's API and token gates |
| Ledger | where feel verdicts and failed mechanisms are recorded |
| Formatter and lint | scoped format command, lint limits, commands never to run |
| Known reds | pre-existing failures outside chart scope, dated |

## Anatomy of one chart folder

| File | Role |
| --- | --- |
| `<name>.tsx` | the root: props, wiring, reach, the svg |
| `<name>.css` | rules plus the local token block; imported by the `.tsx` (un-imported CSS is silently dead) |
| `frame.ts` | pure layout math (`buildFrame` and helpers), lookup Maps, no React |
| `<name>.stories.tsx` | stories with play functions |
| extras | a hook per follow-motion (`use-<x>-cursor.ts`), `variants/<look>.tsx` per genuinely different mark render, `<name>-defs.tsx` for SVG defs |

Worked example (first suite): `chart-shell/` holds the frame (Root, Header, Body, Legend,
Stats), skeletons, the tooltip, cross-chart cursor sync, `series.ts` and `interaction.ts`. A
repo whose chart home is one compound component (Root, Bars, Tip, Table) keeps the same split:
geometry in a pure file, the compound parts as the only wiring.

## API symmetry: the concepts

The parameter file maps each concept to the repo's name. Every root that has the concept uses
that one name and shape.

| Concept | What it is |
| --- | --- |
| data | the repo's one data projection, bucketed rows valid on every chart |
| series meta | label and colour per series key, colours as token references |
| key and value formatters | the strings a tip, live region and screen reader table speak |
| hidden | series keys not drawn |
| dimmed key | the key drawn at the dim opacity from outside |
| selected key, its change callback | controlled and uncontrolled selection; the uncontrolled guard is `=== undefined`, so a controlled `null` works |
| datum select | a press on one datum |
| cursor change | an axis chart's scrub position, `key or null` |
| accessible name | the figure's label |
| animate | entrance and morph on or off |
| size | `size` on square charts, `height` on rectangle charts, shared base types |
| variant | one axis per genuinely different mark render; a name never collides with another concept |

## Motion doctrine, in detail

- Two mechanisms by type. One-shots (grow, collapse, wipe, reveal) are CSS keyframes or
  transitions on motion tokens, zero per-frame JS. Follow-motion (a cursor glide, a trace line,
  a brush settling on a snapped bucket) is a spring from the motion library, because a
  retargeted CSS transition restarts from zero velocity and steps on snapped targets.
- `useSpring(number)` does NOT retarget from a changing render value: call `.set(target)` in an
  effect or handler. `.jump()` is instant (keyboard, reduced motion, first show); `.set()`
  retargets the spring. Direct-manipulation drag is `.jump()` 1:1, spring only on release.
- Value morphs on bars animate `transform: scaleY(var(--x))` with `transform-box: fill-box`,
  never `x`, `y`, `width`, `height` transitions (reflow per frame). Exclude motion-driven
  variants from the CSS transform rule so CSS never fights the library's transform.
- Never animate from origin: the first show jumps to place, later changes spring.
- Reduced motion drops movement and keeps the fade; reduced entrance and lit both snap with zero
  mid-way frames (the P4 gate shape, RESULTS.md:20).

## Verification loop

1. Typecheck, token lint and the chart's story tests, scoped, through the quiet gate runner.
2. Paint is not proven by DOM queries. Prove it in browser-mode tests that read
   `getComputedStyle` (fill, background, resolved custom properties, `animation-name`) and
   `getBoundingClientRect` ratios against token values: the experiment's fidelity gate judged
   every checklist item this way (RESULTS.md:27-37, `gates/p9-fidelity.browser.test.tsx`).
3. Motion is proven by sampling frames: count mid-way frames and the last one's time against
   the duration token, and zero mid-way frames under reduced motion (RESULTS.md:20,
   `gates/p4-motion.browser.test.tsx`).
4. Park the real pointer before every mount (`gates/support/mount.tsx` `parkPointer`): the
   mouse persists between tests and lights a freshly mounted chart (RESULTS.md:94, 128).
5. Assert deterministic artefacts (point count, non-empty path `d`, element present), never a
   one-frame attribute such as `[data-entering]`, which races the frame that clears it.
6. Keyboard-driven selection is deterministic; synthetic pointer clicks on svg can be flaky, so
   fall back to the keyboard. Portalled tips are queried from `document.body`.
7. The human's look follows the parameter file's browser protocol; Chromium-only gates leave
   WebKit and Firefox owed, say so.

## Pitfall catalog (symptom, cause, fix, receipt)

**CSS and tokens**

- Animation, shadow or radius silently `none`: a Tailwind v4 `@theme` var with no scanned
  utility use is pruned, and raw `var()` in CSS is invisible to the scanner; keep such token
  blocks `@theme static`. Diagnose with `getPropertyValue('--token')` on `:root`, not grep.
  (first suite)
- Extrapolated markers vanish: a CSS property-sort formatter eats adjacent comments; grep the
  marker after every scoped format run and restore. (first suite)
- `motion-reduce:` utilities kill CSS animations only: transitions need the explicit `@media`
  block, JS springs need the hook. Confirmed: the reduced-motion gate passes only through the
  block (RESULTS.md:118, `arms/visx/visx.css`).
- Geometry from tokens: the old rule "geometry scalars are JS constants, a CSS var is dead for a
  `<rect>`" is WRONG in Chromium. SVG 2 makes `x`, `y`, `width`, `height` CSS properties, so a
  rule may set them from tokens, and a scale range of `[0, 100]` puts geometry in percent of the
  plot (RESULTS.md:54-56, 121, `arms/visx/visx.css` `.cv-whole`, `.cv-quiet`). Where JS must
  have pixels (an axis, a measured box) it reads the token through the repo's reader, never a
  literal. Not verified in WebKit: a WebKit check is owed before a geometry rule ships to Safari
  users, and `r`, `cx`, `cy` were not tested.
- `@visx/axis` ships raw label defaults (`fill: '#222'`, Arial, 10 px). They are presentation
  attributes, so CSS overrides them; every axis gets a rule mapping them to tokens
  (RESULTS.md:57-58, 127, `axis/esm/axis/AxisBottom.js:7-9`).
- Bar thickness: rest width is `rest * min(band, cap)` and lit width is `min(band, cap)`, both
  tokens; `min(band * ratio, cap)` gave the wrong lit width (RESULTS.md:33, 98, 124). Grouped
  bars fill their sub-band; a centring cap on grouped bars separates the pair.

**Motion**

- Entrance animates discretely (no mid-way frame): `@visx/group` `<Group>` always writes
  `transform="translate(0, 0)"`, and a from-only `scaleY(0)` keyframe then interpolates against a
  translate through a non-invertible matrix. Use a plain `<g>` for an animated mark group and
  give a transform keyframe an explicit `to` frame (RESULTS.md:99, 119,
  `group/esm/Group.js:16`).
- End keyframe: the old rule "always omit the `to` frame so state attributes win" is corrected.
  Omit it only when a state attribute styles the SAME property after the animation; keep an
  explicit `to` frame on every transform keyframe and wherever nothing else styles the property,
  because the omitted frame is what made the entrance discrete (RESULTS.md:120).
- Staggered CSS entrance dies after the first mark: the gating attribute flips one frame after
  mount and removing a trigger attribute cancels pending animations; gate staggers on a stable
  root attribute or latch with a `useState` initializer. (first suite)
- Chart re-renders on every mousemove: pixel state in `useState`; use a motion value plus an
  imperative attribute write, and cache `getBoundingClientRect` in a ref refreshed by a
  ResizeObserver and a capture-phase window `scroll` listener. (first suite)
- Morph restarts while scrubbing: an unmemoized derived array gives the motion hook a new
  dependency each render; `useMemo` every array passed to a motion hook. (first suite)
- Entrance lost in development only: a ref written during render under StrictMode's double
  render; latch in a `useState` initializer. (first suite)
- Appear-frame attributes (teleport, first-frame suppression) set in `useLayoutEffect`, never
  `useEffect`: after paint the glide already ran. (first suite)

**Interaction and reach**

- `role="img"` on an svg makes every child presentational, so no mark can be named; a polite
  status region speaking the mark is not a label (RESULTS.md:122, 144-150).
- biome `useSemanticElements` rejects `role="group"` and `role="button"` on svg elements: an svg
  with no slider children omits its role and keeps `aria-label`; a slider host keeps
  `role="group"` with an ignore comment on the exact element bearing the role. (first suite)
- Readout layers painted above interactive marks (cursor line, live dots) need
  `pointer-events: none`, or they eat the press at the spot users aim for. (first suite)
- A deferred emit (`startTransition`) inside a controlled chart defers the chart's own visuals;
  emit synchronously and let the consumer defer its derivation. (first suite)
- Coarse pointers: a press is the pick and there is no hover light; read the repo's pointer
  hook, never `:hover` alone.

**Data and frame math**

- Wrong totals: `.find()` takes the first row per key; filter and sum. Negative values corrupt
  later arc geometry; clamp the contribution to zero, keep the raw value for display. (first
  suite)
- Interaction dead on unbucketed data: a missing bucket became `""`, which is falsy; compare
  `=== undefined`. (first suite)
- A mark found twice: a part equal to its whole got the whole bar's class; pass the mark's kind
  explicitly (RESULTS.md:92).
- d3-sankey throws "circular link" on cycles real data has; break cycles in `frame.ts` before
  layout. (first suite)
- A full-circle `<path A>` whose start equals its end draws nothing; cap a sweep just under 360
  degrees in `frame.ts`. (first suite)
- Composite keys from data strings join with a unit separator, never `-`. Division by zero on
  empty or `[0, 0]` domains; filter rings with `r <= 0`. (first suite)

**Labels and fonts**

- visx thins nothing (`numTicks` is approximate, `axis/lib/types.d.ts:44`): measure each word on
  a canvas, keep it only when it clears the previous label and the plot edge
  (RESULTS.md:84-86, `arms/visx/measure.ts`).
- Measuring before a web font loads collides labels in scripts with wide glyphs (Tamil in the
  worked example); re-measure on `document.fonts` loading events (RESULTS.md:93, 126).
- The first x label sits on the y axis's zero: give the point scale padding
  (`scalePoint().padding(0.5)` in the worked example, RESULTS.md:83-84).

**Library callbacks and overlays**

- An overlay placed from a library's render callback that fires inside a layout effect runs
  before a later sibling's ref attaches; place the overlay before the chart in document order
  (RESULTS.md:95, 129).
- visx `ParentSize` wraps content in `overflow: hidden`; a label outside the plot is clipped.
  (first suite)
- An SVG text helper returns `textAnchor`, never `anchor`: React drops the unknown attribute
  and the label flows right of its x. Verify the rendered attribute in the DOM. (first suite)
