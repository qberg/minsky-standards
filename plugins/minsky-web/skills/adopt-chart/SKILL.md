---
name: adopt-chart
description: Adopt a chart from a reference kit (evilcharts, shadcn charts, Tremor, any Recharts-based kit) into the repo's visx chart suite by stealing its interaction design and rebuilding it on the repo's chart component, or build a chart form the suite lacks on the same rails. Use when the user pastes reference chart source, names one of those kits, or asks to port, adopt or bring premium chart interactions into the suite. Not for adopting a non-chart component (use the repo's component workflow), nor for data grid or table work.
---

> Talking to the founder: follow `handbook/working-with-the-founder.md` (For you: first, real options side by side with a pick, core idea then analogy then example then detail, walkthroughs as a named person, friendly and honest).

# Adopt a chart

You are the decision-maker: your output is verdicts, gates, specs and audits. Delegate labour
through the repo's helper roster and audit the whole result yourself; a helper's passing checks
are not the bar, the checklist below is.

Works for both an upgrade of an existing chart and a net-new form. Same workflow; the one fork
is the API gate (a delta against the whole API).

## Repo parameters come first

Read `docs/agents/charts.md` (the parameter file the charts skill defines). If the repo lacks
it, STOP and say so; offer to draft it from the charts skill's REFERENCE.md. Then read the
charts skill itself: its laws are the contract the port must land inside.

## Laws

- **Steal interaction design, never code.** The reference source is a design document. The
  build is visx primitives inside the repo's chart component, the repo's data projection, its
  palette and tokens. The engine is visx 4 (receipt: apm `experiments/chart-engine`, RESULTS.md
  "Verdict after the cold review", 2026-11-01, a worked example), and the chart component is the
  one home for hover, tip, keyboard and motion: a stolen tooltip or cursor is rebuilt there,
  never carried in beside it.
- **Read the reference's animation logic literally before building.** Trace which STATE each
  frame describes. In Recharts, `shape` (`isActive` false) is the resting state and `activeBar`
  (`isActive` true) the hovered state; `initial` and `animate` keyed on `isActive` give both. In
  the API gate, restate resting, hovered and entering states in words before any code. Worked
  example (first visx suite, petition-management): a monospace bar animates to collapsed when
  NOT active, so it is thin at rest and widens on hover, the opposite of "collapse siblings on
  hover"; getting it backwards cost a full rebuild.
- **Auto-drop list** (Recharts and shadcn noise, dropped without debate): runtime `<style>`
  injection or `dangerouslySetInnerHTML` CSS, per-theme colour arrays (tokens handle themes),
  `[&_.recharts-*]` class overrides, payload-shape gymnastics, runtime validation of
  type-enforced shapes, `Math.random()` in render.
- **Upgrade in place beats a new component.** A sibling already covering the form is extended,
  its export paths kept, and the API gate is a delta. A net-new form gets its own folder on the
  same spine (data projection, chart home frame, tokens, `frame.ts`, `variants/` only for truly
  different mark renders).
- **Classify by data model, not visual family.** Radial bars (independent magnitudes, never
  summed) and a donut (part-to-whole slices) look alike and are different forms. When the data
  model IS a sibling's, steal that sibling's whole mechanism rather than new geometry. A
  geometry-only axis (full or semi sweep) is a `frame.ts` parameter, not a variant.
- **Reuse before minting.** Grep the repo's semantic tokens and motion tokens (parameter file,
  Tokens and Motion law) before any new token; dim opacity and snap durations usually exist.
- **Motion split by type** (charts skill, motion doctrine): one-shots are CSS on tokens,
  follow-motion is a spring with `.set()` in an effect. Port the reference's MECHANISM, not its
  values: a `useSpring` in the source is a physics choice, never approximated with an easing.
- **Reach is ours to add.** These kits ship no keyboard model and no names. The port carries
  named marks with one roving Tab stop, or scrub plus a live region on a continuous axis, and
  `aria-valuetext` on sliders, budgeted from the API gate (charts skill, law 7).
- **Recharts compound is an artefact, default flat.** A pasted chart, series, grid and legend
  tree is compound only because Recharts composes through children. Mirror the repo's chart
  home: flat where its siblings are flat, its own compound parts where they are compound; never
  a second compound vocabulary. Mirror the closest sibling's prop names (parameter file, Prop
  table) before naming anything.
- **Design words are the repo's.** Radius, glow, gradient strokes, skeleton style and shadow
  allowances come from the parameter file's Design words, never from this skill or from the
  reference. The first visx suite banned rounded corners; apm's client word keeps corners on its
  radius scale (RESULTS.md:125, a worked example), so a veto that is one DS's brand law is a
  parameter, not org law.

## Workflow

1. **Recon.** Existing target: re-read its `.tsx` and `.css` for the exact current features
   (the delta). Net-new: read the closest sibling and the shared helpers as the pattern. Map
   the suite once (components, CSS, tokens, stories, consumers). Check `git status` first: the
   suite may hold uncommitted work, so audit by reading files, not diffs.
2. **Dissect.** Post a verdict table: each piece of the source as Steal, Adopt shape, Steal
   concept fix impl, Drop or Defer, one line why. See
   [dissection-rubric.md](references/dissection-rubric.md).
