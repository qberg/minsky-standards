# minsky-standards

Org-wide engineering standards for all Minsky projects: a Claude Code plugin
marketplace plus (soon) the handbook, pattern catalog, and shared config packages.

Rule: this repo grows only by reviewed promotion. A pattern or skill must prove itself
in a real project first; it lands here through a PR, and downstream repos consume it
through the marketplace instead of keeping copies. Copy-drift is the disease this repo
exists to kill (exhibit A: three diverged copies of ship-issue across apm, crm-fametn,
petition-management).

## Contents

- `plugins/minsky-core`: the only plugin so far.
  - Skill `wrap`: session closing ceremony (NOTES.md, debts, gotchas, ADRs, handback).
  - Skill `ship-issue`: issue-to-closed orchestration spine (7 phases: orient with gate
    baseline, vertical riskiest-first slices, gated build, live checkpoints,
    delegate-then-audit, fresh-context adversarial review, honest ship + runbook +
    build-notes entry). Merged 2026-08-22 from the diverged apm/crm-fametn/
    petition-management copies; repo specifics (gate command, commit policy, hazards)
    are read from each repo's CLAUDE.md and docs/agents/, never hard-coded.
  - Skill `verify-package`: no-NEW-errors method, cross-package guards, flake
    protocol. Repo data (command tables, guard tables, flake lists) lives in each
    repo's `docs/agents/verify.md`, never in the skill.
  - Skill `watch-it-work`: cross-process live verification, one correlation id across
    N process logs. Repo specifics in `docs/agents/watch-it-work-reference.md`.
  - Skill `harden-slice`: multi-agent adversarial hardening loop for a built slice
    (evidence + seam review fan-out, judge, contract rebuild, full-diff audit, doc
    reconciliation, honest AC close).
  - Hook `wrap-nag`: Stop reminder when code changed 3h+ after the last wrap.
- `plugins/minsky-web`: design-system and web-surface law, for repos consuming the
  tribune DS. Skill `tribune-component`: two-gate DS authoring (API proposal, token
  map with frame-is-anatomy-not-a-ruler HITL, 3-tier tokens, cva/data-attrs). Org DS
  doctrine: ONE tribune library owns mechanics; a client brand = a token set, never a
  fork.
- `plugins/minsky-vendored`: 20 third-party skills vendored byte-identical
  (pruned 2026-08-22: dropped diagnosing-bugs, to-spec, to-tickets, implement,
  prototype, code-review, e2e-testing-patterns, ubiquitous-language as duplicates or
  superseded by minsky-core skills)
  (mattpocock/skills, vercel-labs/agent-skills, fallow-rs, feature-sliced, wshobson,
  kunchenguid/lavish-axi). `UPSTREAMS.md` maps each skill to its source for re-sync:
  diff upstream, re-vendor, bump version. The per-repo `skills-lock.json` sync flow is
  RETIRED 2026-08-22; this marketplace is the only distribution channel.
- Planned, gated on review of the pattern catalog draft (lives in
  petition-management `docs/minsky-standards-draft/` until approved): handbook,
  pattern pages, minsky-web and minsky-backend plugins, @minsky config packages,
  Copier template.

## Use in a repo

```
/plugin marketplace add /home/qberg/projects/minsky/minsky-standards
/plugin install minsky-core@minsky
```
