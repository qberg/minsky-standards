import {
  type AnyStateMachine,
  type EventObject,
  type StateValueFrom,
  transition,
} from "xstate";

// Stateless oracle: standalone `transition` + `resolveState`, no interpreter. NOT the
// `.transition` method (wants an actorScope) nor `getNextSnapshot` (deprecated).
// null = illegal edge; sound only while the machine has ZERO self-loops, since a
// legal self-loop would land on the same state value and read as a refusal.
export function assertTransition<M extends AnyStateMachine>(
  machine: M,
  from: StateValueFrom<M>,
  event: EventObject
): StateValueFrom<M> | null {
  const widened: AnyStateMachine = machine;
  const snapshot = widened.resolveState({ value: from, context: undefined });
  const [next] = transition(widened, snapshot, event);
  const to = next.value as StateValueFrom<M>;
  return to === from ? null : to;
}

export const isLegalTransition = <M extends AnyStateMachine>(
  machine: M,
  from: StateValueFrom<M>,
  event: EventObject
): boolean => assertTransition(machine, from, event) !== null;
