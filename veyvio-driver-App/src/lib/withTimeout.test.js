import { afterEach, describe, expect, it, vi } from "vitest";
import { withTimeout } from "@/lib/withTimeout";

describe("withTimeout", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the promise result when it settles in time", async () => {
    await expect(withTimeout(Promise.resolve("ok"), 1000, "fallback")).resolves.toBe("ok");
  });

  it("returns the fallback when the promise is slow", async () => {
    vi.useFakeTimers();
    const pending = new Promise(() => {});
    const raced = withTimeout(pending, 100, "fallback");
    await vi.advanceTimersByTimeAsync(100);
    await expect(raced).resolves.toBe("fallback");
  });
});
