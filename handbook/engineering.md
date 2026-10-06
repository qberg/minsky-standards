# Minsky engineering law

Org-wide, binding for every agent and human on every Minsky project. Loaded into
agent context via each repo's CLAUDE.md (`@../minsky-standards/handbook/engineering.md`).
Change only by PR to minsky-standards. Repo-specific law stays in the repo's own
CLAUDE.md; nothing here names a product.

## Evidence law

A mechanism claim is READ, never inferred. "Why does it behave this way" about
anything we don't own (framework, library, browser, vendor API) is a lookup, not a
deduction. Plausible-and-wrong reads exactly like plausible-and-right.

- Lookup order, stopping at the first that answers: (1) `node_modules/<pkg>` docs and
  installed source, version-exact; (2) docs MCPs (context7); (3) the web, last, via
  the exa MCP. MCP tools are deferred: a brief that wants them must name them, or the
  agent silently falls back to plain web search (research skill holds the recipe).
- Cite the receipt where the claim lives: doc title, `docs: <path>`, `ADR-00xx`, or
  URL. A future reader must be able to re-check without re-deriving.
- Say which register you are in: verified (I read X) vs inferred (I reasoned) must be
  visibly different in every writeup. Uniform confidence across both is the tell that
  something is wrong.
- A third register exists: UNVERIFIABLE BY READING (typically whether two documented
  features compose). Stop reading, design a gated experiment, keep it as the
  regression check for that exact claim.
- Green is not correct. Passing tests/types/lint validate the thing you built, never
  the diagnosis you built it from. A wrong theory ships green.
- Reported bug = run the diagnosis skill, even when phrased as a question. A
  reproduction outranks any amount of code-reading.
- Auth, session, or private-data behaviour: verify twice, then cold review by a
  fresh-context agent briefed to refute. A confident wrong story here costs real
  people their privacy.
- Own the conflict: if a standing preference blocks the empirical path, say so and
  ask; never silently substitute theory for the experiment you were denied.
- A predecessor project is a PER-DECISION CHECKLIST, never a layout reference. Before
  any mechanism decision (env, logging, health, shutdown, auth storage, rate limits,
  outbox, jobs, timeouts, boundaries, error mapping), read every decision record on
  that subject in the reference, then write yours as SAME (cite it) or DIVERGE (say
  why, with a receipt). A decision carrying neither is a defect. Re-grill rather than
  copy blindly means read it and argue with it, never skip it.
- A STRUCTURAL read is not delegable to a summary. When mirroring or diverging from a
  reference codebase's LAYOUT, read the tree and the files yourself, or brief the scout
  to PRINT the tree and QUOTE whole files rather than describe them. A summary of a
  structure is a claim about a structure and it fails the way every relayed claim
  fails. Proven in apm 2026-09-09: an accurate one-line summary of the reference's
  module shape put the drizzle table in the wrong file, and the layout built on it was
  legal, so no lint would have caught it.

## Quality bar

Product bar = Notion / Linear / native iOS. A punt such a product wouldn't ship is a
compromise, not sequencing. Phasing scope is fine; phasing quality never is.

- No-MVP language: "MVP" / "v1" / "start simple, refactor later" are banned framings
  for architectural decisions. Thin-first behind the real interface is fine;
  throwaway is not. If a slice boundary would force a future rewrite, move the
  boundary; don't take the debt.
- Build it right now: no deferring pattern decisions to issue/feature lines. A
  deferral needs a real blocker (missing infra, unbuilt dependency, human gate),
  never "out of this issue's scope". We own the whole stack.
