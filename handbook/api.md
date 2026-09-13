# Minsky API law

Org-wide, binding for every agent and human on every Minsky project. Loaded into agent
context via each repo's CLAUDE.md. Change only by PR to minsky-standards.

This file grows one chapter at a time, and a chapter is written when the first real
decision needs it, never ahead of it. Chapter 1 is errors and validation failures,
written for apm #100, which is the first slice with a browser-facing boundary.

## 0. Posture: the guidelines are a checklist, not a rulebook

Four bodies have already argued most of this out. None of them is our authority, and
none of them fits our stack whole.

- **RFC 9457, Problem Details for HTTP APIs.** The only normative standard here, and the
  narrowest. Read it for the envelope and for what it deliberately refuses to decide.
- **Google AIP** (`aip.dev`). Proto-first and resource-oriented, so most of it has no
  target on an oRPC stack. Read the reasoning, never the shape. AIP-193 is the one that
  matters for errors; AIP-235 is already our batch law.
- **Zalando RESTful API Guidelines.** REST and JSON native, so structurally the closest,
  but written for a public partner estate with uncoordinated consumers.
- **Microsoft REST API Guidelines** (classic, now deprecated in favour of the Azure and
  Graph documents; all three disagree, and the disagreements are informative).

The rule is the one the engineering handbook already applies to a predecessor repo.
Before an API-shaped decision, read what these say on the subject, then write ours as
SAME (cite it) or DIVERGE (say why, with a receipt). A decision carrying neither is a
defect.

## 1. Chapter one: errors and validation failures

### 1.1 The failure record

Every rejected request carries a list of violations. A violation is four fields and
nothing else.

    { code, path, params, devMessage }

- **`code`** is the machine identifier. It is ours, never a third party's. See 1.2.
- **`path`** locates the offending field as an ARRAY OF SEGMENTS, never a joined string.
  See 1.3.
- **`params`** carries the values the user-facing sentence needs, so that a bound such as
  a minimum length has one home. See 1.4.
- **`devMessage`** is one English sentence for an engineer reading a log. It is never
  localized and never shown to a user. See 1.4.

There is no user-facing sentence on the wire. The sentence is rendered at the surface
that displays it, from `code` plus `params`. See 1.4.

Four bodies independently converged on a violation record with a machine identifier, a
location, and human text as separable parts: RFC 9457 (`type`, `pointer` in its
validation example, `title`/`detail`), Google (`FieldViolation.reason`, `.field`,
`.description`, `.localized_message`), Microsoft (`code`, `target`, `message`),
JSON:API (`code`, `source.pointer`, `title`/`detail`), GitHub (`code` required,
`resource`/`field`/`index`, `message` optional), Shopify (`code` enum, `field` as a
segment list, `message`). Convergence that broad is not taste.

### 1.2 Machine codes

- Codes are a CLOSED registry, declared `as const satisfies` in the project's
  domain-types package, with the key array derived and never hand-listed.
