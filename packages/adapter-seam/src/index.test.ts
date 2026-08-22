import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveAdapter } from "./index";

const nodeEnv = process.env.NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = nodeEnv;
  vi.restoreAllMocks();
});

const seam = (name: string, credsPresent: boolean) =>
  resolveAdapter({
    seam: name,
    credsPresent,
    real: () => "real" as const,
    fake: () => "fake" as const,
  });

describe("resolveAdapter", () => {
  it("takes the real adapter when creds are present", () => {
    process.env.NODE_ENV = "production";
    expect(seam("search", true)).toBe("real");
  });

  it("refuses the Fake in production", () => {
    process.env.NODE_ENV = "production";
    expect(() => seam("storage", false)).toThrow(/refusing the Fake fallback/);
  });

  it("falls back to the Fake outside production", () => {
    process.env.NODE_ENV = "development";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {
      return;
    });
    expect(seam("stt", false)).toBe("fake");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("warns once per seam", () => {
    process.env.NODE_ENV = "test";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {
      return;
    });
    seam("mail", false);
    seam("mail", false);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
