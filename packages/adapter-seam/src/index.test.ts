import { afterEach, describe, expect, it, vi } from "vitest";
import { resetAdapterWarnings, resolveAdapter } from "./index.js";

afterEach(() => {
  resetAdapterWarnings();
  vi.restoreAllMocks();
});

const seam = (name: string, credsPresent: boolean, isProduction: boolean) =>
  resolveAdapter({
    seam: name,
    credsPresent,
    isProduction,
    real: () => "real" as const,
    fake: () => "fake" as const,
  });

const spyOnWarning = () =>
  vi.spyOn(process, "emitWarning").mockImplementation(() => {
    return;
  });

describe("resolveAdapter", () => {
  it("takes the real adapter when creds are present", () => {
    expect(seam("search", true, true)).toBe("real");
  });

  it("refuses the fake in production", () => {
    expect(() => seam("storage", false, true)).toThrow(
      /refusing the fake fallback/
    );
  });

  it("falls back to the fake outside production", () => {
    const warn = spyOnWarning();
    expect(seam("stt", false, false)).toBe("fake");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      "[stt] required credentials unset, using the fake",
      "AdapterFallback"
    );
  });

  it("warns once per seam across repeated calls", () => {
    const warn = spyOnWarning();
    seam("mail", false, false);
    seam("mail", false, false);
    seam("mail", false, false);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("warns again after resetAdapterWarnings", () => {
    const warn = spyOnWarning();
    seam("mail", false, false);
    resetAdapterWarnings();
    seam("mail", false, false);
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
