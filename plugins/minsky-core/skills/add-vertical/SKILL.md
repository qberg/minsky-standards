---
name: add-vertical
description: Layer-by-layer recipe for adding a new endpoint or feature vertical to a modular monolith on the org stack (domain-types vocab, drizzle schema, oRPC contract, handler, FE consumption), with the stack gotchas at their point of use. Use when adding an endpoint, contract, handler, module, or any feature that spans db to api to ui. Written for executor agents of any size; follow it literally.
---

# Add a vertical slice

One slice = one thin path end-to-end, smoke-tested before the next begins. Bucket
first: `kernel/` = mechanism, zero domain nouns; `shared/` = cross-context domain;
`modules/<ctx>/` = one context's language. Deps flow modules to shared to kernel,
never reverse. Mirror lazily; no empty layers.

Repo specifics (package names, exemplar verticals to copy, the authz law, FE
consumption patterns) live in the repo: read `docs/agents/vertical.md` plus the
CLAUDE.md chain. If the repo lacks the file, locate the best existing vertical as your
exemplar and create the file as you learn.

## Layer walk (in this order)

### 1. Vocab: the shared domain-types package
- Values: `X_VALUES = [...] as const satisfies readonly X[]`, feeding valibot
  `picklist()`.
- Registries: `as const satisfies Record<string, T>`; key arrays ALWAYS derived
  (`Object.keys(Registry) as readonly KeyId[]`), never hand-listed: `satisfies` can't
  force completeness, so a hand-list silently drops new entries from picklists.
- FSM transitions: `Record<Status, readonly Status[]> satisfies`.
- FE/BE/DB all import from here; never redeclare an enum elsewhere.

### 2. Schema: the database package
Register the module's schema namespace; follow the db-change skill for
generate/migrate/downstream. Invariants (CHECK/FK/NOT NULL) live in schema; domain
status columns wrap domain-types values, never free text.

### 3. Contract: the api-contract package
- **No wildcard export.** A new subpath import needs an explicit `exports` entry in
  the contract package's package.json BEFORE any consumer imports it, else
  module-not-found.
- GET with no args: **OMIT `.input()` entirely.** Never `v.void()` (OpenAPIHandler
  injects `{}`, breaking documented GET; the RPC path works so tests miss it). Never
  `object({})`. Optional GET args = `.input(object({ x: optional(...) }))` = query
  params.
- Path param: the `path` template key binds to the SAME input key name.
- Bulk action = AIP-235 batch: `POST /res/batch-delete` `{ids}` returns
  `{results:[{id,status}]}`; partial success is contract, not error; one SQL
  `IN(ids) RETURNING`, no `Promise.all` fan-out.
- valibot: NAMED object schemas; a `.check(pred)` callback arg typed as
  `InferOutput<typeof Schema>` (an inline/narrowed arg trips TS2769 under
  `exactOptionalPropertyTypes`). Export types via `InferOutput<typeof X>`.
- Assemble flat contract keys; NO audience namespaces. Audience = which base
  procedure (step 4), not a router branch.

### 4. Handler: the api app
- Handler file mirrors the contract key; register in the router under the SAME flat
  key.
- Pick the base procedure by audience (public / staff-authed / citizen-authed); base
  procedures own auth, never the handler.
- Handler shape: permission check, command/query call, `isErr(result)` to a mapped
  domain error, else map row to resource. Runtime errors = `Result<T,E>`; programmer
  errors = `throw`.
- Authz laws: ownership is not eligibility; read-scope is not write-scope; thread the
  scope sentinel through EVERY helper; zero-scope compiles to `sql\`false\``;
  out-of-scope read = 404. Compose the repo's existing scope-gates and capability
  registry; NEVER hand-roll a check or query grant tables from a handler. A new
  grantable capability lands in the capability registry FIRST (mapped types force the
  UI/summary layers). Name the verb honestly: a gate that outgrew its name gets a
  sibling permission, never a silent widening. The repo's full authz law lives in its
  CLAUDE.md; read it before writing the gate.
- Async side-effects: stage the outbox job in the same transaction.

### 5. FE consumption
Per the repo's `docs/agents/vertical.md`: typically a per-entity query factory over
the typed client with optimistic mutation rollback on the SPA, and a cookie-forwarding
server client on the RSC app. Strings on citizen-facing surfaces go through the i18n
skill. Flow state = FSM, never boolean soup; derive during render; effects only for
external systems.

## Verify

Scoped typecheck of every touched package (domain-types, contract, api, FE), scoped
lint, the repo's architecture check, every error path tested. Full cadence and flake
handling = the verify-package skill. End with an honest AC status; follow the repo's
commit policy.
