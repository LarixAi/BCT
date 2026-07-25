import { describe, expect, it } from "vitest";
import { buildBootstrapPayload } from "@/data/mocks/bootstrap";
import { applyBootstrapToYard } from "@/platform/yard/hydrate-yard-store";

describe("hydrate-yard-store production guards", () => {
  it("rejects mock bootstrap payloads in production builds", () => {
    const payload = buildBootstrapPayload("co_bct", "dep_bct_main");
    expect(payload.dataSource).toBe("mock");

    const prev = import.meta.env.PROD;
    try {
      (import.meta.env as { PROD?: boolean }).PROD = true;
      expect(() => applyBootstrapToYard(payload)).toThrow(/Mock yard bootstrap cannot be loaded/);
    } finally {
      (import.meta.env as { PROD?: boolean }).PROD = prev;
    }
  });
});
