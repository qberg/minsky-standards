# Minsky framework charter

Where this org's shared code is going, written down once so every wrap can ask the same
question. Org-wide. Born 2026-09-11 from apm #100, the day ADR-0069 and ADR-0070 landed.
Change only by PR to minsky-standards.

## The niche

An opinionated way to build a TypeScript modular monolith on the org stack (Hono and
oRPC, drizzle and Postgres, better-auth, valibot, xstate, Valkey), with the laws
enforced by lints and the mechanisms proven by gated experiments. The neighbours are
AdonisJS, NestJS, Encore and Redwood: the framework layer. Effect is not the neighbour;
it is an effect system, a runtime, and apm ADR-0069 records why the org does not build
or adopt one. A user of this framework could use Effect inside it.

## The thesis

Wrong code does not compile, wrong process does not pass the hook, and every mechanism
ships with the experiment that proves it. Every team putting agents on a codebase has
the "green but wrong" problem; nobody ships the structural answer to it. Evidence from
one day in apm: a transaction bridge written with the ADR in hand shipped green with a
rollback bug until a gate per failure shape caught it; the arch-lint caught a real
bypass on its first run; a branded type turned a silent production bug into a type
error; a research pass overstated two claims toward the answer its briefer wanted and
only a refutation pass found them. The framework's promise is that each of those is
caught by a machine, not by a reviewer's eyes.

## The differentiator nobody else ships

Every mechanism carries three things:

- **Law**: an ADR with receipts, written as SAME or DIVERGE against the standards
  bodies and the predecessor repo (engineering handbook, evidence law).
- **Proof**: a gated experiment or a test verified by mutation, kept as the regression
  check for that exact claim (apm gates G10, E3c, E5b are the shape).
- **Enforcement**: a self-proving lint, a wall rule, a brand, or a hook. "Review" is not
  an enforcement (apm ADR-0070).

Docs are the ADRs and the experiments rendered, never a second set of prose that drifts.

## The public surface is a catalogue of kinds

Each kind has one silhouette: a naming rule, a signature rule, an enforcement. A
developer or an agent who has seen one instance of a kind writes the next without docs,
and the lint refuses anything off-shape. The table lives in apm ADR-0070 until a second
consumer forces it here: client factory, ambient mechanism, port and adapter, registry,
policy, boundary parse, repo, command, error map. A kind not in the table cannot be
written; adding a row is an amendment.

## The only path in: the promotion bar

Nothing is designed for the framework. A mechanism is built for the product that needs
it, and it becomes framework only by crossing the existing promotion bar (engineering
handbook, knowledge law): proven in production in one repo, generalised only when a
second consumer diverges through a config seam. Building the framework before a product
is how frameworks die; the bar is the guard.

### The three signals that make a candidate

A mechanism is a promotion candidate only when all three hold, each mechanically
checkable, so pattern-hunting is a ledger and never a feeling:

1. **Two contexts** use it (one use is a feature, two is a shape).
2. **A proof** exists: a gated experiment or a mutation-verified test that can fail.
3. **A refutation was survived**: a fresh-context review found a defect and the fix
   landed with its gate. The hardening history is the value.

The record is the ADR frontmatter field `promotion: candidate | promoted`, set only
when the ADR body names all three signals with their receipts. A repo's ADR lint lists
candidates (`node scripts/adr-lint.mjs --candidates` in apm). The wrap skill asks at
every session close which mechanism crossed all three that day.

### Candidates today (2026-09-11)

| Mechanism | Home | Signals |
| --- | --- | --- |
| `Result<T, E>` | `@minsky-org/result` (promoted) | first consumer apm |
| adapter seam | `@minsky-org/adapter-seam` (promoted) | first consumer apm |
| ambient unit of work | apm `kernel/db/unit-of-work.ts`, ADR-0065 | auth and audit; 19 gates; five defects found and fixed by review |
| env parse | apm `@apm/env` | api and worker; sync test | 
| health dependency classes | apm `kernel/health`, ADR-0063 | api and worker; readiness tests |
| self-proving arch-lint | apm `scripts/arch-lint.mjs`, ADR-0068 and ADR-0070 | five rules; each proves itself; caught a bypass |
| retry policy | not built; first consumer apm #102 | |

Second consumer named: petition-management, or the desk repo. Nothing generalises
without one.

## What not to build

- A runtime or scheduler. ADR-0069 fact 1 is what one recreates.
- A `utils` package. Shared code moves up at its second consumer into the narrowest
  home, never down from a package waiting for one.
- Docs that are not the ADRs and experiments rendered.
- Anything for the framework that no product needs this week.

## Amendments
