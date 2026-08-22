import { describe, expect, it } from "vitest";
import { err, isErr, isOk, ok, type Result } from "./index";

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
