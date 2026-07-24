import { describe, expect, it } from "vitest";

describe("production config guard", () => {
  it("rejects mock and bypass flags in production builds", () => {
    if (!import.meta.env.PROD) return;
    expect(import.meta.env.VITE_USE_MOCK_API).not.toBe("true");
    expect(import.meta.env.VITE_DEV_BYPASS_AUTH).not.toBe("true");
  });
});