3. **API gate.** Run the repo's component workflow (parameter file). Delta or whole API; for a
   net-new form state the data mapping explicitly (which projection field is which axis) so
   existing helpers reuse verbatim. Wait for approval where the repo's founder rules make it a
   one-way door; otherwise state the pick and proceed on it.
4. **Token gate.** The full variant by state grid. Every new value is marked extrapolated with
   its reason (the reference's value and our adjustment) and listed for the human's yes.
5. **Spec and delegate.** Write the build spec (below). Parallelise only on disjoint file sets;
   builders never run the story suite (parallel runs collide), the orchestrator runs it once.
6. **Audit personally, then hand the look over.** Read every changed file. Run the checklist
   below and fix small defects yourself. The browser belongs to whoever the parameter file's
   browser protocol names: serve the look, then post per story what to look for and the risky
   bit no test can see (a seam, a glow's softness, motion feel). Where the protocol lets you
   measure, trust measured DOM and computed style over position math.
7. **Feel iteration.** Green proves correctness, never feel. When feel feedback lands,
   diagnose the mechanism first (transition retarget against spring, layout thrash, a render
   per frame), then values. Two delegated motion attempts failing means build it yourself.
8. **Done** = gates green, the ledger row added or updated (failed mechanisms recorded
   honestly), the look served with the exact stories named, debts flagged.

## The build spec contains

- Mandatory reads: the parameter file, the repo's chart law, the target files, the shared
  helpers, every consumer.
- Exact CSS: local alias additions, rule-by-rule changes, single-line extrapolated markers.
- Exact TS API with types, minding `exactOptionalPropertyTypes` (conditional spread, never
  `{x: undefined}`) and `noUncheckedIndexedAccess`.
- Consumer migration rule: preserve exactly the information shown today; if unmappable, STOP
  and report, never invent an escape hatch.
- Stories for every new variant by state cell, framed the way the parameter file's Stories row
  says (a bare chart floating alone reads unfinished and has been rejected on sight).
- The verify commands from the parameter file, with the known reds named so a stranger's file
  failing a whole-package lint is not mistaken for yours, and never fixed by you.
- Shared-file edits (the chart home's skeleton registry, the package export map) are the
  orchestrator's, done before delegating; the builder gets a disjoint file set and is told
  those files are done.
- Gradient opacity without literals: `stop-opacity` cannot take `var()`, but
  `style={{ stopOpacity: "var(--x)" }}` can, and the edge stop is `calc(var(--x) * 0.4)`.
- Geometry from tokens: CSS on SVG 2 geometry properties, or the repo's token reader where JS
  needs pixels; never a bare JS literal (charts REFERENCE.md, "Geometry from tokens").
- Refactor before piling variants on: split geometry into `frame.ts`, a tooltip anchor into its
  own file and each look into `variants/<x>.tsx` as a behaviour-preserving pass, stories green
  before and after.
- Guardrails verbatim from the parameter file's Formatter and lint row; no commits unless the
  repo's commit policy says the agent commits.

## Audit checklist (each item has burned a build)

- [ ] Appear-frame attributes set in `useLayoutEffect`, not `useEffect`.
- [ ] Every new literal grepped against the semantic tier; an existing token replaces it.
- [ ] Extrapolated markers survived the formatter.
- [ ] Transitions scoped to their state attribute; override rules win by source order.
- [ ] Consumer migrations lost no information; deviations reported and recorded.
- [ ] Pre-existing failures identified by `git log` on the file, left alone.
- [ ] Never animated from origin; reduced motion drops movement and keeps the fade, with the
      explicit `@media` block on every transition.
- [ ] Follow-motion is a spring, not a retargeted CSS transition.
- [ ] Readout layers above interactive marks carry `pointer-events: none`.
- [ ] Keyframe end frames: a transform keyframe has an explicit `to` frame; the `to` frame is
      omitted only where a state attribute styles the same property after the animation
      (RESULTS.md:99, 120; the old "always omit" rule made a visx entrance discrete).
- [ ] No `<Group>` on an animated mark group; a plain `<g>` (RESULTS.md:99).
- [ ] No `role="img"` on an svg with interactive children; biome's svg role rules handled on
      the exact element bearing the role.
- [ ] Every pressable mark has its own accessible name; a live region is never the only name.
- [ ] Axis labels: raw `@visx/axis` defaults overridden in CSS, labels thinned by measurement
      after fonts load (RESULTS.md:126-127).
- [ ] Browser tests park the pointer before mount and assert no one-frame attribute.
- [ ] Helper claims about sibling files verified against the file, not the report.
- [ ] Nothing clipped by `ParentSize`'s `overflow: hidden`; a risk a builder flagged and shipped
      is still a defect.
- [ ] Controlled charts emit synchronously; the consumer defers its own derivation.
- [ ] Hit zones cover the full interactive strip, not the visible mark's height.
- [ ] A reference that imports a part you were not given (a brush): ask for that source before
      designing its feel.
- [ ] SVG text helpers return `textAnchor`; verified in the DOM.
- [ ] A full-circle arc is capped just under 360 degrees; tested with a datum at the maximum.
- [ ] A rolling number's taller box shares a baseline context with its text siblings.
- [ ] A story meta with decorators is annotated `const meta: Meta<typeof X>`, not `satisfies`
      (TS2742).
- [ ] Variants with their own readout suppress the shared tip; data variants keep it.
- [ ] A 3D or isometric look is demoed with few wide bars, depth read from per-face opacity.
