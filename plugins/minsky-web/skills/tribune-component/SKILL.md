---
name: tribune-component
description: Build a new tribune design-system component, or adopt a raw one to the org standard. Drives the two-gate workflow (API proposal, then token map, then build, then Figma parity), enforces 3-tier tokens, cva-for-variants/data-attrs-for-state, and the no-raw-color rule. Use when the user says "new tribune component", "build the X component", "adopt X", "formalize X", or a feature needs a DS primitive that doesn't exist yet.
---

# tribune-component

Spine for taking a design-system component from "needed" to "adopted", pixel-faithful
to the design source and uniform with the rest of the system. Claude already knows
React, base-ui, and CSS; this skill encodes only the non-obvious process that keeps a
component honest. Defaults, not rails.

Org DS law: tribune is ONE library owning mechanics (behavior, a11y, anatomy);
brands/products are token sets over it. Never fork components per brand; a client
brand = primitive palette + semantic aliases + radius/type/motion tokens.

Repo pointers: the repo's DS authoring ADR is the authority (in petition-management:
`docs/adr/0038-tribune-component-authoring.md`, always-on invariants in
`packages/tribune/CLAUDE.md`, adoption ledger in that ADR). Read them before Gate 1.

Argument: the component name, and whether it is **new** or an **adoption** of an
existing raw copy. If absent, ask.

## Prime directive: the design source is truth, never extrapolate silently

Never eyeball or infer a design value. Every color, dimension, duration, and easing
either comes from an authoritative declared source, or is **explicitly marked
`@extrapolated` and approved**. A magic number with no marker is a bug.

**The frame is anatomy, not a ruler.** A Figma frame (PNG/PDF/render) tells you which
part is which and which variable each references: read that. It is NOT a value
source: reading a color or measurement off a render IS eyeballing (and off a
screenshot of our own app, circular). Division of labor: **you own the slots**
(enumerate each token a part needs, propose the name, leave the value blank
`<FIGMA: ___>`); **the human owns the values** (Figma Dev Mode readout, Variables
API / token export, or typed). You map *part to existing named token*, never *pixel
to value*. Given only an image with no inspectable values, emit the blank slot map
and BLOCK for Dev Mode.

## The two gates

Both gates are cheap artifacts posted to the user inline. Do not write CSS before
Gate 2 is approved.

### Gate 1: API proposal

Research first, then propose. The proposal is one block:

- **Primitive**: which `@base-ui/react` primitive this wraps (or "none: leaf").
  **Wrapping a primitive makes the context7 base-ui lookup BLOCKING:** read its live
  parts, props, and `data-*` state attrs before proposing, and let them drive the
  prop surface. Guessing base-ui shape is the failure mode this gate exists to kill.
  Leaf = skip; no research tax.
- **Surveyed**: 2-3 reference APIs by name (shadcn / Radix Themes / Ark / MUI / Base
  UI) and the one idea taken from each. Use context7 MCP for live docs. **Compound
  (2+ parts): consult the vercel-composition-patterns skill first** (compound /
  context / render-slot patterns are the hard part); vercel-react-best-practices for
  hook and perf shape. Leaf: optional.
- **Prop surface**: the props and the variant **axes** (intent / size / variant /
  boolean). Mark which are author-selected (cva) vs runtime state (data-attrs).
- **Shape**: compound (`Object.assign` root + parts) iff 2+ consumer-arranged
  structural parts; flat for a leaf. No mode-swapping booleans; children over
  `renderX`.

STOP. Human approves the shape.

### Gate 2: Token map

Draw the full variant-by-state grid. Every cell resolves the chain and is tagged.
Template: `references/token-map-template.md`. Shape:

```
COMPONENT: <name> | variant=<v> | Figma frame: <node-id / page>
STATE      COMPONENT TOKEN      -> SEMANTIC           -> PRIMITIVE    VALUE   SRC
default    --x-bg               --tbn-x-bg             --color-...   oklch   OK figma:F-..
hover      --x-bg-hover         --tbn-x-bg-hover       --color-...   oklch   ~ EXTRAPOLATED
focus-ring --x-ring             --tbn-x-focus-ring     (.../0.4)     oklch   X MISSING
DIMENSIONS: h / px / radius / gap          (each OK / ~ / X)
MOTION:     duration / easing / press-transform (each OK / ~ / X)
SRC: OK figma-confirmed | ~ extrapolated (needs OK) | X missing (BLOCK)
```

Rules for the map:
- **You fill the slots, the human fills the values.** Enumerate every token slot,
  propose the token name, leave the value column blank. The human reads each value
  from Dev Mode and fills it in. An ASCII anatomy diagram with numbered slots makes
  the shared picture concrete.
- Enumerate the **full grid**: every variant against every state the API claims. An
  empty cell is caught here, not in prod. Do not skip `disabled`.
- `X missing` **blocks**: ask the human for the value.
- `~ extrapolated` is allowed only with a rationale and becomes an `@extrapolated`
  marker in the CSS. Explicit approval for each.

STOP. Human reads it against the design frame and resolves every `~` and `X`.

## Build

Write the component to the repo's DS authoring ADR. **Exemplar = `button.css`** (full
token chain + `@apply` discipline). Do NOT anchor on `card.css`: it is the
minimal-consumer case (no `@layer base`, references shared tokens directly) and
copying it drops the per-component aliasing. Checklist:

- **Tokens, 3 tiers.** A per-component `@layer base { :root, [data-theme="light"] }`
  block aliases EVERY token the rules use into a `--tbn-<cmp>-*` semantic (pointing
  at a system token or primitive), exactly like
  `--tbn-btn-primary-bg: var(--color-brand-500)`. Rules then reference only
  `--tbn-<cmp>-*` (or the local `--<cmp>-*` remap tier); never a foreign `--tbn-*`
  raw. Local `--<cmp>-*` tier only if stateful or multi-variant remap (JIT). Approved
  extrapolated values carry `/* @extrapolated(state): reason, pending HITL */`.
- **No raw literals in component rules.** `oklch`/hex only in the `@layer base`
  block.
- **cva** iff 1+ multi-value axis; else `cn()`. Variant -> className -> CSS.
- **State via data-attrs** from the primitive (`[data-disabled]`, `[data-state=...]`),
  never minted classes.
- **CSS:** `@apply` for static utilities; raw property only for `var()`-backed
  declarations, transitions, rings.
- `import "./<name>.css"` in the `.tsx` (un-imported CSS is dead, silently).
- Add the `exports` entry in the package.json (no barrel).
- Write `<name>.stories.tsx` covering every variant-by-state cell from the map.

Run the tribune token lint (`pnpm -F @pm/tribune check:tokens`); it mechanically
enforces the color rules. Fix before proceeding.

## Definition of done

- Token lint clean; typecheck clean.
- Hand the human the Storybook story URL plus the variant/state list; they eyeball
  parity against the design frame. They are the parity oracle; do not screenshot.
- Update the adoption ledger in the repo's DS ADR: `adopted`, or `debt` with the
  remaining `@extrapolated` markers noted.

## Alternate surface families

A repo may define surface families with their own token prefix and laws (in
petition-management: the marketing family, `--mkt-<cmp>-*`, rem-discipline, gradients
as token pairs; authority ADR-0060/0027). Same workflow, same gates; the repo's DS
docs list the family's deltas. A family's components must not be consumed by other
surfaces; note it in the story description.

## Adoption mode (raw copy)

Same workflow, but Gate 1 starts from the existing API: survey whether it already
matches references, propose the delta. Common failures in raw copies: raw `oklch()`
in component rules, minted state classNames instead of data-attrs, missing
`@layer base` token block, no story.
