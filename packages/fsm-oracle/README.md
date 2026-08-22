# @minsky/fsm-oracle

Ask an xstate machine "is this edge legal, and where does it land" without spawning an
actor. The machine is the single source of truth for a lifecycle; every guard, every
permission check, every UI affordance asks it the same way.

```ts
import { assertTransition } from "@minsky/fsm-oracle";

const next = assertTransition(orderMachine, current, { type: "SHIP" });
if (next === null) {
  return err("illegal transition");
}
```

## Soundness condition

`null` means "the state value did not change". That is equivalent to "illegal" only if
the machine has **zero self-loops**. A machine with a legal self-loop needs a different
oracle, because a legal edge would report as a refusal.