- Format is `UPPER_SNAKE_CASE`, at most 63 characters, matching `[A-Z][A-Z0-9_]+[A-Z0-9]`
  (SAME as AIP-193's `ErrorInfo.reason` rule; adopted for the regex, not for the proto).
- The top-level vocabulary stays SMALL. Microsoft's figure is about twenty, with the rule
  that every client must handle all of them. Specificity that not every client needs goes
  in a nested channel, never in the top-level set.
- ADDING A TOP-LEVEL CODE A CLIENT CAN SEE IS A BREAKING CHANGE. Adding one in the nested
  channel is free. SAME as Microsoft, whose `innererror` exists precisely for this, and
  as Azure's `x-ms-error-code`, which is documented as unchangeable contract.
- Codes are never a third party's identifiers. A validation library's check names, a
  vendor's decline codes and a database's constraint names are all translated into our
  registry at the boundary, once, with a total mapping that has an explicit fallback arm.
  Passing a foreign identifier through publishes a contract made of somebody else's
  internal names, which then changes on their release schedule with no test of ours
  failing. This is AIP-215's rule about referring to another API by a name you control,
  applied to a different medium; cite it as reasoning, never as authority.

### 1.3 Location is a segment array

    "path": ["applicant", "documents", 0, "name"]

Not `"applicant.documents.0.name"`, and not the RFC 6901 pointer
`"/applicant/documents/0/name"`.

DIVERGE from RFC 9457's validation example and from JSON:API, both of which use a JSON
Pointer. Four receipts:

1. A joined string is lossy and the loss is demonstrable. A JSON object key may contain
   the delimiter. Proven against valibot 1.4.2 on 2026-09-09: a schema with a key
   literally named `a.b` containing `c`, beside a key `a` containing `b.c`, produces one
   merged key `a.b.c` carrying both messages, unattributable to either field. A key that
   is the empty string loses its location entirely, because the dot path is falsy.
2. RFC 6901 fixes the delimiter problem with escaping (`~0` for `~`, `~1` for `/`) that
   must be decoded in that order, and the RFC warns implementers about the order because
   they get it wrong. So a pointer is a segment array wrapped in an encoding the receiver
   must immediately unwrap.
3. A pointer cannot distinguish an array index from a string key without resolving
   against the document. TanStack Form's source says so and walks the live value to
   recover it. A JSON array keeps the distinction for free.
4. The two dominant form libraries want different joined syntax (`items.0.name` versus
   `items[0].name`), so shipping a pre-joined string picks a side and is wrong for the
   other. A segment array is the only form both consume.

A pointer string may be added later as a derived, optional, clearly secondary field if a
consumer outside our own client ever needs one. The array is canonical because the
derivation runs that way and not the other.

`path` is an empty array for a cross-field or whole-request violation. No sentinel
string: a sentinel can collide with a real field name and an empty array cannot.

### 1.4 Human text: three audiences, never one string

- **`devMessage`**: one English sentence, for an engineer reading a log. SHOULD NOT be
  localized. SAME as Microsoft, whose reason is worth restating: localizing it makes the
  value unreadable to the developer logging it and unsearchable on the internet.
- **The user's sentence** is rendered at the presentation layer from `code` plus `params`,
  against a copy catalogue keyed by code, with a per-locale entry. It is never on the
  wire. The catalogue is compile-enforced: a code missing a locale's copy fails the build.
- **`params`** is what makes that possible. Any value the sentence needs travels as data,
  never interpolated into a string the client then has to parse. SAME as Microsoft
  (`minLength: 6` beside the code so the client can "present the server's constraints to
  the user within the client's own localized messaging") and SAME as Google, whose
  AIP-193 requires dynamic values in `metadata` "so that machine actors do not need to
  parse error messages to extract information".

Why the sentence cannot be the contract, stated once so no slice re-argues it: RFC 9457
§3.1.4 says consumers SHOULD NOT parse `detail`; Azure says every field other than the
code is diagnostics and not contract; Stripe lists error messages among the opaque
strings it may change in a backward-compatible release. A vendor that promises message
stability can never improve its copy.

A surface that renders copy for a user owns that copy. A server-rendered surface such as
an email does the same lookup against the same catalogue with the recipient's stored
locale.

### 1.5 What never crosses a boundary

Absolute, and each one has cost somebody a real incident somewhere.

- **The offending value.** Not the field that failed, not any sibling field, not the
  containing object. See 1.6: this is the default behaviour of at least one stack we
  ship on, so it must be closed deliberately rather than assumed absent.
- **Validation-library internals.** Issue objects, `expected`, `received`, schema
  fragments and library English all describe our schema's shape to an attacker and are
  not our copy.
- **Stack traces and implementation detail.** SAME as Zalando rule 177 and RFC 9457 §5.
- **A browser-generated message.** Native constraint validation produces strings
  localized by the BROWSER's UI language, not by our catalogue. On a product that owns
  its copy in more than one language this is a defect, not a fallback.

### 1.6 Parse at the boundary

- Untrusted input is `unknown` and becomes typed only by parsing, never by casting. The
  parse returns a `Result`; the typed value is unreachable without going through it.
- The parse helper produces OUR violation record. A validation library's issues are read
  and discarded inside it; they never become the failure value and never reach a caller.
- Every framework seam that performs validation on our behalf is audited for what it puts
  on the wire by default, and the finding is gated. A framework that ships raw issues is
  not a hypothetical: oRPC 1.15.0 does exactly that, proven in apm on 2026-09-09, where a
  failed check on an email field returned the submitted password in the 400 body because
  a valibot path item carries the whole containing object. The gate that proves it stays
  as the regression check.

### 1.7 The envelope: we decline `application/problem+json`

DIVERGE from RFC 9457 as a wire format, and from Zalando rule 176 which mandates it.
We take its principles and not its media type. Receipts:

1. It has no machine code member at all, which is the one thing 1.1 is built on.
2. It standardises no field-level validation shape. Its `errors` array is described in the
   RFC's own prose as belonging to a "fictional problem type", and RFC 7807's equivalent
   example used an incompatible shape, so implementations that followed the older example
   are now out of step with the newer one. Neither was ever normative.
3. The working group considered and declined a standard validation member; the recorded
   blocker was that adding one would require a new media type and fragment the ecosystem.
4. Extension members sit flat in the same namespace as the standard members, with no
   scoping and, per a co-author on the record, no mechanism to detect a collision.
5. Its IANA registry explicitly refuses application-specific and deployment-specific
   values, so the network effect it was meant to create is unavailable to us.
6. The media type has a measured toolchain cost: generated clients that send it as their
   only `Accept` value receive 415 from servers that answer `application/json`.
7. On our own stack it is largely inexpressible. oRPC's RPC handler has no error-body
   encoder, and its fetch adapter deletes any content type we set and writes
   `application/json` unconditionally.

What we keep from it: the discipline that the identifier is the contract, that consumers
must ignore extensions they do not recognise, and that the human sentence is not to be
parsed.

### 1.8 Status codes

- Use the most specific status the situation warrants. SAME as Zalando rule 220.
- A request that fails validation is a 400. We do not distinguish 422; the extra status
  carries no information our code field does not already carry, and clients handle it
  inconsistently. SAME as Zalando.
- Partial success in a batch is 200 with a per-item result array, never 207. SAME as the
  existing AIP-235 batch law in the stack file, DIVERGE from Zalando rule 152, because
  207 is a WebDAV code that fetch clients and middleware treat as an oddity and our batch
  shape already carries per-item status.

### 1.9 Enforcement

- The code registry, its regex, and the completeness of the copy catalogue are compiler
  enforced, not reviewed by eye.
- Every project consuming this chapter carries one gate proving that a validation failure
  response contains no submitted value. A rule worth stating twice is worth a hook, and
  this one is worth a running test.
- Every project whose API sits in front of a third-party auth or validation library carries
  one gate proving that no identifier or sentence authored by that library reaches a client,
  run against the library's own registry rather than a copied list so a dependency upgrade
  fails the gate.

## Amendments

- 2026-09-13, 1.9 gains a third enforcement line, the vocabulary gate, beside the value-leak
  one. Reason: 1.2 already said codes are ours and never a third party's, and 1.5 already
  banned library English, but neither was enforced, so apm shipped better-auth's
  `INVALID_EMAIL_OR_PASSWORD` and its English to the browser for three slices with every gate
  green. Proven in apm on 2026-09-13 (#100, ADR-0066): the translation is a closed registry
  plus one boundary step that REBUILDS the error rather than editing it, and the gate reads
  the library's live registry (`auth.$ERROR_CODES`) rather than a copied list, which is the
  part that makes an upgrade fail loudly. Two findings from building it that the wording is
  chosen to catch: a short-circuit that passed an error through when its code was already one
  of ours leaked the library's English, because two of our codes are spelled like two of
  theirs; and a refusal raised before any endpoint never reaches an after hook at all, so a
  project needs a second catch at its composition root or the gate is passed by a path it
  never sees.
