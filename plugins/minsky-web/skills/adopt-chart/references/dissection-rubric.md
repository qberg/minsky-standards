# Dissection rubric: reference source to verdict table

Read the pasted source as a design document with an implementation attached. Score every
distinct piece into one verdict and post the table before proposing anything. Record the source
library and the date in the table heading; verdicts are precedent for the next chart from the
same kit.

## Verdicts

| Verdict | Meaning | Typical candidates |
| --- | --- | --- |
| Steal | Port the idea faithfully onto visx and tokens | interaction choreography, visual tricks, micro-feedback |
| Adopt shape | Keep the API or data seam, replace internals | config records, series shapes that map onto the repo's data projection |
| Steal concept, fix impl | Idea good, implementation flawed | `Math.random` ghost data (make it deterministic), per-render allocation |
| Drop | Library workaround, dead weight, or a design-word veto | the auto-drop list in SKILL.md; anything vetoed below |
| Defer | Real feature, too big for this pass | zoom, pan, export; name it, do not build it |

## Design-word veto (run every Steal through it)

A weaker model steals something premium-looking that breaks a design law. Read the parameter
file's Design words and veto, citing the line, anything it forbids. The questions to ask of
every Steal:

- Is a loading state a directional sweep where the repo's skeleton law says otherwise?
- Does a gradient stroke on a categorical series break colour as series identity?
- Is a glow or bloom filter reserved elsewhere, or a per-frame blur cost on a data screen?
- Do the corners follow the repo's radius rule (sharp in one DS, a radius scale in another)?
- Is a celebration proportional to what the data means?

A veto from the repo's design law is not overridable in the session; a Drop or Defer from taste
or scope is (below).

## Two more lenses before finalising

- **Port fixes only for problems we have.** A reference mechanism often exists to fix its own
  library's defect (a reveal mask so dots do not pop in before the line draws). If our chart
  lacks the defect, the fix is dead weight: Drop, and say why.
- **Domain fit outranks polish.** The best steal encodes meaning in our data, for example a
  dashed last segment mapping onto the always-incomplete current period. Rank steals by what
  they tell the person, then by looks.

## Where the joy lives (look here first)

- Tip behaviour: frosted surfaces, no jump on appear, selected-series dimming, tabular-nums
  value columns.
- Continuity tricks: a dot's fill is a full-width gradient clipped to a circle, so the dot
  matches the line at that x; a shared mask so dots ride an area's reveal.
- Loading states shaped like the content, not spinners.
- Dimming and highlight choreography on hover or legend pick.
- Timing, extracted as intent ("the tip follows in about 90 ms so it feels attached"), then
  mapped to motion tokens; never copied as raw milliseconds.
- Feel parity needs the reference's mechanism: a `useSpring` in the source is velocity
  continuity, ported as a spring, never an easing.

## Worked example (petition-management, evilcharts base wrapper, 2026-07-06)

| Piece | Verdict | Why |
| --- | --- | --- |
| runtime `<style>` injection of per-theme colour vars | Drop | Recharts wants literal colours; visx takes tokens directly |
| runtime throw validating the colour config | Drop | its own type already enforces the shape |
| `[&_.recharts-*]` class wall | Drop | overrides for internals we do not have |
| per-series label and icon config | Adopt shape | maps onto series meta; colours become token references |
| frosted tooltip variant | Steal | token `color-mix` plus `backdrop-filter` |
| empty-span anti-jump hack | Steal concept, fix impl | the principle is never animate from origin; a spring `.jump()` on appear |
| selected tooltip row dims others | Steal | the dimmed attribute plus the repo's dim opacity token |
| payload-config gymnastics | Drop | the data projection removes the need |
| dot gradient-continuity clip plus shared mask id | Steal | the best idea in the file; ports cleanly to visx glyphs |
| random ghost series for loading | Steal concept, fix impl | a ghost chart is good; `Math.random` per call jumps on re-render |

## Verdicts are proposals; the human's fun signal is final

A Drop or Defer from taste or scope may be overridden by the human. When it is, scope the stolen
idea to where it carries meaning (marching ants only on the provisional segment, slowed), record
the override in the table and re-slice the build.

## Adjudication notes

- A clever type guarding a dropped mechanism dies with the mechanism.
- A reference piece that exists only because its library hides internals (positioning,
  colours, payload shapes) usually vanishes in the visx rebuild; check before porting a fix.
- A framework that owns its own tooltip, cursor or token reading is a reference, not an engine:
  its cursor cannot light a sibling figure through the repo's chart home (apm
  `experiments/chart-engine` RESULTS.md:155-157, a worked example).
