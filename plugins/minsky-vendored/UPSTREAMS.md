# Upstream map

Vendored 2026-08-22, byte-identical at vendor time. Re-sync = diff against upstream, re-vendor here, bump version. Never re-add to a per-repo skills-lock.

Some skills have since been edited locally. A re-sync silently reverts every one of them, so each edit is listed under Local divergences below and must be re-applied or consciously dropped after re-vendoring. An edit that is not listed there does not survive the next sync.

| Skill | Upstream | Path |
| --- | --- | --- |
| codebase-design | mattpocock/skills | skills/engineering/codebase-design/SKILL.md |
| diagnose | mattpocock/skills | skills/engineering/diagnose/SKILL.md |
| fallow | fallow-rs/fallow-skills | fallow/skills/fallow/SKILL.md |
| feature-sliced-design | feature-sliced/skills | feature-sliced-design/SKILL.md |
| handoff | mattpocock/skills | skills/productivity/handoff/SKILL.md |
| improve-codebase-architecture | mattpocock/skills | skills/engineering/improve-codebase-architecture/SKILL.md |
| lavish | kunchenguid/lavish-axi | skills/lavish/SKILL.md |
| research | mattpocock/skills | skills/engineering/research/SKILL.md |
| tdd | mattpocock/skills | skills/engineering/tdd/SKILL.md |
| to-spec | mattpocock/skills | skills/engineering/to-spec/SKILL.md |
| to-tickets | mattpocock/skills | skills/engineering/to-tickets/SKILL.md |
| triage | mattpocock/skills | skills/engineering/triage/SKILL.md |
| vercel-composition-patterns | vercel-labs/agent-skills | skills/composition-patterns/SKILL.md |
| vercel-react-best-practices | vercel-labs/agent-skills | skills/react-best-practices/SKILL.md |
| writing-great-skills | mattpocock/skills | skills/productivity/writing-great-skills/SKILL.md |
| zoom-out | mattpocock/skills | skills/engineering/zoom-out/SKILL.md |
| grilling | mattpocock/skills | skills/engineering/grilling/SKILL.md |
| grill-with-docs | mattpocock/skills | skills/engineering/grill-with-docs/SKILL.md |
| domain-modeling | mattpocock/skills | skills/engineering/domain-modeling/SKILL.md |
| wayfinder | mattpocock/skills | skills/productivity/wayfinder/SKILL.md |

## Local divergences

| Skill | Commit | Change | Why |
| --- | --- | --- | --- |
| wayfinder | 117109b | Research findings commit to the current working branch, never a `research/<name>` branch | Single shared-branch law; a findings file on a side branch is invisible to the sessions that need it |
| wayfinder | 59b4d56 | Session-born artifacts (enumerations, tables, matrices, option sets) are stored whole in the resolution comment or a committed file, never compressed to counts; pointers are only written after opening the target | Petition map #227: 31 iterated use cases were recorded as "31 across 9 categories" and lost with the transcript, while two downstream tickets told builders to read a spec that did not exist |
| grilling | (pending) | Binding "Scenario-first framing" section: every question in fixed order scenario (named person, one day, screen, next action) -> intuition -> rule -> receipts (cited, verified vs inferred) -> architecture -> rejected options -> recommendation; options table never first; review batches = one story per decision item, mechanical items folded | apm maps #7 and #47: bare option tables stalled the user; scenario-first questions resolved tickets in one pass |
| wayfinder | (pending) | Grilling ticket type points at the grilling skill's scenario-first framing | Same as grilling row; keeps the two skills in step |
| research | (pending) | Binding "Tooling" section: MCP tools are deferred and must be named in the brief and loaded via ToolSearch; ordered recipe installed source -> context7 -> exa code context -> exa search and fetch; each citation names its tool; binding "Token budget" section: cheap model for scouts, highlights over full fetches, 3-4 subjects per ticket, stop at first answering source | apm forms map #23..#25: three research agents used plain WebSearch because no brief named exa or context7, so the handbook's lookup order was never applied |
