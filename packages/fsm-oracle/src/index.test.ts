import { createMachine } from "xstate";
import { describe, expect, it } from "vitest";
import { assertTransition, isLegalTransition } from "./index.js";

const machine = createMachine({
  id: "review",
  initial: "draft",
  states: {
    draft: { on: { SUBMIT: "submitted" } },
    submitted: { on: { APPROVE: "approved", REJECT: "draft" } },
    approved: {},
  },
});

describe("assertTransition", () => {
  it("returns the next state value on a legal edge", () => {
    expect(assertTransition(machine, "draft", { type: "SUBMIT" })).toBe(
      "submitted"
    );
  });

  it("returns null on an illegal edge", () => {
    expect(assertTransition(machine, "draft", { type: "APPROVE" })).toBeNull();
  });

  it("returns null from a terminal state", () => {
    expect(assertTransition(machine, "approved", { type: "SUBMIT" })).toBeNull();
  });

  it("returns null for an event the machine never declares", () => {
    expect(assertTransition(machine, "draft", { type: "NOPE" })).toBeNull();
  });

  it("follows an edge back to an earlier state", () => {
    expect(assertTransition(machine, "submitted", { type: "REJECT" })).toBe(
      "draft"
    );
  });

  it("answers legality as a boolean", () => {
    expect(isLegalTransition(machine, "submitted", { type: "APPROVE" })).toBe(
      true
    );
    expect(isLegalTransition(machine, "submitted", { type: "SUBMIT" })).toBe(
      false
    );
  });
});
