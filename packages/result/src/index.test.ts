import { describe, expect, expectTypeOf, it } from "vitest";
import { err, isErr, isOk, ok, type Result } from "./index.js";

describe("result", () => {
  it("tags a success", () => {
    expect(ok(1)).toEqual({ _tag: "Ok", value: 1 });
  });

  it("tags a failure", () => {
    expect(err("boom")).toEqual({ _tag: "Err", error: "boom" });
  });

  it("narrows through isOk", () => {
    const result: Result<number, string> = ok(2);
    if (!isOk(result)) {
      throw new Error("expected Ok");
    }
    expect(result.value).toBe(2);
  });

  it("narrows through isErr", () => {
    const result: Result<number, string> = err("nope");
    if (!isErr(result)) {
      throw new Error("expected Err");
    }
    expect(result.error).toBe("nope");
  });

  it("keeps the two tags disjoint", () => {
    expect(isOk(err("x"))).toBe(false);
    expect(isErr(ok("x"))).toBe(false);
  });
});

// A generic join over Result, the shape every consumer's combinator will have.
const andThen = <T, U, E, F>(r: Result<T, E>, f: (t: T) => Result<U, F>): Result<U, E | F> =>
  isErr(r) ? r : f(r.value);

type Boom = { readonly _tag: "boom" };

describe("constructor error-type defaults", () => {
  it("keeps the same runtime objects", () => {
    expect(ok(1)).toEqual({ _tag: "Ok", value: 1 });
    expect(err("x")).toEqual({ _tag: "Err", error: "x" });
  });

  it("infers never, not unknown, for a bare ok() inside a join", () => {
    const joined = andThen(ok("a"), () => ok(1));
    expectTypeOf(joined).toEqualTypeOf<Result<number, never>>();
    expectTypeOf(joined).not.toEqualTypeOf<Result<number, unknown>>();
  });

  it("carries the failing step's error type through a join", () => {
    const joined = andThen(ok("a"), (): Result<number, Boom> => err({ _tag: "boom" }));
    expectTypeOf(joined).toEqualTypeOf<Result<number, Boom>>();
  });
});
