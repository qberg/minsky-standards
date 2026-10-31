# Minsky stack law: the frontend

One chapter of `stack.md`, split out 2026-10-31 so a repo loads it by path (apm's context round,
founder's word). Org-wide; receipts in the source repos' ADRs.

## Proven gotchas

- Tailwind v4: off-scale utilities need arbitrary syntax (`z-[45]`, not `z-45`,
  which is silently ignored). Non-color token blocks in `@theme` need
  `@theme static` or v4 prunes unscanned vars.
- `useEffectEvent` is stable (React 19.2); never in dependency arrays. External-store
  subscriptions (matchMedia/online/storage) = `useSyncExternalStore`, never
  useState + effect. Heavy client libs = dynamic import at the leaf.
- Lingui: import macros directly from `@lingui/*/macro` at the call site; a re-export
  silently breaks extraction. Whole sentences per `<Trans>`, never fragments.
- TanStack Router form-encodes every search codec's output via URLSearchParams
  (router-core qss), so the wire query is percent-escaped for ANY codec; judge
  codecs on wire length and decoded-display readability, never raw-wire looks.
- Lenient URL codecs (jsurl2: `parse("(broken~")` = `{broken:true}`, no throw) slip
  junk OBJECTS past TR's keep-raw-string catch; every URL-sourced valibot key wraps
  `v.fallback`, never bare `v.optional` (route-errors on a bad link).
