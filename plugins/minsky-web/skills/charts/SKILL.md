---
name: charts
description: Operating manual for a repo's visx chart suite inside its design-system chart component (bars, lines, donut, radar, radial bar, sankey, brush, axes and scales): file anatomy, API symmetry, motion doctrine, keyboard and screen reader reach, the verification loop and a pitfall catalog with receipts. Use when adding, changing, reviewing or debugging a chart, a chart axis or scale, chart tooltip or tip, linked hover between charts, chart keyboard reach, chart motion, chart tokens or chart stories. Not for a non-chart design-system component, a data grid or table, or a static image; porting a reference kit's chart is adopt-chart.
---

> Talking to the founder: follow `handbook/working-with-the-founder.md` (For you: first, real options side by side with a pick, core idea then analogy then example then detail, walkthroughs as a named person, friendly and honest).

# Charts

The working manual for building charts the org way. The repo's own chart law (named in its
parameter file) outranks this skill where they conflict; fix whichever is stale in the same
change. Deep detail, the parameter file's shape and every pitfall with its receipt:
[REFERENCE.md](REFERENCE.md).

## Repo parameters come first

Repo specifics live in the repo, not here: read `docs/agents/charts.md` before anything else.
It names the design package and its path, the chart component's home and public API, the
installed visx packages, the shared helpers (data projection, keyboard, token readers, reduced
motion, pointer kind, linked hover), the token namespace and palette, the motion law's home and
its spring values, the client's design words (radius, glow, gradients, skeletons), where stories
and tests live and who runs them, the feel-gate ledger, and known pre-existing reds.

If the repo lacks that file, STOP and say so. Offer to draft it from the shape in REFERENCE.md
("The parameter file"), filled from the repo's real paths; build nothing until it exists, because
every rule below is written against its slots.

## The engine and the one home

- **visx 4 is the drawing engine** (receipt: apm `experiments/chart-engine`, RESULTS.md "Verdict
  after the cold review", 2026-11-01, a worked example). visx low-level primitives only:
  `@visx/scale`, `@visx/shape`, `@visx/axis`, `@visx/group`, `@visx/grid`, `@visx/responsive`.
  A charting framework that owns its own tooltip, cursor or token reading opens a second home and
  is a design reference only (shadcn charts, Tremor, evilcharts, Recharts kits: adopt-chart).
- **The repo's chart component is the one home for hover, tip, keyboard and motion.** A feature
  never imports visx; it hands data to the chart component. Linked hover between two figures
  runs through the chart component's own lit or cursor context, never a second controller.
  Why: the cold review failed the rival engine precisely because its cursor and tooltip could not
  light a sibling figure through the repo's context (RESULTS.md:155-157).

## Laws

1. **Shared vocabulary first.** Data helpers, interaction hooks, keyboard and token readers are
   the parameter file's "Shared helpers" rows. Never re-implement one per chart; a behaviour two
   charts need is extracted there and adopted by both in the same change.
2. **API symmetry.** The same concept carries the same prop name and shape on every chart root.
   The concept list is REFERENCE.md "API symmetry"; the repo's names for them are the parameter
   file's prop table. Check it before naming anything; never invent a second name.
3. **Layout math is pure.** One `frame.ts` per chart: no React, no DOM, more than four inputs
   become an options object, lookup `Map`s built once inside it, never `data.find` in a render
   loop, and its call is always wrapped in `useMemo`.
4. **Motion doctrine.** Springs from the repo's motion library, never a hand-rolled rAF tween.
   Data-truth morphs are critically damped; overshoot only on entrances. Per-frame pixel state
   (cursor, drag, tip, morph) is a motion value writing SVG attributes or CSS variables
   imperatively, never React state per frame. Every JS motion gates on the repo's reduced-motion
   hook, and every CSS transition has an explicit `@media (prefers-reduced-motion: reduce)` block
   (confirmed, RESULTS.md:118). One-shots (grow, wipe, fade) are CSS on motion tokens. Values
   (springs, durations) live in the repo's motion law, named in the parameter file.
5. **Tokens only.** No raw colour, length or duration in a rule; local aliases in the
   component's base block; an unconfirmed value carries the repo's extrapolated marker. Geometry
   may be set from tokens in CSS (SVG 2 geometry properties), so a geometry scalar is a token or
   a token read through the repo's reader, never a bare JS literal (REFERENCE.md pitfalls,
   "Geometry from tokens").
6. **Data robustness.** Aggregate duplicate keys (sum), never first-match. Handle empty data, a
   single datum, all zero, negatives, a missing bucket (compare `=== undefined`, never
   truthiness) and cycles where the form allows them. A mark's kind is passed explicitly, never
   derived from value equality (RESULTS.md:92).
7. **Reach.** Every pressable mark is an element with its own accessible name (`role="button"`,
   `aria-label`, `aria-pressed` where it picks), reached through ONE Tab stop with a roving index
   over arrows and Home and End, using the repo's roving helper. A continuous axis readout with no
   pressable marks is one focusable svg `role="group"` with arrow scrub and a polite live region.
   Never `role="img"` on an svg with interactive children; a live region is not a replacement for
   a name (RESULTS.md:122, 144-150). Keep the screen reader table, formatted by the chart's own
   value formatter.
8. **Labels survive every script.** visx thins no tick labels and measures nothing: the chart
   measures words after web fonts load, keeps a label only when it clears the last one and the
   plot edge, and overrides `@visx/axis` raw label defaults in CSS (RESULTS.md:126-127).

## Workflow for any chart change

1. Read the parameter file, the target chart's folder whole, and every shared helper it uses.
2. Make the change inside the laws; read the REFERENCE.md pitfalls for the area you touch (CSS
   and tokens, motion, interaction, frame math, labels, tests each have known traps).
3. Verify with the parameter file's commands, through the repo's quiet gate runner. Paint is
   proven by browser-mode tests reading computed style and measured boxes, never by DOM presence
   (REFERENCE.md "Verification loop"); park the pointer before each mount.
4. **Feel gate.** Any perceptible motion or visual change stops for the human named in the
   parameter file, through the repo's browser protocol; never self-bless craft, never batch two
   feel changes into one look. Record the verdict in the parameter file's ledger.
5. New behaviour gets one story with a play function asserting it, keyboard-driven first.

## New chart form

Run the repo's component authoring workflow (parameter file, "Component workflow") with two
additions at its API gate: the prop surface aligned to law 2, and the data mapping stated
explicitly (which field of the repo's data projection is which axis). Add the chart's loading
shape where the chart home keeps skeletons, and wire the package export the repo requires.
Porting a reference kit's chart: adopt-chart first, then this skill's laws for the build.