- Design the whole, build thin. "A layer exists only when the first real slice needs it"
  is about empty directories and scaffolding, never about design: a shape two features
  will share is decided across both before either is built, and a feature designed
  alone against its own issue is local optimisation. Copied code between features is
  the symptom, so it is answered with the shared mechanism, never a rename. Proven in
  apm 2026-09-27 (founder's word, "elegance across all the features"): the act seam
  was retrofitted onto fifteen hand-rolled commands, and a second sign-in pool copied
  the first pool's audit, ceiling and boundary files.
- Beauty is a correctness signal. Architecture optimizes elegance, full type-safety,
  declarative extension: single-source-of-truth registries + mapped types so
  completeness is compiler-enforced; no scattered switch; zero `any` (parse `unknown`
  at boundaries). Call out warts honestly; fix to the elegant fixpoint before
  claiming done. No sycophancy, no rubber-stamping.
- Design values are HITL, never eyeballed. Every spacing/size/color/type/radius on a
  design-covered surface traces to a spec or a token. The frame is anatomy, never a
  ruler.
- Never self-bless craft. Motion/joy/visual work ends in "feel-gate owed", surfaced
  for a human check. Extrapolated, untested, or skipped = flagged explicitly. Honest
  status over false green.
- Each product surface gets a named tier with a named bar; none undefined. The tier
  table lives in the repo's CLAUDE.md.
- Cadence: non-trivial slices open with an architecture proposal, not code. On
  ambiguity, stop and ask ONE crisp question; never guess. Authority chain: direct
  client word > finalized design > ADR > issue text; when a higher authority
  overrides, reconcile the docs.

## Elegance and delight, defined

Founder's word (apm #298, 2026-10-01): "elegance" and "delight" were words each agent filled in
for itself, so they are defined here once, as things that can be counted or tested. A design is
elegant when the next one to extend it, human or agent, cannot get it wrong; it is a delight when
the person using it never waits, never gets lost, and never loses their place. The make-the-case
skill scores every design on these rows; a foundation block (a shape many features will use) is
scored by a gated experiment whose pass marks are written before its first line of design code.
The metrics were first proven, as copies, in apm `experiments/forms-answer-elegance` and
`experiments/reference-elegance`; this section is now their one home.

Developer, a human or an agent extending the code:

| # | Name | Counted | Pass |
| --- | --- | --- | --- |
| D1 | One step | files and lines touched to add the next instance (a list, a field, an act) | one declaration plus its use |
| D2 | Cannot forget | of the rules a new instance must follow, how many a compile error or a gate catches | every one (a probe per rule) |
| D3 | One home | rules written in more than one place | zero |
| D4 | Few words | new named concepts a reader must learn | the fewest that pass D1 to D3 |
| D5 | Change cost | files and lines touched for each realistic later change | the lowest among the designs compared |
| D6 | Errors teach | a failing compile or gate message names the fix | every probe's message does |

Agent, the same code read by a model with a limited window:

| # | Name | Counted | Pass |
| --- | --- | --- | --- |
| A1 | Findable | grepping the noun finds its one home | the first hit |
| A2 | Small to read | context needed to make one change | under the repo's builder budget |
| A3 | Self-describing | the registry row says everything an extension needs, with no prose to read | yes or no |

End user, one named person on a phone and a desktop:

| # | Name | Measured | Pass |
| --- | --- | --- | --- |
| U1 | Instant | p95 from a press to visible feedback; from another person's change to this screen | under 100 ms local; a remote budget stated per surface |
| U2 | Never lost | every error and empty state has a named message and a next step | the repo's error UX law, enumerated per surface |
| U3 | Keeps their place | a refresh never drops typed text, focus, scroll, or a highlighted row without a visible reason | a gated test per surface |
| U4 | Same bar everywhere | phone and desktop judged side by side | the founder's feel-gate |
| U5 | Calm | motion within the repo's motion law; nothing flashes on a refresh | the founder's feel-gate |

## Writing law

- No em-dashes, no emojis, no decorative punctuation, in repo files, commits, docs,
  and UI copy.
- Plain straightforward English everywhere. UI copy must survive a low-English-fluency
  reader: short sentences, common words, no idioms, no marketing-speak. Simple source
  English also translates faithfully.
- Comments: one line max, only for a crucial non-obvious WHY, receipt included when
  it's a mechanism claim. Readability comes from code shape, never comment blocks.
- Never shorten or flatten a source-language string to make a translation fit.
  Overflow in a locale is that locale's copy/register problem, fixed in the TMS with
  a native speaker. Ellipsis is a failure floor, never the fix.

## Knowledge law (the information ladder)

Every fact has exactly one home; it lands there the moment it's born.

- Org law: this handbook. Project law: the repo CLAUDE.md (lean, domain + pointers).
- Decisions + rationale: `docs/adr/`, append-only, superseded not edited. A decision
  living only in a conversation does not exist.
- ADR coherence (the four rules):
  1. Change = a new ADR or a dated amendment line, and the link is written on BOTH
     records (`amends` here, `amended_by` there). Machine-readable frontmatter
     (`status, resolves, amends, amended_by, supersedes, superseded_by, terms`); a
     lint fails the commit when a link has one end.
  2. ADRs reference registries and glossary terms by name and never restate their
     values. Enum values, states, tiers, kinds have one home: the context glossary
     until code exists, then the domain-types `as const` registry.
  3. Code outranks prose, so a change that moves a registry or contract carries its
     ADR amendment in the same change, with the reason. Contradicting an ADR
     silently is a defect; contradicting it with a written amendment is the process.
  4. Every map or epic close runs a refuting coherence audit (scouts by cluster,
     file:line findings, fixes as amendments). The wrap skill holds the recipe.
- Work items and status: the issue tracker. Owed work: `docs/agents/debts.md`.
- Procedures: skills (the minsky marketplace). Mechanical rules: hooks/lint; a rule
  worth stating twice is worth a hook. Enforcement outranks documentation.
- Proven traps: `docs/agents/gotchas/`. State of play: `docs/agents/NOTES.md`,
  updated at session end (the wrap skill), pruned same-day when things ship.
- Third-party mechanism facts are never stored, always looked up. One exception: a PINNED copy of
  a vendor's own docs, stored beside the skill that reads it, when an audit must read the same
  text every run. It carries the upstream commit, the date taken, the version it matches and a
  refresh rule, and it is the vendor's words verbatim, never our summary of them. Proven in apm
  2026-09-25: the craft skill's final audit reads six react.dev pages pinned to a commit in
  `react-docs/`, refreshed when React moves a major.
- Shared code promotion bar: a mechanism becomes an @minsky-org package only after
  proving its shape in production in at least one repo. Until then it lives in its
  project. Once packaged, projects diverge via config seams and semver pinning, never
  by editing package source per project; a true divergence is a loud, ADR-recorded
  eject. Where that code is going is `handbook/framework-charter.md`; a mechanism is a
  promotion CANDIDATE only when three signals hold (two contexts, a proof that can fail,
  a survived refutation), recorded as the ADR frontmatter field
  `promotion: candidate | promoted` with the receipts in the body.
- A package is not published until every path in its `exports` map has been imported
  under plain node, in a gate that runs on the BUILT artefact. A repo's own test run
  cannot catch a broken emit by construction: the test runner, the dev server and the
  bundler all resolve module specifiers more forgivingly than node does, so the
  artefact can be unloadable while every gate in its own repo is green.
- Code outranks every doc on current behavior. A note contradicting the observable is
  stale; fix the note.

## Code invariants (org-wide)

- Cyclomatic complexity <= 5 per function; extract named helpers.
- Every error path has a test. All errors handled explicitly: runtime errors =
  `Result<T,E>`, programmer errors = throw; no swallowed failures.
- No `any`; `unknown` + narrowing at boundaries. No shadow variables, no unused code,
  no duplicated logic (extract, name, reuse).
- Registry key arrays are DERIVED, never hand-listed.
- No ternaries inside JSX: hoist branches to named consts or early returns; `&&`
  presence-rendering is fine. (Deliberate override of the vercel skill's
  ternary-over-`&&` rule.)
- FSM over scattered booleans. Derive state during render; effects only for external
  systems. Pure functions preferred; max 4 params, else a params object.
- Run the formatter; no manual style debates. Hard line length 100.
- The vercel-react-best-practices and vercel-composition-patterns skills are binding
  on all React work (minus the ternary override above).

## Process law

- Vertical tracer-bullet slices, riskiest first, a live checkpoint per slice.
  Never build a horizontal layer in isolation.
- A SLICE MAY SPAN SESSIONS; A LAYER MAY NOT SHIP ALONE (user word, apm 2026-09-22). The two
  are different: a slice is unfinished until its live checkpoint passes, so a session boundary
  inside it is a pause, and only a layer declared DONE with no checkpoint is the forbidden
  thing. Cut the boundary where the CONTEXT changes, not where the layers do: an agent whose
  window is full of transaction seams and registries builds a worse surface than a fresh one
  that opens with the craft skill loaded. The handoff document is the conversation between
  those sessions, and the next session is named in it, including which skill it loads first.
  A slice built this way is still ONE slice: one checkpoint, one review, one entry in the
  build notes.
- Shared branch, concurrent agents: never `git commit --amend`, never repo-wide
  `git stash`, stage explicit paths, verify HEAD before any history op. Format only
  the paths you touched.
- Default commit policy: the user owns commits; hand back a grouped, gate-green tree.
  A repo may opt into agent-committing in its CLAUDE.md.
- Delegate labor, keep judgment: mechanical work to cheap models with exact briefs;
  audit the whole diff after any subagent; distrust subagent provenance claims,
  believe `git status`.
- Subagents run in WAVES, never a flood: at most four concurrent, the next wave only after
  the previous one reports, and two writers never share a file. Ten parallel agents exhaust
  the session budget before the work lands (user word, apm 2026-09-12). Enforced, not hoped for: a
  PreToolUse hook on the Agent tool refuses the launch when the SubagentStart/Stop ledger
  shows the wave full (minsky-core plugin `agent-wave.sh`, promoted from apm's repo script
  2026-09-20, cap overridable per repo via `MINSKY_WAVE_MAX`).
- Sessions close with the wrap ceremony (wrap skill): NOTES, debts, gotchas, ADR
  check, handback.
